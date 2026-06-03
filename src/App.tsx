import "./App.css";
import Scene from "./components/Scene";
import ControlPanel from "./components/ControlPanel";
import Configurator from "./components/Configurator";
import Spinner from "./components/Spinner";
import ThumbnailGenerator from "./components/ThumbnailGenerator";
import { MaterialProvider } from "./context/MaterialContext";
import { ConfiguratorProvider } from "./context/ConfiguratorContext";
import { LanguageProvider } from "./context/LanguageContext";

const isThumbnailMode = new URLSearchParams(window.location.search).has("thumbnails");

function App() {
  if (isThumbnailMode) return <ThumbnailGenerator />;

  return (
    <LanguageProvider>
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
