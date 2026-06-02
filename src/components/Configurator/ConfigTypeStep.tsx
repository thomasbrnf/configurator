import React from "react";
import { useConfigurator } from "../../context/ConfiguratorContext";
import { useLanguage } from "../../context/LanguageContext";
import ConfiguratorHeader from "./ConfiguratorHeader";

const BASE = import.meta.env.BASE_URL;
const COMPLETE_SETS_ICON_SRC = `${BASE}assets/images/couch.png`;
const MODULES_ICON_SRC = `${BASE}assets/images/module.png`;

const ConfigTypeStep: React.FC = () => {
  const { setCurrentStep, setConfigurationType, clearScene, sceneObjects } =
    useConfigurator();
  const { t } = useLanguage();

  const handleCompleteSetSelection = () => {
    clearScene();
    setConfigurationType("complete");
    setCurrentStep("module-selection");
  };

  const handleModuleSelection = () => {
    clearScene();
    setConfigurationType("modules");
    setCurrentStep("module-selection");
  };

  return (
    <div className="fixed inset-0 bg-white z-[1000] flex flex-col overflow-hidden">
      <ConfiguratorHeader
        onBack={() => setCurrentStep("welcome")}
        onClose={
          sceneObjects.length > 0 ? () => setCurrentStep("scene") : undefined
        }
        breadcrumb={["HOME", "CONFIGURATION TYPE"]}
      />

      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col items-center px-5 pt-[140px] pb-10">
          {/* Page title */}
          <div className="w-full max-w-[1160px] flex flex-col gap-[5px] mb-[40px]">
            <h1 className="font-lato font-medium text-[45px] text-black leading-none">
              {t.chooseConfigType}
            </h1>
            <p className="font-lato font-light text-[25px] text-black leading-normal">
              {t.configTypeSubtitle}
            </p>
          </div>

          {/* Two option cards */}
          <div className="flex gap-5 flex-wrap justify-center">
            <OptionCard
              icon={COMPLETE_SETS_ICON_SRC}
              iconOffset={{ left: 29, top: 32 }}
              title={t.completeSets}
              description={t.completeSetsDesc}
              buttonLabel={t.completeSets}
              onSelect={handleCompleteSetSelection}
            />
            <OptionCard
              icon={MODULES_ICON_SRC}
              iconOffset={{ left: 29, top: 27 }}
              title={t.modules}
              description={t.modulesDesc}
              buttonLabel={t.modules}
              onSelect={handleModuleSelection}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

interface OptionCardProps {
  icon: string;
  iconOffset: { left: number; top: number };
  title: string;
  description: string;
  buttonLabel: string;
  onSelect: () => void;
}

const OptionCard: React.FC<OptionCardProps> = ({
  icon,
  iconOffset,
  title,
  description,
  buttonLabel,
  onSelect,
}) => (
  <div className="flex flex-col grow items-center justify-center gap-[30px] w-[580px] h-auto p-[60px] bg-gradient-to-b from-ui-surface to-white border-t-[3px] border-ui-dark">
    <div className="relative size-[160px] shrink-0">
      <div className="absolute inset-0 bg-white border-t-[3px] border-b-[3px] border-ui-dark" />
      <img
        src={icon}
        alt=""
        className="absolute size-[102px] object-cover"
        style={{ left: iconOffset.left, top: iconOffset.top }}
      />
    </div>

    <div className="flex flex-col items-center gap-[10px] w-full text-center">
      <span className="font-lato font-light text-[35px] text-black uppercase leading-none h-[50px] flex items-center">
        {title}
      </span>
      <span className="font-lato font-[300] text-[25px] text-ui-dark leading-normal">
        {description}
      </span>
    </div>

    <button
      onClick={onSelect}
      className="flex items-center mt-auto justify-center bg-white border-[3px] border-ui-muted  hover:border-ui-dark h-[70px] w-[340px] cursor-pointer  transition-colors shrink-0"
    >
      <span className="font-lato font-light text-[25px] text-ui-dark uppercase">
        {buttonLabel}
      </span>
    </button>
  </div>
);

export default ConfigTypeStep;
