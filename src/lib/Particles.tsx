import { Instance, Instances, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Color } from "three";
import { ColorLerp, pastelRainbowColors } from "./util/colorLerp";
import { EmissiveStarMaterial } from "./materials/EmissiveStarMaterial";
import { sceneConfig, type ColorLerpStyle } from "./sceneConfig";
import { map } from "./util/util";

const samplesPerRevolution = 7;
const revolutions = 10;
const helixLength = 560;
const numHelixes = 4;
const radiusScale = 0.06;
const particlesPerHelix = samplesPerRevolution * revolutions;
const particleCount = particlesPerHelix * numHelixes;
// Palette segments spread across one helix, so each strand shows a full rainbow.
const PALETTE_LENGTH = pastelRainbowColors.length;

// The helix group is shifted so it grows from the far tip toward the camera.
const Z_TRANSLATION = -helixLength - 10;

const PI_2 = Math.PI * 2;

// World-z the camera is allowed to fly between. "Forward" flies into the scene
// depth (toward -z, deeper into the tornado body) down to FLIGHT_Z_FAR; "back"
// pulls out toward the wide mouth, stopping at FLIGHT_Z_NEAR.
const FLIGHT_Z_NEAR = 0;
const FLIGHT_Z_FAR = -200;

/**
 * The particle tornado is a cone around the world z-axis: its radius grows with
 * local helix-z (`localZ * radiusScale`) and the whole helix is shifted by
 * {@link Z_TRANSLATION}. These describe that cone so the camera can stay inside it.
 */
export const tornado = {
  /** Nearest (widest) and farthest (narrowest) world-z the helix occupies. */
  zNear: Z_TRANSLATION + helixLength,
  zFar: Z_TRANSLATION,
  /** Camera flight z-range (near = shallow/wide, far = deep). */
  flightZNear: FLIGHT_Z_NEAR,
  flightZFar: FLIGHT_Z_FAR,
  /** Cone radius at a given world-z (0 outside the helix's z-range). */
  radiusAt(worldZ: number): number {
    const localZ = worldZ - Z_TRANSLATION;
    if (localZ <= 0 || localZ > helixLength) return 0;
    return localZ * radiusScale;
  },
};

interface ParticleData {
  key: string;
  x: number;
  y: number;
  z: number;
  index: number;
  // This particle's offset (in palette segments) into the shared color loop.
  colorOffset: number;
}

// The per-particle offset (in palette segments) into the shared color loop,
// which determines how the rainbow is distributed:
//  - solid:  0 for all -> every particle is the same cycling color
//  - band:   advances along the helix -> color bands per revolution
//  - stripe: follows the angle around the axis -> radial stripes across the width
const colorOffsetFor = (
  style: ColorLerpStyle,
  t: number,
  angle: number,
): number => {
  switch (style) {
    case "solid":
      return 0;
    case "stripe":
      return ((((angle % PI_2) + PI_2) % PI_2) / PI_2) * PALETTE_LENGTH;
    case "band":
    default:
      return t * PALETTE_LENGTH;
  }
};

const getStartingPoints = (): ParticleData[] => {
  const style = sceneConfig.colorLerpStyle;
  const res: ParticleData[] = [];
  for (let h = 0; h < numHelixes; h++) {
    const helixOffset = (h / numHelixes) * PI_2;

    for (let p = 0; p < particlesPerHelix; p++) {
      const t = p / particlesPerHelix;
      const z = t * helixLength + helixLength / particlesPerHelix;
      const angle = t * revolutions * PI_2 + helixOffset;
      const radius = z * radiusScale;

      res.push({
        key: `${h},${p}`,
        x: radius * -Math.cos(angle),
        y: radius * Math.sin(angle),
        z,
        index: p,
        colorOffset: colorOffsetFor(style, t, angle),
      });
    }
  }
  return res;
};

const scratchColor = new Color();

export const Particle = (data: ParticleData & { colorLerp: ColorLerp }) => {
  const ref = useRef<any>(null!);
  useFrame((state) => {
    const t = state.elapsed;
    const timeScalingConstant = 1;
    const scaleDamperConstant = 3;
    const baseScale = map(data.z, 0, helixLength, 0.005, 0.02);
    const pulse = Math.sin(t / timeScalingConstant + data.index * 0.7);
    const scale = Math.max(
      0.002,
      baseScale + (pulse * baseScale) / scaleDamperConstant,
    );

    // Sample the shared loop at this particle's offset, then brighten/darken by
    // size (the old shadeColor percent) as a numeric scalar — no allocations.
    data.colorLerp.sampleInto(
      data.colorLerp.phase + data.colorOffset,
      scratchColor,
    );
    const shade = 1 + map(scale, 0, 0.1, -50, 90) / 100;
    scratchColor.multiplyScalar(shade);

    ref.current.rotation.x = Math.PI / 2;
    ref.current.rotation.y = data.index + t / 30;
    ref.current.scale.setScalar(scale);
    ref.current.color.copy(scratchColor);
  });
  return (
    <group>
      <Instance ref={ref} position={[data.x, data.y, data.z]} />
    </group>
  );
};

interface ParticlesProps {
  emissive?: boolean;
}

export const Particles = ({ emissive = false }: ParticlesProps) => {
  const mesh = useRef<any>(null!);
  const glf = useGLTF("./star-model.glb") as any;

  const material = useMemo(
    () => (emissive ? new EmissiveStarMaterial() : glf.materials.Star),
    [emissive, glf.materials.Star],
  );
  // Dispose only the material we created; glf.materials.Star is owned by the GLTF.
  useEffect(() => {
    if (!(material instanceof EmissiveStarMaterial)) return;
    return () => material.dispose();
  }, [material]);
  const points = useMemo(() => getStartingPoints(), []);
  const colorLerp = useMemo(
    () => new ColorLerp(pastelRainbowColors, 0.001),
    [],
  );
  useFrame((state) => {
    const t = state.elapsed;
    colorLerp.step();

    mesh.current.rotation.z = t / 50;
  });

  // the helix is drawn from 0,0,0 towards positive-z.
  // since the camera is positioned at 0,0,0 we must translate back towards negative-z.
  return (
    <group ref={mesh} position={[0, 0, Z_TRANSLATION]} receiveShadow>
      <Instances
        limit={particleCount}
        range={particleCount}
        geometry={glf.nodes.Star.geometry}
        material={material}
      >
        {points.map((p) => (
          <Particle
            x={p.x}
            y={p.y}
            z={p.z}
            index={p.index}
            colorOffset={p.colorOffset}
            key={p.key}
            colorLerp={colorLerp}
          />
        ))}
      </Instances>
    </group>
  );
};
