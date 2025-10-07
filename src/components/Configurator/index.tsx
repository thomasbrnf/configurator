import React from "react";
import { useConfigurator } from "../../context/ConfiguratorContext";
import WelcomeStep from "./WelcomeStep";
import ConfigTypeStep from "./ConfigTypeStep";
import ModuleSelectionStep from "./ModuleSelectionStep";

const Configurator: React.FC = () => {
  const { currentStep } = useConfigurator();

  switch (currentStep) {
    case "welcome":
      return <WelcomeStep />;
    case "config-type":
      return <ConfigTypeStep />;
    case "module-selection":
      return <ModuleSelectionStep />;
    case "scene":
      return null;
    default:
      return null;
  }
};

export default Configurator;
