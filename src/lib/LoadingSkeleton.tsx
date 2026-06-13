import {
  useEffect,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import styles from "../styles/LoadingSkeleton.module.css";

interface Props {
  /** When true, the overlay fades out and unmounts. */
  hidden: boolean;
}

const STAR_COUNT = 100;
// Must match the opacity transition in LoadingSkeleton.module.css; also the
// fallback-timeout basis for when `transitionend` never fires.
const FADE_OUT_MS = 600;
const STAR_COLORS = ["#cfe8ff", "#9fd4ff", "#4cc1ff", "#7fb6c9", "#b89bc4"];

interface StarStyle {
  left: string;
  top: string;
  width: string;
  height: string;
  ["--star-color"]: string;
  ["--twinkle-duration"]: string;
  ["--twinkle-delay"]: string;
}

function generateStars(): StarStyle[] {
  return Array.from({ length: STAR_COUNT }, () => {
    const size = 1 + Math.random() * 2.5;
    return {
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      width: `${size}px`,
      height: `${size}px`,
      "--star-color":
        STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
      "--twinkle-duration": `${1.8 + Math.random() * 2.4}s`,
      "--twinkle-delay": `${Math.random() * 2.5}s`,
    };
  });
}

// Stars are random per load but must match between the server-rendered HTML and
// first client render (this component is in the static export). useSyncExternalStore
// gives the server an empty list and the client the randomized one, so hydration
// sees no stars on both sides, then React swaps in the client snapshot.
const EMPTY_STARS: StarStyle[] = [];
let clientStars: StarStyle[] | null = null;

const subscribe = () => () => {};
const getClientSnapshot = (): StarStyle[] => (clientStars ??= generateStars());
const getServerSnapshot = (): StarStyle[] => EMPTY_STARS;

export default function LoadingSkeleton({ hidden }: Props) {
  const [removed, setRemoved] = useState(false);
  const stars = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot,
  );

  // Fallback unmount in case `transitionend` never fires (e.g. backgrounded tab).
  useEffect(() => {
    if (!hidden) return;
    const timer = window.setTimeout(() => setRemoved(true), FADE_OUT_MS + 100);
    return () => window.clearTimeout(timer);
  }, [hidden]);

  if (removed) return null;

  return (
    <div
      className={`${styles.overlay} ${hidden ? styles.hidden : ""}`}
      aria-hidden={hidden}
      role="status"
      aria-label="Loading scene"
      onTransitionEnd={(e) => {
        // Only the overlay's own opacity fade dismisses it, not bubbled child
        // transitions.
        if (
          hidden &&
          e.target === e.currentTarget &&
          e.propertyName === "opacity"
        ) {
          setRemoved(true);
        }
      }}
    >
      {stars.map((style, i) => (
        <span key={i} className={styles.star} style={style as CSSProperties} />
      ))}
    </div>
  );
}
