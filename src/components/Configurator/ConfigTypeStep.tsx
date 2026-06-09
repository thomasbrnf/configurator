import React from "react";
import { useConfigurator } from "../../context/ConfiguratorContext";
import { useLanguage } from "../../context/LanguageContext";
import ConfiguratorHeader from "./ConfiguratorHeader";

const BASE = import.meta.env.BASE_URL;
const COMPLETE_SETS_ICON_SRC = `${BASE}assets/images/complete-set.svg`;
const MODULES_ICON_SRC = `${BASE}assets/images/modules.svg`;

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
        breadcrumb={[t.home, t.changeConfigType]}
      />

      {/* Vertically centered, never scrolls — sized with clamp() so it fits
          fully even on a 13" MacBook Air. Vertical-driving values use
          min(vw, vh) so they shrink on short viewports. */}
      <div className="flex-1 min-h-0 flex flex-col justify-center overflow-hidden px-[100px] py-[clamp(16px,3vh,40px)]">
        {/* Page title */}
        <div className="w-full flex flex-col mb-[40px]">
          <h1 className="font-lato font-medium text-[clamp(26px,min(2.34vw,4.2vh),45px)] text-black leading-none">
            {t.chooseConfigType.split("\n").map((line, i, arr) => (
              <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
            ))}
          </h1>
        </div>

        {/* Two option cards */}
        <div className="flex gap-[clamp(16px,1.6vw,20px)] justify-center min-h-0">
          <OptionCard
            icon={COMPLETE_SETS_ICON_SRC}
            title={t.completeSets}
            description={t.completeSetsDesc}
            buttonLabel={t.completeSets}
            onSelect={handleCompleteSetSelection}
          />
          <OptionCard
            icon={MODULES_ICON_SRC}
            title={t.modules}
            description={t.modulesDesc}
            buttonLabel={t.modules}
            onSelect={handleModuleSelection}
          />
        </div>
      </div>
    </div>
  );
};

interface OptionCardProps {
  icon: string;
  title: string;
  description: string;
  buttonLabel: string;
  onSelect: () => void;
}

const OptionCard: React.FC<OptionCardProps> = ({
  icon,
  description,
  buttonLabel,
  onSelect,
}) => (
  <div className="flex flex-col grow items-center justify-center gap-[clamp(16px,min(1.56vw,2.78vh),30px)] w-[clamp(300px,30vw,580px)] h-auto p-[clamp(24px,min(3.13vw,5.5vh),60px)] bg-gradient-to-b from-ui-surface to-white border-t-[3px] border-ui-dark">
    <div className="relative size-[clamp(80px,min(8.33vw,14.8vh),160px)] shrink-0">
      <div className="absolute inset-0 bg-white border-t-[3px] border-b-[3px] border-ui-dark" />
      <img
        src={icon}
        alt=""
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[64%] object-contain"
      />
    </div>

    <div className="flex flex-col items-center gap-[10px] w-full text-center">
      <span className="font-lato font-[300] text-[clamp(32px,min(1.3vw,2.3vh),40px)] text-ui-dark leading-normal whitespace-pre-line">
        {description}
      </span>
    </div>

    <button
      onClick={onSelect}
      className="flex items-center mt-auto justify-center bg-white border-[3px] border-ui-muted hover:border-ui-dark h-[clamp(48px,min(3.65vw,6.5vh),70px)] w-[clamp(220px,17.7vw,340px)] cursor-pointer transition-colors shrink-0"
    >
      <span className="font-lato font-light text-[clamp(15px,min(1.3vw,2.3vh),25px)] text-ui-dark uppercase">
        {buttonLabel}
      </span>
    </button>
  </div>
);

export default ConfigTypeStep;
