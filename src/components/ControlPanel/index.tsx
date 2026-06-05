import React from "react";
import { useConfigurator } from "../../context/ConfiguratorContext";
import { useLanguage } from "../../context/LanguageContext";
import ConfiguratorHeader from "../Configurator/ConfiguratorHeader";
import MaterialsModal from "./MaterialsModal";

export { MaterialsModal };



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
     <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12" fill="none">
  <path d="M1.11792 5.80908L11.1179 10.8091L11.1179 0.809082L1.11792 5.80908Z" stroke="white"/>
</svg>
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
