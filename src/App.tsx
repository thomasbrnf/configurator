import "./App.css";
import Scene from "./components/Scene";
import ControlPanel from "./components/ControlPanel";
import Configurator from "./components/Configurator";
import { MaterialProvider } from "./context/MaterialContext";
import { ConfiguratorProvider } from "./context/ConfiguratorContext";
import ControlsInfo from "./components/ControlsInfo";

function App() {
  return (
    <MaterialProvider>
      <ConfiguratorProvider>
        <Scene />
        <ControlPanel />
        <Configurator />
        <ControlsInfo />
      </ConfiguratorProvider>
    </MaterialProvider>
  );
}

export default App;
