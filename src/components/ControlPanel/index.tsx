import React, { useState } from "react";
import { useMaterial, availableMaterials } from "../../context/MaterialContext";
import { useConfigurator } from "../../context/ConfiguratorContext";
import { useLanguage } from "../../context/LanguageContext";
import type { MaterialDefinition } from "../../context/MaterialContext";

interface MaterialGroup {
  key: string;
  displayName: string;
  materials: MaterialDefinition[];
}

const materialGroups: MaterialGroup[] = [
  {
    key: "club",
    displayName: "CREVIN Club",
    materials: availableMaterials.club,
  },
  {
    key: "granit",
    displayName: "CREVIN Granit",
    materials: availableMaterials.granit,
  },
];

export const TopLeftButtons: React.FC = () => {
  const { t } = useLanguage();
  const { setCurrentStep, configurationType } =
    useConfigurator();

  const handleAddModule = () => {
    setCurrentStep("module-selection");
  };

  const handleChangeConfigType = () => {
    setCurrentStep("config-type");
  };

  return (
    <div className="fixed top-6 left-6 z-[200] flex flex-col items-start gap-3">
      {/* Change Config Type Button */}
      <button
        id="changeConfigType"
        onClick={handleChangeConfigType}
        className="h-11 px-5 bg-white text-black text-sm font-medium rounded-xl border border-[#06402b]/20 hover:border-[#06402b]/40 hover:bg-[#06402b]/5 active:scale-[0.98] transition-all duration-200 cursor-pointer shadow-lg backdrop-blur-sm"
      >
        {t.changeConfigType}
      </button>
      
      {/* Add Module/Complete Set Button */}
      <button
        id="addModel"
        onClick={handleAddModule}
        className="group h-11 px-4 bg-gradient-to-br from-[#06402b] to-[#084d35] text-white rounded-xl hover:shadow-xl active:scale-95 transition-all duration-300 cursor-pointer shadow-lg backdrop-blur-sm flex items-center gap-0 overflow-hidden relative"
      >
        <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors duration-300" />
        <svg
          className="w-5 h-5 flex-shrink-0 relative z-10 transition-transform duration-300 group-hover:rotate-90"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 4v16m8-8H4"
          />
        </svg>
        <span className="relative z-10 text-sm font-medium whitespace-nowrap  max-w-xs ml-2 transition-all duration-300 overflow-hidden  opacity-100">
          {configurationType === "complete" ? t.addCompleteSet : t.addModule}
        </span>
      </button>
    </div>
  );
};

export const SelectedObjectInfo: React.FC = () => {
  const { t } = useLanguage();
  const { selectedObjectId, objects } = useMaterial();
  const selectedObject = objects.find((obj) => obj.id === selectedObjectId);

  if (!selectedObject) return null;

  return (
    <div className="fixed bottom-6 right-6 transform  z-[200]">
      <div className="bg-white/90 backdrop-blur-lg rounded-xl border border-[#06402b]/15 overflow-hidden shadow-lg">
        <div className="px-6 py-4">
          <div className="text-lg font-bold text-black mb-3 tracking-tight">
            {selectedObject.name}
          </div>
          <div className="flex items-center gap-3 pt-3 border-t border-[#06402b]/8">
            <div className="w-12 h-12 rounded-xl overflow-hidden shadow-md border-2 border-[#06402b]/20 flex-shrink-0">
              <div
                className="w-full h-full"
                style={{
                  backgroundImage: `url('${selectedObject.material.diffuse}')`,
                  backgroundSize: "1000%",
                  backgroundPosition: "center",
                  backgroundRepeat: "no-repeat",
                }}
              ></div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-bold text-black/50 uppercase tracking-widest mb-1">
                {t.material}
              </div>
              <div className="text-sm font-semibold text-black truncate">
                {selectedObject.material.name}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Materials Modal Component
export const MaterialsModal: React.FC = () => {
  const { t } = useLanguage();
  const { setCurrentMaterial, currentMaterial, selectedObjectId } =
    useMaterial();
  const [isModalOpen, setIsModalOpen] = useState(true);
  const [expandedSection, setExpandedSection] = useState<string>("granit");

  const toggleModal = () => {
    setIsModalOpen(!isModalOpen);
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? "" : section);
  };

  const handleMaterialClick = (material: MaterialDefinition) => {
    setCurrentMaterial(material);
  };

  const isMaterialActive = (material: MaterialDefinition) => {
    return (
      currentMaterial.name === material.name &&
      currentMaterial.diffuse === material.diffuse
    );
  };

  if (!selectedObjectId) return null;

  return (
    <div className="fixed top-6 right-6 z-[200]">
      <div className="bg-white/95 backdrop-blur-lg rounded-xl border border-[#06402b]/15 shadow-lg overflow-hidden">
        <div
          className="px-4 py-3 cursor-pointer select-none bg-[#06402b]/5 hover:bg-[#06402b]/10 transition-colors duration-200"
          onClick={toggleModal}
        >
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold text-black">{t.materials}</h3>
            <div
              className={`w-5 h-5 rounded-md bg-[#06402b]/20 flex items-center justify-center text-black/70 text-sm font-medium transition-transform duration-200 ${isModalOpen ? "rotate-180" : ""}`}
            >
              ↓
            </div>
          </div>
        </div>

        <div
          className="transition-all duration-300 ease-in-out overflow-hidden"
          style={{
            height: isModalOpen ? "auto" : "0px",
            maxHeight: isModalOpen ? "400px" : "0px",
          }}
        >
          <div className=" space-y-2 max-h-80 overflow-y-auto">
            {materialGroups.map((group) => (
              <div
                key={group.key}
                className="bg-white overflow-hidden transition-all duration-200 border-b border-[#06402b]/10"
              >
                <div
                  className="flex justify-between items-center px-4 py-3 cursor-pointer select-none group"
                  onClick={() => toggleSection(group.key)}
                >
                  <h4 className="m-0 text-xs font-semibold text-black tracking-wide uppercase">
                    {group.displayName}
                  </h4>
                  <div
                    className={`w-5 h-5 rounded-md bg-[#06402b]/10 flex items-center justify-center text-black/70 text-sm font-medium transition-transform duration-200 ${expandedSection === group.key ? "rotate-180" : ""}`}
                  >
                    ↓
                  </div>
                </div>
                <div
                  className="transition-all duration-300 ease-in-out overflow-hidden"
                  style={{
                    height: expandedSection === group.key ? "82px" : "0px",
                  }}
                >
                  <div className="flex gap-2 px-4 pt-2 pb-4">
                    {group.materials.map((material, index) => {
                      const isActive = isMaterialActive(material);
                      return (
                        <div
                          key={index}
                          className={`w-12 h-12 rounded-lg cursor-pointer transition-all duration-200 border-2 ${
                            isActive
                              ? "border-[#06402b] shadow-md scale-105"
                              : "border-[#06402b]/15 hover:border-[#06402b]/40 hover:shadow-sm hover:scale-105"
                          } flex-shrink-0 relative overflow-hidden active:scale-95`}
                          title={material.name}
                          onClick={() => handleMaterialClick(material)}
                        >
                          <div
                            className="absolute inset-0"
                            style={{
                              backgroundImage: `url('${material.diffuse}')`,
                              backgroundSize: "1000%",
                              backgroundPosition: "center",
                              backgroundRepeat: "no-repeat",
                            }}
                          ></div>
                          {isActive && (
                            <div className="absolute inset-0 bg-[#06402b]/20 flex items-center justify-center">
                              <div className="w-6 h-6 bg-[#06402b] rounded-full flex items-center justify-center">
                                <svg
                                  className="w-4 h-4 text-white"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={3}
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const ControlPanel: React.FC = () => {
  return (
    <>
      <TopLeftButtons />
      <SelectedObjectInfo />
      <MaterialsModal />
    </>
  );
};

export default ControlPanel;
