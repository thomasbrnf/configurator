import React, { useState } from "react";
import { useMaterial, availableMaterials, thumbUrl } from "../../context/MaterialContext";
import { useLanguage } from "../../context/LanguageContext";
import { extractBaseModuleId } from "../../utils/moduleId";
import type { MaterialDefinition } from "../../context/MaterialContext";

const BASE = import.meta.env.BASE_URL;

interface MaterialGroup {
  key: string;
  displayName: string;
  materials: MaterialDefinition[];
  /** Leather group — appends the localized "leather" word to its label */
  leather?: boolean;
}

const materialGroups: MaterialGroup[] = [
  { key: "amaral", displayName: "AMARAL", materials: availableMaterials.amaral },
  { key: "cremona", displayName: "CREMONA", materials: availableMaterials.cremona },
  { key: "ilias", displayName: "ILIAS", materials: availableMaterials.ilias },
  { key: "indiana", displayName: "INDIANA", materials: availableMaterials.indiana },
  { key: "ness", displayName: "NESS", materials: availableMaterials.ness },
  { key: "noma", displayName: "NOMA", materials: availableMaterials.noma },
  { key: "otaru", displayName: "OTARU", materials: availableMaterials.otaru },
  { key: "puente", displayName: "PUENTE", materials: availableMaterials.puente },
  { key: "pegaso", displayName: "PEGASO", materials: availableMaterials.pegaso, leather: true },
  { key: "madras", displayName: "MADRAS", materials: availableMaterials.madras, leather: true },
];

interface WoodOption {
  name: string;
  color: string;
}

const hardcodedWoodGroups: { key: string; displayName: string; options: WoodOption[] }[] = [
  {
    key: "natural",
    displayName: "NATURAL",
    options: [
      { name: "Birch", color: "#E8D5B0" },
      { name: "Ash", color: "#D4BC8E" },
      { name: "Pine", color: "#C9A96E" },
      { name: "Oak", color: "#B8934A" },
      { name: "Maple", color: "#F0E0C0" },
    ],
  },
  {
    key: "stained",
    displayName: "STAINED",
    options: [
      { name: "Honey", color: "#C8903C" },
      { name: "Walnut", color: "#7B4F2E" },
      { name: "Chestnut", color: "#954535" },
      { name: "Ebony", color: "#2C1810" },
      { name: "White", color: "#F5F0E8" },
    ],
  },
];

// Base module / complete-set IDs that may select a wood finish.
// Maps to these .glb files:
//   BAR(2z)S.glb                                                      → BAR(2z)S
//   BAR(2z)L.glb                                                      → BAR(2z)L
//   BAR(2z) L - 1(70) TVBBe - ... - 2(160) FFBBW PRO - BP(b).glb      → set-bar-bp
//   BL - 2(160) FFBBW PRO - EN(2) - 1(70)TVBB (aku) - ... - BP(b).glb → set-bl-full
const WOOD_ALLOWED_IDS = new Set([
  "BAR(2z)S",
  "BAR(2z)L",
  "set-bar-bp",
  "set-bl-full",
]);

const MaterialsModal: React.FC = () => {
  const { t } = useLanguage();
  const { setCurrentMaterial, currentMaterial, selectedObjectId, objects } =
    useMaterial();
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [expandedSection, setExpandedSection] = useState<string>("amaral");
  const [expandedWoodSection, setExpandedWoodSection] = useState<string>("");
  const [selectedWood, setSelectedWood] = useState<string>("");

  const selectedObject = objects.find((obj) => obj.id === selectedObjectId);

  const showWood =
    selectedObjectId !== null &&
    WOOD_ALLOWED_IDS.has(extractBaseModuleId(selectedObjectId));

  const isMaterialActive = (material: MaterialDefinition) =>
    currentMaterial.name === material.name &&
    currentMaterial.diffuse === material.diffuse;

  if (!selectedObjectId || !selectedObject) return null;

  return (
    <div className="fixed top-[90px] right-[50px] z-[200] w-[300px] flex flex-col drop-shadow-[0px_1px_2.5px_rgba(0,0,0,0.3)]">
      {/* Selected module info */}
      <div className="bg-white flex flex-col text-left gap-[10px] p-[20px] w-full">
        <div className="flex flex-col gap-[3px]">
          <span className="font-lato font-light text-[25px] text-ui-dark uppercase leading-none">
            {selectedObject.name}
          </span>
          <span className="font-lato font-normal text-[15px] text-ui-dark uppercase leading-none">
            {t.material}: {selectedObject.material.name}
          </span>
          {showWood && (
            <span className="font-lato font-normal text-[15px] text-ui-dark uppercase leading-none">
              wood: {selectedWood || "—"}
            </span>
          )}
        </div>

        {/* Split preview: left = fabric, right = wood */}
        <div className="h-[40px] w-full rounded-[10px] overflow-hidden flex">
          <div
            className={`${showWood ? "w-1/2" : "w-full"} h-full`}
            style={{
              backgroundImage: `url('${selectedObject.material.diffuse}')`,
              backgroundSize: "400%",
              backgroundPosition: "center",
            }}
          />
          {showWood && (
            <div
              className="w-1/2 h-full"
              style={{
                backgroundImage: `url('${BASE}src/assets/images/wood.png')`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            />
          )}
        </div>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setIsPanelOpen((v) => !v)}
        className="bg-[#7E7870] h-[20px] w-full flex items-center justify-center cursor-pointer transition-colors shrink-0"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`${isPanelOpen ? "rotate-180" : ""}`}
          width="10"
          height="7"
          viewBox="0 0 10 7"
          fill="none"
        >
          <path
            d="M10 6.28376L5 0L0 6.28376L0.889451 7L5 1.83366L9.11055 7L10 6.28376Z"
            fill="white"
          />
        </svg>
      </button>

      {isPanelOpen && (
        <div className="bg-white w-full flex flex-col overflow-y-auto max-h-[calc(100vh-280px)]">

          {/* ── Fabric materials ── */}
          <div className="flex py-3 items-center px-[20px] border-b border-ui-dark">
            <span className="font-lato font-light text-[25px] text-ui-dark uppercase">
              {t.materials}
            </span>
          </div>

          {materialGroups.map((group, i) => {
            const isExpanded = expandedSection === group.key;
            const isLast = i === materialGroups.length - 1;
            return (
              <div
                onClick={() => setExpandedSection(isExpanded ? "" : group.key)}
                key={group.key}
                className={`w-full cursor-pointer ${isLast ? "" : "border-b border-ui-dark"}`}
              >
                <div className="flex h-[20px] items-center justify-between px-[20px] py-[20px]">
                  <span className="font-lato font-normal text-[15px] text-ui-dark uppercase">
                    {group.displayName}
                    {group.leather ? ` ${t.leather}` : ""}
                  </span>
                  <button
                    className={`size-[20px] flex items-center justify-center cursor-pointer border border-ui-dark transition-colors ${
                      isExpanded ? "bg-white" : "bg-ui-dark"
                    }`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className={`transition-transform ${!isExpanded ? "rotate-180" : ""}`}
                      width="11"
                      height="7"
                      viewBox="0 0 11 7"
                      fill="none"
                    >
                      <path
                        d="M10.0352 6.27148L5.01758 0L0 6.27148L0.892578 6.98633L5.01758 1.83008L9.14258 6.98633L10.0352 6.27148Z"
                        className={isExpanded ? "fill-ui-dark" : "fill-white"}
                      />
                    </svg>
                  </button>
                </div>

                <div
                  className="flex flex-col gap-[10px] px-[20px] overflow-hidden"
                  style={{ height: isExpanded ? "auto" : 0, paddingBottom: isExpanded ? 20 : 0 }}
                >
                  {[0, 1].map((row) => (
                    <div key={row} className="flex items-center justify-between">
                      {group.materials
                        .slice(row * 5, row * 5 + 5)
                        .map((material, idx) => (
                          <button
                            key={idx}
                            onClick={(e) => {
                              e.stopPropagation();
                              setCurrentMaterial(material);
                            }}
                            title={material.name}
                            className={`h-[30px] w-[45px] cursor-pointer overflow-hidden transition-all ${
                              isMaterialActive(material)
                                ? "border border-ui-dark"
                                : "border border-transparent hover:border-ui-border"
                            }`}
                            style={{
                              backgroundImage: `url('${thumbUrl(material.diffuse)}')`,
                              backgroundSize: "400%",
                              backgroundPosition: "center",
                            }}
                          />
                        ))}
                      {Array.from({
                        length: Math.max(
                          0,
                          5 - group.materials.slice(row * 5, row * 5 + 5).length,
                        ),
                      }).map((_, i) => (
                        <div key={`pad-${i}`} className="h-[30px] w-[45px]" />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}


          {/* ── Wood section (only for wood-enabled models) ── */}
          {showWood && (
            <>
              <div className="flex py-3 items-center px-[20px] border-t border-b border-ui-dark">
                <span className="font-lato font-light text-[25px] text-ui-dark uppercase">
                  Wood
                </span>
              </div>

          {hardcodedWoodGroups.map((group, i) => {
            const isExpanded = expandedWoodSection === group.key;
            const isLast = i === hardcodedWoodGroups.length - 1;
            return (
              <div
                onClick={() => setExpandedWoodSection(isExpanded ? "" : group.key)}
                key={group.key}
                className={`w-full cursor-pointer ${isLast ? "" : "border-b border-ui-dark"}`}
              >
                <div className="flex h-[20px] items-center justify-between px-[20px] py-[20px]">
                  <span className="font-lato font-normal text-[15px] text-ui-dark uppercase">
                    {group.displayName}
                  </span>
                  <button
                    className={`size-[20px] flex items-center justify-center cursor-pointer border border-ui-dark transition-colors ${
                      isExpanded ? "bg-white" : "bg-ui-dark"
                    }`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className={`transition-transform ${!isExpanded ? "rotate-180" : ""}`}
                      width="11"
                      height="7"
                      viewBox="0 0 11 7"
                      fill="none"
                    >
                      <path
                        d="M10.0352 6.27148L5.01758 0L0 6.27148L0.892578 6.98633L5.01758 1.83008L9.14258 6.98633L10.0352 6.27148Z"
                        className={isExpanded ? "fill-ui-dark" : "fill-white"}
                      />
                    </svg>
                  </button>
                </div>

                <div
                  className="flex flex-col gap-[10px] px-[20px] overflow-hidden"
                  style={{ height: isExpanded ? "auto" : 0, paddingBottom: isExpanded ? 20 : 0 }}
                >
                  <div className="flex items-center justify-between">
                    {group.options.map((option, idx) => (
                      <button
                        key={idx}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedWood(option.name);
                        }}
                        title={option.name}
                        className={`h-[30px] w-[45px] cursor-pointer overflow-hidden transition-all ${
                          selectedWood === option.name
                            ? "border border-ui-dark"
                            : "border border-transparent hover:border-ui-border"
                        }`}
                        style={{ backgroundColor: option.color }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
            </>
          )}

          <p className="uppercase text-[#454343] text-[10px] font-extralight py-1.5 px-[20px]">
            click on arrow to expend
          </p>
        </div>
      )}
    </div>
  );
};

export default MaterialsModal;
