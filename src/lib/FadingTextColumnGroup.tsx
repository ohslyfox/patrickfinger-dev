import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import { useFrame } from "@react-three/fiber";
import { useSpring } from "@react-spring/core";
import { Camera, Group, Vector3 } from "three";
import FlatClickText from "./FlatClickText";

interface TextProps {
  readonly displayText: string;
  readonly url?: string;
}

interface Props {
  readonly textArray: TextProps[];
  readonly position: {
    readonly x: number;
    readonly y: number;
    readonly z: number;
  };
  // The camera the column follows, and forward-flight progress in [0, 1].
  readonly cameraRef: RefObject<Camera | null>;
  readonly progressRef: RefObject<number>;
  // Distance in front of the camera the column floats.
  readonly followDistance: number;
  // When false (admin free-roam), the column rests at a fixed default position
  // instead of tracking the camera.
  readonly follow: boolean;
}

// Column scale at the back (progress 0, full) and deep forward (progress 1).
const SCALE_BACK = 1;
const SCALE_FORWARD = 0.45;

export default function FadingTextColumnGroup(props: Props) {
  const [opacity, setOpacity] = useState(1);
  const [movementTime, setMovementTime] = useState(0);
  const [show, setShow] = useState(true);
  const tRef = useRef(0);
  const groupRef = useRef<Group>(null!);
  const forward = useRef(new Vector3());
  // The column is the single owner of the page cursor: links report hover here
  // (hoverCount > 0 → pointer) and the fade state hides it (faded → none). We
  // remember the last applied value so the per-frame derivation only writes on a
  // change.
  const hoverCount = useRef(0);
  const cursorRef = useRef<string>("auto");

  const setCursor = useCallback((cursor: string) => {
    if (cursorRef.current === cursor) return;
    cursorRef.current = cursor;
    document.body.style.cursor = cursor;
  }, []);

  const onHoverChange = useCallback((hovered: boolean) => {
    hoverCount.current = Math.max(0, hoverCount.current + (hovered ? 1 : -1));
  }, []);

  const { scale } = useSpring({
    scale: show ? 1 : 0,
    config: {
      tension: 400,
      friction: 100,
      precision: 0.001,
    },
  });

  useFrame((state) => {
    tRef.current = state.elapsed;
    if (movementTime === 0) {
      setMovementTime(tRef.current);
    }
    const delta = tRef.current - movementTime;

    if (delta > 5) {
      setShow(false);
    } else if (!show) {
      setShow(true);
    }

    const currentOpacity = scale.get();
    setOpacity(currentOpacity);

    // Derive the cursor: hidden when the text is fully faded (nothing to click),
    // pointer while a link is hovered, otherwise the default.
    const hidden = currentOpacity <= 0.001;
    setCursor(hidden ? "none" : hoverCount.current > 0 ? "pointer" : "auto");

    const group = groupRef.current;
    const camera = props.cameraRef.current;
    if (!props.follow || !camera) {
      // Admin free-roam: rest at a fixed default spot ahead of the origin.
      group.position.set(0, 0, -props.followDistance);
      group.quaternion.identity();
      group.scale.setScalar(SCALE_BACK);
      return;
    }

    // Follow the camera: sit `followDistance` ahead of it and match its
    // orientation (so the text faces the viewer exactly as a camera child would).
    camera.getWorldDirection(forward.current);
    group.position
      .copy(camera.position)
      .addScaledVector(forward.current, props.followDistance);
    group.quaternion.copy(camera.quaternion);

    // Counter-scale with forward progress: shrink flying in, grow flying back.
    const p = props.progressRef.current ?? 0;
    group.scale.setScalar(SCALE_BACK + (SCALE_FORWARD - SCALE_BACK) * p);
  });

  useEffect(() => {
    const handleMouseMove = (_e: MouseEvent) => {
      setMovementTime(tRef.current);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      // Don't leave the cursor hidden/pointer if we unmount mid-fade or mid-hover.
      document.body.style.cursor = "auto";
    };
  }, []);

  const textDistance = 32; // Distance between each line of text
  const columnOffset = (textDistance * (props.textArray.length - 1)) / 2; // Offset to center the column vertically

  const textElements = useMemo(() => {
    return props.textArray.map((text, index) => {
      return (
        <FlatClickText
          key={index}
          displayText={text.displayText}
          url={text.url}
          opacity={opacity}
          onHoverChange={onHoverChange}
          position={{
            x: props.position.x,
            y: props.position.y - textDistance * index + columnOffset,
            z: props.position.z,
          }}
          size={{ default: 20, hovered: 24 }}
          color={{
            default: "#4cc1ff",
            hovered: "#ffc04c",
          }}
        />
      );
    });
  }, [props.textArray, props.position, opacity, columnOffset, onHoverChange]);

  return <group ref={groupRef}>{textElements}</group>;
}
