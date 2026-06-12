import { useRef, useMemo, useState } from "react";
import { useFrame } from "@react-three/fiber";
import {
  Float32BufferAttribute,
  BackSide,
  ShaderMaterial,
  Color,
  Vector3,
  BufferGeometry,
  LineBasicMaterial,
  Line,
  PointsMaterial,
  Points,
} from "three";
import { sceneConfig } from "./sceneConfig";

const STAR_COUNT = 2000;
const RADIUS = 500;
const MAX_SHOOTING_STARS = 3;
const SPAWN_CHANCE = 0.003;
const TRAIL_POINTS = 20;

const gradientMaterial = new ShaderMaterial({
  side: BackSide,
  depthWrite: false,
  uniforms: {
    colorA: { value: new Color("#007ba7") },
    colorB: { value: new Color("#6f456e") },
    uTime: { value: 0 },
  },
  vertexShader: `
        varying vec3 vWorldPos;
        void main() {
            vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
  fragmentShader: `
        uniform vec3 colorA;
        uniform vec3 colorB;
        uniform float uTime;
        varying vec3 vWorldPos;
        void main() {
            vec3 dir = normalize(vWorldPos);
            float c = cos(uTime);
            float s = sin(uTime);
            vec3 rotDir = vec3(
                dir.x * c + dir.y * s,
                -dir.x * s + dir.y * c,
                dir.z
            );
            float t = clamp(dot(rotDir, normalize(vec3(1.0, -1.0, 0.0))) * 0.78 + 0.72, 0.0, 1.0);
            vec3 bg = mix(colorA, colorB, t);
            bg *= 0.14;
            gl_FragColor = vec4(bg, 1.0);
        }
    `,
});

interface ShootingStar {
  active: boolean;
  progress: number;
  speed: number;
  origin: Vector3;
  direction: Vector3;
  length: number;
}

function generateStarData() {
  const pos = new Float32Array(STAR_COUNT * 3);
  const sizes = new Float32Array(STAR_COUNT);
  for (let i = 0; i < STAR_COUNT; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = RADIUS * (0.8 + 0.2 * Math.random());
    pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    pos[i * 3 + 2] = r * Math.cos(phi);
    const rnd = Math.random();
    sizes[i] = rnd < 0.92 ? 0.3 + rnd * 0.4 : 1.0 + Math.pow(rnd, 3) * 2.0;
  }
  return {
    positions: new Float32BufferAttribute(pos, 3),
    sizes: new Float32BufferAttribute(sizes, 1),
  };
}

export default function Starfield() {
  const [{ positions, sizes }] = useState(generateStarData);

  const shootingStars = useRef<ShootingStar[]>(
    Array.from({ length: MAX_SHOOTING_STARS }, () => ({
      active: false,
      progress: 0,
      speed: 0,
      origin: new Vector3(),
      direction: new Vector3(),
      length: 0,
    })),
  );

  const headRefs = useRef<(Line | null)[]>([]);
  const trailRefs = useRef<(Points | null)[]>([]);

  const headGeometries = useMemo(
    () =>
      Array.from({ length: MAX_SHOOTING_STARS }, () => {
        const geo = new BufferGeometry();
        geo.setAttribute(
          "position",
          new Float32BufferAttribute([0, 0, 0, 0, 0, 0], 3),
        );
        return geo;
      }),
    [],
  );

  const trailGeometries = useMemo(
    () =>
      Array.from({ length: MAX_SHOOTING_STARS }, () => {
        const geo = new BufferGeometry();
        const pos = new Float32Array(TRAIL_POINTS * 3);
        const sizes = new Float32Array(TRAIL_POINTS);
        geo.setAttribute("position", new Float32BufferAttribute(pos, 3));
        geo.setAttribute("size", new Float32BufferAttribute(sizes, 1));
        return geo;
      }),
    [],
  );

  const headMaterial = useMemo(
    () =>
      new LineBasicMaterial({
        color: "#ffffff",
        transparent: true,
        opacity: 0,
      }),
    [],
  );

  const trailMaterial = useMemo(
    () =>
      new PointsMaterial({
        color: "#ffffff",
        size: 0.6,
        transparent: true,
        opacity: 0,
        sizeAttenuation: true,
      }),
    [],
  );

  const headObjects = useMemo(
    () => headGeometries.map((geo) => new Line(geo, headMaterial.clone())),
    [headGeometries, headMaterial],
  );

  const trailObjects = useMemo(
    () => trailGeometries.map((geo) => new Points(geo, trailMaterial.clone())),
    [trailGeometries, trailMaterial],
  );

  useFrame((state) => {
    if (sceneConfig.gradientRotation) {
      gradientMaterial.uniforms.uTime.value = -state.elapsed / 60;
    }

    const stars = shootingStars.current;

    for (let i = 0; i < MAX_SHOOTING_STARS; i++) {
      const s = stars[i];
      const head = headRefs.current[i];
      const trail = trailRefs.current[i];
      if (!head || !trail) continue;

      if (!s.active) {
        if (sceneConfig.shootingStars && Math.random() < SPAWN_CHANCE) {
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos(2 * Math.random() - 1);
          const r = RADIUS * 0.85;
          s.origin.set(
            r * Math.sin(phi) * Math.cos(theta),
            r * Math.sin(phi) * Math.sin(theta),
            r * Math.cos(phi),
          );
          const tangent = new Vector3(
            Math.random() - 0.5,
            Math.random() - 0.5,
            Math.random() - 0.5,
          )
            .cross(s.origin)
            .normalize();
          s.direction.copy(tangent);
          s.length = 12 + Math.random() * 8;
          s.speed = 0.4 + Math.random() * 0.4;
          s.progress = 0;
          s.active = true;
        }
        continue;
      }

      const fadePhase =
        s.progress > s.length ? (s.progress - s.length) / (s.length * 3) : 0;
      s.progress += s.speed * (1 - fadePhase * 0.8);

      const headPos = s.origin.clone().addScaledVector(s.direction, s.progress);
      const headLen = s.length * 0.3 * (1 - fadePhase);
      const tailPos = s.origin
        .clone()
        .addScaledVector(s.direction, Math.max(0, s.progress - headLen));

      const posAttr = headGeometries[i].getAttribute("position");
      posAttr.setXYZ(0, tailPos.x, tailPos.y, tailPos.z);
      posAttr.setXYZ(1, headPos.x, headPos.y, headPos.z);
      posAttr.needsUpdate = true;

      const trailPosAttr = trailGeometries[i].getAttribute("position");
      for (let p = 0; p < TRAIL_POINTS; p++) {
        const t = p / TRAIL_POINTS;
        const trailProgress = s.progress - s.length * t;
        if (trailProgress < 0) {
          trailPosAttr.setXYZ(p, 0, 0, -9999);
        } else {
          const pt = s.origin
            .clone()
            .addScaledVector(s.direction, trailProgress);
          const scatter = (1 - (1 - t) * (1 - t)) * 0.8;
          pt.x += (Math.random() - 0.5) * scatter;
          pt.y += (Math.random() - 0.5) * scatter;
          pt.z += (Math.random() - 0.5) * scatter;
          trailPosAttr.setXYZ(p, pt.x, pt.y, pt.z);
        }
      }
      trailPosAttr.needsUpdate = true;

      const fadeIn = Math.min(1, s.progress / 5);
      const fadeOut = Math.max(0, 1 - (s.progress - s.length) / (s.length * 3));
      const opacity = Math.min(fadeIn, fadeOut);

      (head.material as LineBasicMaterial).opacity = opacity * 0.9;
      (trail.material as PointsMaterial).opacity = opacity * 0.4;
      (trail.material as PointsMaterial).size = 0.4;

      if (s.progress > s.length * 4) {
        s.active = false;
        (head.material as LineBasicMaterial).opacity = 0;
        (trail.material as PointsMaterial).opacity = 0;
      }
    }
  });

  return (
    <group>
      <mesh material={gradientMaterial}>
        <sphereGeometry args={[RADIUS * 1.2, 32, 32]} />
      </mesh>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" {...positions} />
          <bufferAttribute attach="attributes-aSize" {...sizes} />
        </bufferGeometry>
        {sceneConfig.twinkle ? (
          <shaderMaterial
            transparent
            depthWrite={false}
            uniforms={{
              uTime: gradientMaterial.uniforms.uTime,
            }}
            vertexShader={`
              attribute float aSize;
              uniform float uTime;
              varying float vAlpha;
              varying float vBrightness;
              void main() {
                vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
                float seed = mod(abs(position.x * 73.17 + position.y * 91.31 + position.z * 37.19), 6.2831);
                float twinkle = sin(uTime * 40.0 + seed);
                vAlpha = (0.35 + 0.25 * aSize) + 0.2 * twinkle;
                vBrightness = 0.6 + 0.4 * smoothstep(0.7, 2.0, aSize);
                gl_PointSize = aSize * (1.0 + 0.15 * twinkle) * (300.0 / -mvPos.z);
                gl_Position = projectionMatrix * mvPos;
              }
            `}
            fragmentShader={`
              varying float vAlpha;
              varying float vBrightness;
              void main() {
                float d = length(gl_PointCoord - vec2(0.5));
                if (d > 0.5) discard;
                float alpha = vAlpha * smoothstep(0.5, 0.1, d);
                gl_FragColor = vec4(vec3(vBrightness), alpha);
              }
            `}
          />
        ) : (
          <pointsMaterial
            size={0.8}
            color="#ffffff"
            sizeAttenuation
            transparent
            opacity={0.7}
          />
        )}
      </points>
      {headObjects.map((obj, i) => (
        <primitive
          key={`head-${i}`}
          object={obj}
          ref={(el: Line | null) => {
            headRefs.current[i] = el;
          }}
        />
      ))}
      {trailObjects.map((obj, i) => (
        <primitive
          key={`trail-${i}`}
          object={obj}
          ref={(el: Points | null) => {
            trailRefs.current[i] = el;
          }}
        />
      ))}
    </group>
  );
}
