import React from "react";
import { useConfigurator } from "../../context/ConfiguratorContext";
import { useLanguage } from "../../context/LanguageContext";
import ConfiguratorHeader from "../Configurator/ConfiguratorHeader";
import MaterialsModal from "./MaterialsModal";

export { MaterialsModal };

const CONFIG_TYPE_ICON =
  "https://www.figma.com/api/mcp/asset/56ba5463-2e4d-42f8-8352-68bcb03dc189";

const ControlPanel: React.FC = () => {
  const { setCurrentStep, configurationType } = useConfigurator();
  const { t } = useLanguage();

  const leftButton = (
    <button
      id="changeConfigType"
      onClick={() => setCurrentStep("config-type")}
      className="shrink-0 flex h-[30px] w-[220px] items-center bg-ui-mid cursor-pointer"
    >
      <div className="size-[30px] shrink-0 flex items-center justify-center">
        <img
          src={CONFIG_TYPE_ICON}
          alt=""
          className="size-full object-contain rotate-180 -scale-y-100"
        />
      </div>
      <span className="flex-1 font-lato font-light text-[15px] text-white uppercase text-center">
        {t.changeConfigType}
      </span>
    </button>
  );

  const subBar =
    configurationType === "complete" ? null : (
      <button
        id="addModel"
        onClick={() => setCurrentStep("module-selection")}
        className="flex h-[50px] w-[220px] items-center justify-center bg-ui-muted group drop-shadow-[0px_1px_2.5px_rgba(0,0,0,0.3)] cursor-pointer hover:bg-[#D4CCBC] transition-colors"
      >
        <span className="font-lato font-light text-[25px] group-hover:text-black text-white uppercase">
          {t.addModule}
        </span>
      </button>
    );

  return (
    <>
      <ConfiguratorHeader
        fixed
        leftContent={leftButton}
        breadcrumb={["HOME", t.changeConfigType, "MODULE SELECT", "EDITOR"]}
        subBar={subBar}
      />
      <MaterialsModal />
    </>
  );
};

export default ControlPanel;
