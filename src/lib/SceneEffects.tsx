import { sceneConfig } from "./sceneConfig";
import {
  EffectComposer,
  Bloom,
  DepthOfField,
} from "@react-three/postprocessing";

function BloomEffect() {
  return (
    <Bloom
      luminanceThreshold={0.47}
      luminanceSmoothing={0.9}
      intensity={10}
      mipmapBlur
    />
  );
}

function DOFEffect() {
  return <DepthOfField target={[0, 0, 0]} bokehScale={0.33} />;
}

export default function SceneEffects() {
  if (!sceneConfig.bloom && !sceneConfig.depthOfField) return null;

  if (sceneConfig.bloom && sceneConfig.depthOfField) {
    return (
      <EffectComposer>
        <BloomEffect />
        <DOFEffect />
      </EffectComposer>
    );
  }

  if (sceneConfig.bloom) {
    return (
      <EffectComposer>
        <BloomEffect />
      </EffectComposer>
    );
  }

  return (
    <EffectComposer>
      <DOFEffect />
    </EffectComposer>
  );
}
