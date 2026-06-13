import { useState } from "react";
import styles from "../styles/SceneConfigPanel.module.css";
import {
  sceneConfig,
  toggleSceneOption,
  setColorLerpStyle,
  COLOR_LERP_STYLES,
  type BooleanConfigKey,
  type ColorLerpStyle,
} from "./sceneConfig";

interface Props {
  // Called after a config value changes so the scene can pick it up.
  onChange: () => void;
}

interface Option {
  key: BooleanConfigKey;
  label: string;
  // When set, this option only applies while its parent option is enabled.
  dependsOn?: BooleanConfigKey;
}

interface Group {
  title: string;
  options: Option[];
}

// Options grouped logically. `depthOfField` is omitted — deprecated/inert after
// the WebGPU migration. Sub-options list `dependsOn` so the panel disables them
// when their parent is off (e.g. twinkle/shooting stars need the star background).
const GROUPS: Group[] = [
  {
    title: "Background",
    options: [
      { key: "sceneBackground", label: "Star background" },
      {
        key: "gradientRotation",
        label: "Sky rotation",
        dependsOn: "sceneBackground",
      },
      { key: "twinkle", label: "Twinkle", dependsOn: "sceneBackground" },
      {
        key: "shootingStars",
        label: "Shooting stars",
        dependsOn: "sceneBackground",
      },
    ],
  },
  {
    title: "Particles & lighting",
    options: [
      { key: "emissiveStars", label: "Emissive stars" },
      { key: "directionalLight", label: "Directional light" },
    ],
  },
  {
    title: "Rendering",
    options: [
      { key: "bloom", label: "Bloom" },
      { key: "fog", label: "Fog" },
      { key: "toneMapping", label: "Tone mapping" },
    ],
  },
];

export default function SceneConfigPanel({ onChange }: Props) {
  const [open, setOpen] = useState(false);
  // Local mirror so toggles re-render the panel; sceneConfig is the source.
  const [, forceRender] = useState(0);

  const toggle = (key: BooleanConfigKey) => {
    toggleSceneOption(key);
    forceRender((n) => n + 1);
    onChange();
  };

  const selectColorStyle = (style: ColorLerpStyle) => {
    setColorLerpStyle(style);
    forceRender((n) => n + 1);
    onChange();
  };

  return (
    <div className={styles.root}>
      {open && (
        <div className={styles.panel} role="menu" aria-label="Scene options">
          {GROUPS.map((group) => (
            <div key={group.title} className={styles.group}>
              <div className={styles.groupTitle}>{group.title}</div>
              {group.options.map(({ key, label, dependsOn }) => {
                const disabled = dependsOn ? !sceneConfig[dependsOn] : false;
                return (
                  <label
                    key={key}
                    className={`${styles.option} ${dependsOn ? styles.child : ""} ${
                      disabled ? styles.disabled : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={sceneConfig[key]}
                      disabled={disabled}
                      onChange={() => toggle(key)}
                    />
                    <span>{label}</span>
                  </label>
                );
              })}

              {group.title === "Particles & lighting" && (
                <div className={`${styles.option} ${styles.select}`}>
                  <span>Particle color</span>
                  <select
                    value={sceneConfig.colorLerpStyle}
                    onChange={(e) =>
                      selectColorStyle(e.target.value as ColorLerpStyle)
                    }
                  >
                    {COLOR_LERP_STYLES.map((style) => (
                      <option key={style} value={style}>
                        {style}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <button
        type="button"
        className={styles.toggle}
        aria-label={open ? "Close scene options" : "Open scene options"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={styles.bars} aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
      </button>
    </div>
  );
}
