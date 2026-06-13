import { uniform } from "three/tsl";

// Always-advancing animated time, written each frame in Starfield. Drives the
// twinkle animation (and is read by the gradient sky too).
export const uTime = uniform(0);

// Sky-gradient rotation angle. Advances only while sceneConfig.gradientRotation
// is on, so disabling sky rotation doesn't also freeze the star twinkle.
export const uSkyRotation = uniform(0);

// Twinkle strength multiplier (1 = on, 0 = steady stars), from sceneConfig.twinkle.
export const uTwinkle = uniform(1);
