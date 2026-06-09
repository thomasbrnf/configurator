import { useEffect, useRef, useState } from "react";
import { useLanguage } from "../../context/LanguageContext";
import { availableModules, availableCompleteSets } from "../../context/ConfiguratorContext";
import { availableMaterials } from "../../context/MaterialContext";
import "./first-time-loader.css";

const STORAGE_KEY = "gala_configurator_visited";

function getModelUrls(): string[] {
  const mods = availableModules.map((m) => m.modelPath);
  const sets = availableCompleteSets.map((s) => s.modelPath);
  return [...mods, ...sets];
}

function getTextureUrls(): string[] {
  const seen = new Set<string>();
  const urls: string[] = [];
  for (const group of Object.values(availableMaterials)) {
    for (const mat of group) {
      if (!seen.has(mat.diffuse)) { seen.add(mat.diffuse); urls.push(mat.diffuse); }
      if (!seen.has(mat.normal)) { seen.add(mat.normal); urls.push(mat.normal); }
    }
  }
  return urls;
}



export default function FirstTimeLoader() {
  const { t } = useLanguage();
  const [visible, setVisible] = useState(false);
  const [phase, setPhase] = useState<"models" | "textures" | "done">("models");
  const [current, setCurrent] = useState(0);
  const [total, setTotal] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    if (localStorage.getItem(STORAGE_KEY)) return;

    setVisible(true);

    const modelUrls = getModelUrls();
    const textureUrls = getTextureUrls();

    async function run() {
      // Phase 1: models
      setPhase("models");
      setTotal(modelUrls.length);
      setCurrent(0);
      let done = 0;
      for (const url of modelUrls) {
        try { await fetch(url); } catch {}
        setCurrent(++done);
      }

      // Phase 2: textures (batched)
      setPhase("textures");
      setTotal(textureUrls.length);
      setCurrent(0);
      let texDone = 0;
      let i = 0;
      async function nextTex(): Promise<void> {
        if (i >= textureUrls.length) return;
        const url = textureUrls[i++];
        try { await fetch(url); } catch {}
        setCurrent(++texDone);
        return nextTex();
      }
      await Promise.all(Array.from({ length: 4 }, nextTex));

      localStorage.setItem(STORAGE_KEY, "1");
      setPhase("done");
      await new Promise((r) => setTimeout(r, 600));
      setFadeOut(true);
      await new Promise((r) => setTimeout(r, 500));
      setVisible(false);
    }

    run();
  }, []);

  if (!visible) return null;

  const phaseLabel =
    phase === "models"
      ? t.firstLoadModels
      : phase === "textures"
        ? t.firstLoadTextures
        : t.firstLoadDone;

  const progress = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className={`ftl-overlay${fadeOut ? " ftl-fade-out" : ""}`}>
      <div className="ftl-box">
        <p className="ftl-title">{t.firstLoadTitle}</p>
        <p className="ftl-phase">
          {phaseLabel}
          {phase !== "done" && total > 0 && (
            <span className="ftl-count"> {current}/{total}</span>
          )}
        </p>
        <div className="ftl-bar-track">
          <div
            className="ftl-bar-fill"
            style={{ width: phase === "done" ? "100%" : `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
