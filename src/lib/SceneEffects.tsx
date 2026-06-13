import { useLayoutEffect } from "react";
import { sceneConfig } from "./sceneConfig";
import { useThree, useStore } from "@react-three/fiber/webgpu";
import { RenderPipeline } from "three/webgpu";
import { pass, mrt, output, emissive } from "three/tsl";
import { bloom } from "three/addons/tsl/display/BloomNode.js";
import { dithered } from "./materials/dither";

// TSL bloom, replacing the WebGL-only @react-three/postprocessing EffectComposer.
// We build the RenderPipeline by hand instead of fiber's usePostProcessing hook,
// which constructs the deprecated `PostProcessing` alias and warns on every load.
// r3f's render loop calls `state.postProcessing.render()` when set, so writing
// the pipeline to the store ourselves drives bloom without the warning.
// DepthOfField is dropped — it has no TSL/WebGPU equivalent in three's addons.
//
// Bloom is fed by an emissive-only MRT buffer (not the full frame), so only the
// glowing particles bloom — the bright sky/gradient never does, which previously
// blew the background out to white. THRESHOLD 0 because the emissive buffer
// already contains only what should glow. Strength is kept modest so the dense
// convergence of particles down the tornado axis doesn't stack bloom to white.
const BLOOM_STRENGTH = 0.5;
const BLOOM_RADIUS = 0.4;
const BLOOM_THRESHOLD = 0;

export default function SceneEffects() {
  const renderer = useThree((s) => s.renderer);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const store = useStore();

  useLayoutEffect(() => {
    if (!sceneConfig.bloom || !renderer || !scene || !camera) return;

    const pipeline = new RenderPipeline(renderer);
    const scenePass = pass(scene, camera);
    // Render two targets: the full color, and an emissive-only buffer. Bloom the
    // emissive buffer so only emissive surfaces (the particles) glow.
    scenePass.setMRT(mrt({ output, emissive }));
    const scenePassColor = scenePass.getTextureNode("output");
    const emissivePass = scenePass.getTextureNode("emissive");
    const bloomNode = bloom(
      emissivePass,
      BLOOM_STRENGTH,
      BLOOM_RADIUS,
      BLOOM_THRESHOLD,
    );
    // Dither the final composite so the dark fog fade and gradient sky don't
    // band on 8-bit / OLED displays.
    pipeline.outputNode = dithered(scenePassColor.add(bloomNode));
    store.setState({ postProcessing: pipeline });

    return () => {
      // Don't clobber a newer pipeline that may have replaced ours.
      if (store.getState().postProcessing === pipeline) {
        store.setState({ postProcessing: null });
      }
      // pipeline.dispose() only frees its quad material; release the rest too.
      pipeline.dispose();
      bloomNode.dispose();
      scenePass.dispose();
    };
  }, [renderer, scene, camera, store]);

  return null;
}
