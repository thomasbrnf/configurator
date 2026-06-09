import "./App.css";
import Scene from "./components/Scene";
import ControlPanel from "./components/ControlPanel";
import Configurator from "./components/Configurator";
import Spinner from "./components/Spinner";
import FirstTimeLoader from "./components/FirstTimeLoader";
import { MaterialProvider } from "./context/MaterialContext";
import { ConfiguratorProvider, availableModules, availableCompleteSets } from "./context/ConfiguratorContext";
import { LanguageProvider } from "./context/LanguageContext";
import { availableMaterials } from "./context/MaterialContext";

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
    group.map((mat: { diffuse: any; }) => mat.diffuse),
  ),
];

function App() {
  return (
    <LanguageProvider>
      {/* Off-screen image preloader — keeps decoded images in browser memory */}
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
