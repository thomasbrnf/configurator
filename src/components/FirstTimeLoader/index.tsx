import { useEffect, useRef, useState } from "react";
import { useLanguage } from "../../context/LanguageContext";
import { availableMaterials, lowResUrl, thumbUrl } from "../../context/MaterialContext";
import "./first-time-loader.css";

const STORAGE_KEY = "gala_configurator_visited";

// Warm only the light asset tiers: 256px swatch thumbs (~0.6 MB total) and the
// 1K diffuse/normal maps the 3D model actually uses (~30 MB total). The large
// 2K originals (modal preview) and the GLB models are loaded on demand instead
// of bulk-downloaded behind this gate.
function getTextureUrls(): string[] {
  const seen = new Set<string>();
  const urls: string[] = [];
  const add = (url: string) => {
    if (!seen.has(url)) { seen.add(url); urls.push(url); }
  };
  for (const group of Object.values(availableMaterials)) {
    for (const mat of group) {
      add(thumbUrl(mat.diffuse));
      add(lowResUrl(mat.diffuse));
      add(lowResUrl(mat.normal));
    }
  }
  return urls;
}



export default function FirstTimeLoader() {
  const { t } = useLanguage();
  const [visible, setVisible] = useState(false);
  const [phase, setPhase] = useState<"textures" | "done">("textures");
  const [current, setCurrent] = useState(0);
  const [total, setTotal] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    if (localStorage.getItem(STORAGE_KEY)) return;

    setVisible(true);

    const textureUrls = getTextureUrls();

    async function run() {
      // Warm the light texture tiers (batched). Models load on demand.
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
    phase === "textures" ? t.firstLoadTextures : t.firstLoadDone;

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
