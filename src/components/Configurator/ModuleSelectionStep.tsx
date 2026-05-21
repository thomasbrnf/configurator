import React, { useState, useEffect } from "react";
import {
  useConfigurator,
  availableModules,
  availableCompleteSets,
} from "../../context/ConfiguratorContext";
import { useLanguage } from "../../context/LanguageContext";
import { generateInstanceId } from "../../utils/moduleId";
import ConfiguratorHeader from "./ConfiguratorHeader";
import ItemCard from "../ui/ItemCard";

const ModuleSelectionStep: React.FC = () => {
  const { t } = useLanguage();
  const {
    configurationType,
    selectedCompleteSet,
    setSelectedCompleteSet,
    setCurrentStep,
    addObjectToScene,
    clearScene,
    sceneObjects,
  } = useConfigurator();

  const [moduleCounts, setModuleCounts] = useState<Map<string, number>>(
    new Map(),
  );

  useEffect(() => {
    setModuleCounts(new Map());
  }, []);

  useEffect(() => {
    if (configurationType === "modules" && selectedCompleteSet) {
      clearScene();
      setSelectedCompleteSet(null);
    }
  }, [
    configurationType,
    selectedCompleteSet,
    clearScene,
    setSelectedCompleteSet,
  ]);

  const handleBack = () => {
    setCurrentStep("config-type");
    setModuleCounts(new Map());
  };

  const handleClose = () => {
    setCurrentStep("scene");
    setModuleCounts(new Map());
  };

  const handleCompleteSetSelect = (setId: string) => {
    setSelectedCompleteSet(setId);
    addObjectToScene(setId);
    setCurrentStep("scene");
  };

  const getModuleCount = (moduleId: string) => moduleCounts.get(moduleId) || 0;
  const isModuleSelected = (moduleId: string) => getModuleCount(moduleId) > 0;

  const incrementModule = (moduleId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setModuleCounts((prev) => {
      const next = new Map(prev);
      next.set(moduleId, (next.get(moduleId) || 0) + 1);
      return next;
    });
  };

  const decrementModule = (moduleId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setModuleCounts((prev) => {
      const next = new Map(prev);
      const current = next.get(moduleId) || 0;
      if (current <= 1) next.delete(moduleId);
      else next.set(moduleId, current - 1);
      return next;
    });
  };

  const toggleModule = (moduleId: string) => {
    setModuleCounts((prev) => {
      const next = new Map(prev);
      if (next.has(moduleId)) next.delete(moduleId);
      else next.set(moduleId, 1);
      return next;
    });
  };

  const clearModules = () => setModuleCounts(new Map());

  const addModulesToScene = () => {
    let counter = 0;
    moduleCounts.forEach((count, moduleId) => {
      for (let i = 0; i < count; i++) {
        addObjectToScene(generateInstanceId(moduleId, counter));
        counter++;
      }
    });
    setCurrentStep("scene");
    setModuleCounts(new Map());
  };

  /* ─── Complete Sets view ──────────────────────────────────────── */
  if (configurationType === "complete") {
    return (
      <div className="fixed inset-0 bg-white z-[1000] flex flex-col overflow-hidden">
        <ConfiguratorHeader
          onBack={handleBack}
          onClose={sceneObjects.length > 0 ? handleClose : undefined}
          breadcrumb={["HOME", "CONFIGURATION TYPE", "COMPLETE SETS"]}
        />

        <div className="pt-[95px] flex flex-col px-[100px] flex-1 text-left overflow-hidden">
          <div className=" pt-[25px] pb-[35px] shrink-0">
            <h2 className="font-lato font-medium text-[25px] text-black leading-none">
              {t.selectCompleteSet}
            </h2>
            <p className="font-lato font-light text-[20px] text-black leading-normal">
              {t.selectCompleteSetSubtitle}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto  pb-[44px]">
            <div className="grid grid-cols-3 gap-5">
              {availableCompleteSets.map((set) => {
                const isAlreadyInScene = sceneObjects.some(
                  (inst) =>
                    (inst as unknown as { instanceId: string }).instanceId ===
                    set.id,
                );
                return (
                  <ItemCard
                    key={set.id}
                    name={set.displayName}
                    subtitle={
                      isAlreadyInScene ? t.alreadyInScene : t.clickToSelect2
                    }
                    thumbnail={set.thumbnail}
                    disabled={isAlreadyInScene}
                    onClick={() => handleCompleteSetSelect(set.id)}
                    imageAspect="video"
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ─── Modules selection view ──────────────────────────────────── */
  return (
    <div className="fixed inset-0 bg-white z-[1000] flex flex-col overflow-hidden">
      <ConfiguratorHeader
        onBack={handleBack}
        onClose={sceneObjects.length > 0 ? handleClose : undefined}
        breadcrumb={["HOME", "CONFIGURATION TYPE", "MODULE SELECT"]}
      />

      <div className="pt-[95px] flex w-full flex-col   px-[100px] flex-1 text-left overflow-hidden">
        <div className=" pt-[25px] pb-[35px] shrink-0">
          <h2 className="font-lato font-medium text-[25px] text-black leading-none">
            {t.selectModulesMultiple}
          </h2>
          <p className="font-lato font-light text-[20px] text-black leading-normal">
            {t.buildOwnConfiguration}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto ">
          <div className="grid grid-cols-4 gap-5 pb-5">
            {availableModules.map((module) => {
              const count = getModuleCount(module.id);
              const isSelected = isModuleSelected(module.id);

              return (
                <ItemCard
                  key={module.id}
                  name={module.displayName}
                  subtitle={t.clickToSelect2}
                  thumbnail={module.thumbnail}
                  selected={isSelected}
                  onClick={() => toggleModule(module.id)}
                  imageAspect="square"
                  overlay={
                    isSelected ? (
                      <div
                        className="absolute bottom-2 right-2 flex items-center gap-1 bg-white border border-ui-dark px-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={(e) => decrementModule(module.id, e)}
                          className="w-6 h-8 flex items-center justify-center font-lato text-[18px] text-ui-dark hover:bg-gray-100 cursor-pointer"
                        >
                          −
                        </button>
                        <span className="font-lato font-light text-[15px] text-ui-dark min-w-[20px] text-center">
                          {count}
                        </span>
                        <button
                          onClick={(e) => incrementModule(module.id, e)}
                          className="w-6 h-6 flex items-center justify-center font-lato text-[18px] text-ui-dark hover:bg-gray-100 cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    ) : undefined
                  }
                />
              );
            })}
          </div>
        </div>

        <div className="h-[88px] bg-white shrink-0 flex items-center justify-center gap-3.75">
          <button
            onClick={addModulesToScene}
            disabled={moduleCounts.size === 0}
            className={`flex items-center justify-center bg-white border-[3px] h-[60px] w-[300px] transition-colors font-lato font-light text-[20px] uppercase ${
              moduleCounts.size > 0
                ? "border-[#757575] hover:border-ui-dark text-black  cursor-pointer"
                : "border-ui-border text-ui-border cursor-not-allowed"
            }`}
          >
            {t.addToScene}
          </button>

          <button
            onClick={clearModules}
            disabled={moduleCounts.size === 0}
            title={t.clearSelection}
            className={`flex items-center justify-center bg-white border-[3px] h-[60px] w-[60px] transition-colors ${
              moduleCounts.size > 0
                ? "border-[#757575] hover:border-ui-dark hover:bg-[#EE4848] hover:text-white cursor-pointer"
                : "border-ui-border  cursor-not-allowed opacity-40"
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="19"
              height="20"
              viewBox="0 0 19 20"
              fill="none"
            >
              <path
                d="M18.2494 19.7964H14.5804C14.3248 19.7964 14.1194 19.7325 13.9643 19.6048C13.8183 19.477 13.6996 19.331 13.6083 19.1667L9.02203 11.5685C8.94901 11.7966 8.8623 11.9929 8.7619 12.1571L4.36726 19.1667C4.25774 19.3218 4.12996 19.4679 3.98393 19.6048C3.84702 19.7325 3.66448 19.7964 3.43631 19.7964H0L6.57143 9.61072L0.260119 0H3.92917C4.18472 0 4.36726 0.036508 4.47679 0.109524C4.59544 0.173413 4.70496 0.282937 4.80536 0.438096L9.30952 7.69405C9.40079 7.46587 9.51032 7.2377 9.6381 7.00953L13.7726 0.506548C13.873 0.333135 13.9825 0.205357 14.1012 0.123215C14.2198 0.0410717 14.3704 0 14.553 0H18.0714L11.7054 9.46012L18.2494 19.7964Z"
                fill="currentColor"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModuleSelectionStep;
