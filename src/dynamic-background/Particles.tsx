import { Instance, Instances, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import {
    ColorLerp,
    ColorLerpProp,
    pastelRainbowColors,
} from "./util/colorLerp";
import { map, shadeColor } from "./util/util";

const particlesPerLoop = 7;
const particleDepth = 10;
const zGapDistancePerLoop = 40;
const numHelixes = 3;
const particleCount = particlesPerLoop * particleDepth * numHelixes;

const PI_2 = Math.PI * 2;

interface ParticleData {
    key: string;
    x: number;
    y: number;
    z: number;
    metadata: {
        helix: number;
        depth: number;
        particle: number;
    };
}

const getStartingPoints = (): ParticleData[] => {
    const res: ParticleData[] = [];
    for (let i = 0; i < numHelixes; i++) {
        // map current helix offset angle around 2pi
        const offset = map(i, 0, numHelixes, 0, PI_2);

        for (let z = 1; z <= particleDepth; z++) {
            for (let x = 0; x < particlesPerLoop; x++) {
                // map current particle angle around 2pi
                const angle = map(x, 0, particlesPerLoop, 0, PI_2);

                // map current particle to the next loop start location
                // i.e. approach the next z-iteration starting point
                const approachZ = map(
                    x,
                    0,
                    particlesPerLoop,
                    z * zGapDistancePerLoop,
                    (z + 1) * zGapDistancePerLoop
                );

                // use polar coordinates to create a 3-tuple representing a single particle's location
                res.push({
                    key: `${i},${z},${x}`,
                    x: (approachZ / 15) * -Math.cos(offset + angle), // intentional negative to reflect the helix
                    y: (approachZ / 15) * Math.sin(offset + angle),
                    z: approachZ,
                    metadata: {
                        helix: i,
                        depth: z,
                        particle: x,
                    },
                });
            }
        }
    }
    return res;
};

export const Particle = (data: ParticleData & ColorLerpProp) => {
    const ref = useRef<any>(null!);
    useFrame((state) => {
        const t = state.clock.getElapsedTime();
        const timeScalingConstant = 1;
        const scaleDamperConstant = 3;
        const scalingConstant = map(data.z, 20, 300, 0.003, 0.022);
        const intermediateScale =
            -1 *
            scalingConstant *
            (1 +
                scalingConstant * data.metadata.particle +
                Math.sin(t / timeScalingConstant + data.metadata.depth));
        const scale =
            1.2 * scalingConstant + intermediateScale / scaleDamperConstant;

        const shadedColor = shadeColor(
            data.colorLerp.color,
            map(scale, 0, 0.1, -50, 90)
        );

        ref.current.rotation.x = Math.PI / 2;
        ref.current.rotation.y = data.metadata.particle + t / 30;
        ref.current.scale.setScalar(scale);
        ref.current.color.set(
            `rgb(${shadedColor.r},${shadedColor.g},${shadedColor.b})`
        );
    });
    return (
        <group>
            <Instance ref={ref} position={[data.x, data.y, data.z]} />
        </group>
    );
};

export const Particles = () => {
    const mesh = useRef<any>(null!);
    const glf = useGLTF("./star-model.glb") as any;
    const points = useMemo(() => getStartingPoints(), []);
    const colorLerp = useMemo(() => new ColorLerp(pastelRainbowColors), []);
    useFrame((state) => {
        const t = state.clock.getElapsedTime();
        colorLerp.step();

        mesh.current.rotation.z = t / 30;
    });

    // the helix is drawn from 0,0,0 towards positive-z.
    // since the camera is positioned at 0,0,0 we must translate back towards negative-z.
    const zTranslation = -zGapDistancePerLoop * particleDepth - 10;

    return (
        <group ref={mesh} position={[0, 0, zTranslation]} receiveShadow>
            <Instances
                limit={particleCount}
                range={particleCount}
                geometry={glf.nodes.Star.geometry}
                material={glf.materials.Star}
            >
                {points.map((p) => (
                    <Particle
                        x={p.x}
                        y={p.y}
                        z={p.z}
                        metadata={p.metadata}
                        key={p.key}
                        colorLerp={colorLerp}
                    />
                ))}
            </Instances>
        </group>
    );
};
