import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Float32BufferAttribute, Group } from "three/webgpu";
import { sceneConfig } from "./sceneConfig";
import { uTime, uSkyRotation, uTwinkle } from "./materials/sharedUniforms";
import { GradientSkyMaterial } from "./materials/GradientSkyMaterial";
import {
  TwinkleStarsMaterial,
  buildTwinkleMesh,
} from "./materials/TwinkleStarsMaterial";
import { ShootingStars } from "./ShootingStars";

const STAR_COUNT = 2000;
const RADIUS = 500;
// The sky sphere is drawn slightly outside the star shell.
const SKY_SPHERE_RADIUS = RADIUS * 1.2;
// Most stars are small; a few percent are noticeably larger.
const LARGE_STAR_CHANCE = 0.92;
// Seconds-to-radians scale for the sky's slow rotation.
const SKY_ROTATION_SCALE = 60;

interface StarData {
  positions: Float32BufferAttribute;
  sizes: Float32BufferAttribute;
}

function generateStarData(): StarData {
  const positions = new Float32Array(STAR_COUNT * 3);
  const sizes = new Float32Array(STAR_COUNT);
  for (let i = 0; i < STAR_COUNT; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = RADIUS * (0.8 + 0.2 * Math.random());
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
    const rnd = Math.random();
    sizes[i] =
      rnd < LARGE_STAR_CHANCE ? 0.3 + rnd * 0.4 : 1.0 + Math.pow(rnd, 3) * 2.0;
  }
  return {
    positions: new Float32BufferAttribute(positions, 3),
    sizes: new Float32BufferAttribute(sizes, 1),
  };
}

export default function Starfield() {
  const [{ positions, sizes }] = useState(generateStarData);
  // The sky sphere + stars recenter on the camera each frame so they read as an
  // infinitely-distant backdrop: only camera rotation moves them, not translation,
  // so flying forward no longer brings the stars closer / makes them grow.
  const domeRef = useRef<Group>(null!);
  const gradientMaterial = useMemo(() => new GradientSkyMaterial(), []);
  const twinkleMaterial = useMemo(() => new TwinkleStarsMaterial(), []);
  const twinkleMesh = useMemo(
    () => buildTwinkleMesh(positions, sizes, twinkleMaterial),
    [positions, sizes, twinkleMaterial],
  );
  const shootingStars = useMemo(() => new ShootingStars(), []);

  useEffect(() => {
    uTwinkle.value = sceneConfig.twinkle ? 1 : 0;
  }, []);

  // r3f doesn't dispose <primitive> objects or detached materials, so release
  // the GPU resources this component owns when it unmounts.
  useEffect(
    () => () => {
      twinkleMesh.geometry.dispose();
      gradientMaterial.dispose();
      twinkleMaterial.dispose();
      shootingStars.dispose();
    },
    [twinkleMesh, gradientMaterial, twinkleMaterial, shootingStars],
  );

  useFrame((state) => {
    // uTime always advances so the twinkle keeps animating; the sky rotation
    // tracks the same value but only while enabled, holding its last angle when
    // disabled instead of freezing the twinkle too.
    const time = -state.elapsed / SKY_ROTATION_SCALE;
    uTime.value = time;
    if (sceneConfig.gradientRotation) {
      uSkyRotation.value = time;
    }
    // Keep the dome centered on the camera so the backdrop stays at a fixed
    // distance (and screen size) regardless of how far the camera flies.
    domeRef.current.position.copy(state.camera.position);
    shootingStars.update(sceneConfig.shootingStars);
  });

  // Camera-following distant backdrop (sky + stars + shooting stars), so the
  // backdrop stays a consistent distance and isn't fogged into oblivion as the
  // camera flies.
  return (
    <group ref={domeRef}>
      <mesh material={gradientMaterial}>
        <sphereGeometry args={[SKY_SPHERE_RADIUS, 32, 32]} />
      </mesh>
      <primitive object={twinkleMesh} />
      {shootingStars.objects.map((object, i) => (
        <primitive key={i} object={object} />
      ))}
    </group>
  );
}
