import "./App.css";
import Scene from "./components/Scene";
import ControlPanel from "./components/ControlPanel";
import Configurator from "./components/Configurator";
import { MaterialProvider } from "./context/MaterialContext";
import { ConfiguratorProvider } from "./context/ConfiguratorContext";

function App() {
  return (
    <MaterialProvider>
      <ConfiguratorProvider>
        <Scene />
        <ControlPanel />
        <Configurator />
      </ConfiguratorProvider>
    </MaterialProvider>
  );
}

export default App;
