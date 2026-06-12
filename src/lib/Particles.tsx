import { Instance, Instances, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { Color, MeshStandardMaterial } from "three";
import { ColorLerp, pastelRainbowColors } from "./util/colorLerp";
import { TrimmedColor, map, shadeColor } from "./util/util";

const samplesPerRevolution = 7;
const revolutions = 10;
const helixLength = 560;
const numHelixes = 4;
const radiusScale = 0.06;
const particlesPerHelix = samplesPerRevolution * revolutions;
const particleCount = particlesPerHelix * numHelixes;

const PI_2 = Math.PI * 2;

interface ParticleData {
  key: string;
  x: number;
  y: number;
  z: number;
  metadata: {
    helix: number;
    index: number;
  };
}

const getStartingPoints = (): ParticleData[] => {
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
        metadata: {
          helix: h,
          index: p,
        },
      });
    }
  }
  return res;
};

export const Particle = (data: ParticleData & { color: TrimmedColor }) => {
  const ref = useRef<any>(null!);
  useFrame((state) => {
    const t = state.elapsed;
    const timeScalingConstant = 1;
    const scaleDamperConstant = 3;
    const baseScale = map(data.z, 0, helixLength, 0.005, 0.02);
    const pulse = Math.sin(t / timeScalingConstant + data.metadata.index * 0.7);
    const scale = Math.max(
      0.002,
      baseScale + (pulse * baseScale) / scaleDamperConstant,
    );

    const shadedColor = shadeColor(data.color, map(scale, 0, 0.1, -50, 90));

    ref.current.rotation.x = Math.PI / 2;
    ref.current.rotation.y = data.metadata.index + t / 30;
    ref.current.scale.setScalar(scale);
    ref.current.color.set(
      `rgb(${shadedColor.r},${shadedColor.g},${shadedColor.b})`,
    );
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

  const material = useMemo(() => {
    if (!emissive) return glf.materials.Star;
    const mat = new MeshStandardMaterial({
      color: "#ffffff",
      emissive: new Color("#ffffff"),
      emissiveIntensity: 0.15,
      roughness: 0.3,
      metalness: 0.1,
    });
    mat.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <emissivemap_fragment>",
        `
                #include <emissivemap_fragment>
                #ifdef USE_INSTANCING_COLOR
                    totalEmissiveRadiance *= vColor;
                #endif
                `,
      );
    };
    return mat;
  }, [emissive, glf.materials.Star]);
  const points = useMemo(() => getStartingPoints(), []);
  const colorLerp = useMemo(() => new ColorLerp(pastelRainbowColors), []);
  useFrame((state) => {
    const t = state.elapsed;
    colorLerp.step();

    mesh.current.rotation.z = t / 50;
  });

  // the helix is drawn from 0,0,0 towards positive-z.
  // since the camera is positioned at 0,0,0 we must translate back towards negative-z.
  const zTranslation = -helixLength - 10;

  return (
    <group ref={mesh} position={[0, 0, zTranslation]} receiveShadow>
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
            metadata={p.metadata}
            key={p.key}
            color={colorLerp.color}
          />
        ))}
      </Instances>
    </group>
  );
};
