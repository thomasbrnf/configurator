import "./App.css";
import { useEffect, useState } from "react";
import Scene from "./components/Scene";
import ControlPanel from "./components/ControlPanel";
import Configurator from "./components/Configurator";
import Spinner from "./components/Spinner";
import FirstTimeLoader from "./components/FirstTimeLoader";
import { MaterialProvider } from "./context/MaterialContext";
import { ConfiguratorProvider, availableModules, availableCompleteSets } from "./context/ConfiguratorContext";
import { LanguageProvider } from "./context/LanguageContext";
import { availableMaterials, thumbUrl } from "./context/MaterialContext";

// Collects every unique diffuse thumbnail used in the module grid and the
// materials swatch panel. Rendered once as <img> elements in an invisible,
// off-screen container so the browser decodes them while the app is idle.
// When the real UI creates its own <img> nodes with the same src, the browser
// finds the image already decoded in its memory cache and renders instantly —
// no white flash.
const preloadThumbnails: string[] = [
  ...availableModules.flatMap((m) => (m.thumbnail ? [m.thumbnail] : [])),
  ...availableCompleteSets.flatMap((s) => (s.thumbnail ? [s.thumbnail] : [])),
  ...Object.values(availableMaterials).flatMap((group) =>
    group.map((mat: { diffuse: string }) => thumbUrl(mat.diffuse)),
  ),
];

function App() {
  // Defer the off-screen image preloader until after the first paint, during
  // browser idle time. Rendering these <img> tags on the first render fires
  // ~90 MB of full-res texture requests synchronously, starving the model and
  // UI the user needs to see and making the page feel very slow to load.
  const [warmImages, setWarmImages] = useState(false);
  useEffect(() => {
    const w = window as Window &
      typeof globalThis & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number };
    if (w.requestIdleCallback) {
      w.requestIdleCallback(() => setWarmImages(true), { timeout: 5000 });
    } else {
      const t = window.setTimeout(() => setWarmImages(true), 3000);
      return () => window.clearTimeout(t);
    }
  }, []);

  return (
    <LanguageProvider>
      {/* Off-screen image preloader — keeps decoded images in browser memory.
          Mounted only after first paint (see effect above) so it never blocks
          the initial load. */}
      {warmImages && (
        <div
          aria-hidden="true"
          style={{
            position: "fixed",
            top: -1,
            left: -1,
            width: 1,
            height: 1,
            overflow: "hidden",
            opacity: 0,
            pointerEvents: "none",
          }}
        >
          {preloadThumbnails.map((src) => (
            <img key={src} src={src} loading="eager" alt="" />
          ))}
        </div>
      )}
      <FirstTimeLoader />
      <MaterialProvider>
        <ConfiguratorProvider>
          <Scene />
          <ControlPanel />
          <Configurator />
          <Spinner />
        </ConfiguratorProvider>
      </MaterialProvider>
    </LanguageProvider>
  );
}

export default App;
