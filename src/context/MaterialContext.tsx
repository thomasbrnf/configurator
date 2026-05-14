import React, { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

export interface MaterialDefinition {
  name: string;
  diffuse: string;
  normal: string;
}

export interface MaterialLibrary {
  amaral: MaterialDefinition[];
  cremona: MaterialDefinition[];
  glow: MaterialDefinition[];
  ilias: MaterialDefinition[];
  indiana: MaterialDefinition[];
  madras: MaterialDefinition[];
  ness: MaterialDefinition[];
  noma: MaterialDefinition[];
  pegaso: MaterialDefinition[];
  puente: MaterialDefinition[];
}

export interface SceneObject {
  id: string;
  name: string;
  material: MaterialDefinition;
}

interface MaterialContextType {
  // Legacy support - will reference selected object's material
  currentMaterial: MaterialDefinition;
  setCurrentMaterial: (material: MaterialDefinition) => void;

  // Multi-object support
  objects: SceneObject[];
  selectedObjectId: string | null;
  setSelectedObjectId: (id: string | null) => void;
  addObject: (object: SceneObject) => void;
  removeObject: (id: string) => void;
  getObjectMaterial: (id: string) => MaterialDefinition | undefined;
  setObjectMaterial: (id: string, material: MaterialDefinition) => void;

  uvScale: number;
  setUvScale: (scale: number) => void;
  normalScale: number;
  setNormalScale: (scale: number) => void;
  metalness: number;
  setMetalness: (metalness: number) => void;
  roughness: number;
  setRoughness: (roughness: number) => void;
}

const MaterialContext = createContext<MaterialContextType | undefined>(
  undefined,
);

const BASE = import.meta.env.BASE_URL;
const MAT = `${BASE}materials/`;

export const availableMaterials: MaterialLibrary = {
  amaral: [
    { name: "AMARAL 90",  diffuse: `${MAT}AMARAL 90  790  10  32/AMARAL 90_BaseColor.jpg`,  normal: `${MAT}AMARAL 90  790  10  32/90_Normal.jpg` },
    { name: "AMARAL 790", diffuse: `${MAT}AMARAL 90  790  10  32/AMARAL 790_BaseColor.jpg`, normal: `${MAT}AMARAL 90  790  10  32/790_Normal.jpg` },
    { name: "AMARAL 10",  diffuse: `${MAT}AMARAL 90  790  10  32/AMARAL 10_BaseColor.jpg`,  normal: `${MAT}AMARAL 90  790  10  32/10_Normal.jpg` },
    { name: "AMARAL 32",  diffuse: `${MAT}AMARAL 90  790  10  32/AMARAL 32_BaseColor.jpg`,  normal: `${MAT}AMARAL 90  790  10  32/32_Normal.jpg` },
  ],
  cremona: [
    { name: "CREMONA 02", diffuse: `${MAT}CREMONA 02  24  96  81  77  34/02_BaseColor.jpg`, normal: `${MAT}CREMONA 02  24  96  81  77  34/02_Normal.jpg` },
    { name: "CREMONA 24", diffuse: `${MAT}CREMONA 02  24  96  81  77  34/24_BaseColor.jpg`, normal: `${MAT}CREMONA 02  24  96  81  77  34/24_Normal.jpg` },
    { name: "CREMONA 96", diffuse: `${MAT}CREMONA 02  24  96  81  77  34/96_BaseColor.jpg`, normal: `${MAT}CREMONA 02  24  96  81  77  34/96_Normal.jpg` },
    { name: "CREMONA 81", diffuse: `${MAT}CREMONA 02  24  96  81  77  34/81_BaseColor.jpg`, normal: `${MAT}CREMONA 02  24  96  81  77  34/81_Normal.jpg` },
    { name: "CREMONA 77", diffuse: `${MAT}CREMONA 02  24  96  81  77  34/77_BaseColor.jpg`, normal: `${MAT}CREMONA 02  24  96  81  77  34/77_Normal.jpg` },
    { name: "CREMONA 34", diffuse: `${MAT}CREMONA 02  24  96  81  77  34/34_BaseColor.jpg`, normal: `${MAT}CREMONA 02  24  96  81  77  34/34_Normal.jpg` },
  ],
  glow: [
    { name: "GLOW 12",  diffuse: `${MAT}GLOW 12  136  324  03  214  52  503/12_BaseColor.jpg`,  normal: `${MAT}GLOW 12  136  324  03  214  52  503/Glow_Normal.jpg` },
    { name: "GLOW 136", diffuse: `${MAT}GLOW 12  136  324  03  214  52  503/136_BaseColor.jpg`, normal: `${MAT}GLOW 12  136  324  03  214  52  503/Glow_Normal.jpg` },
    { name: "GLOW 324", diffuse: `${MAT}GLOW 12  136  324  03  214  52  503/324_BaseColor.jpg`, normal: `${MAT}GLOW 12  136  324  03  214  52  503/Glow_Normal.jpg` },
    { name: "GLOW 03",  diffuse: `${MAT}GLOW 12  136  324  03  214  52  503/03_BaseColor.jpg`,  normal: `${MAT}GLOW 12  136  324  03  214  52  503/Glow_Normal.jpg` },
    { name: "GLOW 214", diffuse: `${MAT}GLOW 12  136  324  03  214  52  503/214_BaseColor.jpg`, normal: `${MAT}GLOW 12  136  324  03  214  52  503/Glow_Normal.jpg` },
    { name: "GLOW 52",  diffuse: `${MAT}GLOW 12  136  324  03  214  52  503/52_BaseColor.jpg`,  normal: `${MAT}GLOW 12  136  324  03  214  52  503/Glow_Normal.jpg` },
    { name: "GLOW 503", diffuse: `${MAT}GLOW 12  136  324  03  214  52  503/503_BaseColor.jpg`, normal: `${MAT}GLOW 12  136  324  03  214  52  503/Glow_Normal.jpg` },
  ],
  ilias: [
    { name: "ILIAS 13", diffuse: `${MAT}ILIAS 13  18  06/13_BaseColor.jpg`, normal: `${MAT}ILIAS 13  18  06/13_Normal.jpg` },
    { name: "ILIAS 18", diffuse: `${MAT}ILIAS 13  18  06/18_BaseColor.jpg`, normal: `${MAT}ILIAS 13  18  06/18_Normal.jpg` },
    { name: "ILIAS 06", diffuse: `${MAT}ILIAS 13  18  06/06_BaseColor.jpg`, normal: `${MAT}ILIAS 13  18  06/06_Normal.jpg` },
  ],
  indiana: [
    { name: "INDIANA 1",  diffuse: `${MAT}INDIANA 1  6  9  12  15  17  21  22/1_BaseColor.jpg`,  normal: `${MAT}INDIANA 1  6  9  12  15  17  21  22/1_Normal.jpg` },
    { name: "INDIANA 6",  diffuse: `${MAT}INDIANA 1  6  9  12  15  17  21  22/6_BaseColor.jpg`,  normal: `${MAT}INDIANA 1  6  9  12  15  17  21  22/6_Normal.jpg` },
    { name: "INDIANA 9",  diffuse: `${MAT}INDIANA 1  6  9  12  15  17  21  22/9_BaseColor.jpg`,  normal: `${MAT}INDIANA 1  6  9  12  15  17  21  22/9_Normal.jpg` },
    { name: "INDIANA 12", diffuse: `${MAT}INDIANA 1  6  9  12  15  17  21  22/12_BaseColor.jpg`, normal: `${MAT}INDIANA 1  6  9  12  15  17  21  22/12_Normal.jpg` },
    { name: "INDIANA 15", diffuse: `${MAT}INDIANA 1  6  9  12  15  17  21  22/15_BaseColor.jpg`, normal: `${MAT}INDIANA 1  6  9  12  15  17  21  22/15_Normal.jpg` },
    { name: "INDIANA 17", diffuse: `${MAT}INDIANA 1  6  9  12  15  17  21  22/17_BaseColor.jpg`, normal: `${MAT}INDIANA 1  6  9  12  15  17  21  22/17_Normal.jpg` },
    { name: "INDIANA 21", diffuse: `${MAT}INDIANA 1  6  9  12  15  17  21  22/21_BaseColor.jpg`, normal: `${MAT}INDIANA 1  6  9  12  15  17  21  22/21_Normal.jpg` },
    { name: "INDIANA 22", diffuse: `${MAT}INDIANA 1  6  9  12  15  17  21  22/22_BaseColor.jpg`, normal: `${MAT}INDIANA 1  6  9  12  15  17  21  22/22_Normal.jpg` },
  ],
  madras: [
    { name: "MADRAS 230", diffuse: `${MAT}MADRAS 230 310 220/230_BaseColor.jpg`, normal: `${MAT}MADRAS 230 310 220/230_Normal.jpg` },
    { name: "MADRAS 310", diffuse: `${MAT}MADRAS 230 310 220/310_BaseColor.jpg`, normal: `${MAT}MADRAS 230 310 220/310_Normal.jpg` },
    { name: "MADRAS 220", diffuse: `${MAT}MADRAS 230 310 220/220_BaseColor.jpg`, normal: `${MAT}MADRAS 230 310 220/220_Normal.jpg` },
  ],
  ness: [
    { name: "NESS 09", diffuse: `${MAT}NESS 15  09  25  56  96/09_ness_BaseColor.jpg`, normal: `${MAT}NESS 15  09  25  56  96/09_ness_Normal.jpg` },
    { name: "NESS 15", diffuse: `${MAT}NESS 15  09  25  56  96/15_ness_BaseColor.jpg`, normal: `${MAT}NESS 15  09  25  56  96/15_ness_Normal.jpg` },
    { name: "NESS 25", diffuse: `${MAT}NESS 15  09  25  56  96/25_ness_BaseColor.jpg`, normal: `${MAT}NESS 15  09  25  56  96/25_ness_Normal.jpg` },
    { name: "NESS 56", diffuse: `${MAT}NESS 15  09  25  56  96/56_ness_BaseColor.jpg`, normal: `${MAT}NESS 15  09  25  56  96/56_ness_Normal.jpg` },
    { name: "NESS 96", diffuse: `${MAT}NESS 15  09  25  56  96/96_ness_BaseColor.jpg`, normal: `${MAT}NESS 15  09  25  56  96/96_ness_Normal.jpg` },
  ],
  noma: [
    { name: "NOMA 26", diffuse: `${MAT}NOMA 26  55  97  29  05/26_BaseColor.jpg`, normal: `${MAT}NOMA 26  55  97  29  05/26_Normal.jpg` },
    { name: "NOMA 55", diffuse: `${MAT}NOMA 26  55  97  29  05/55_BaseColor.jpg`, normal: `${MAT}NOMA 26  55  97  29  05/55_Normal.jpg` },
    { name: "NOMA 97", diffuse: `${MAT}NOMA 26  55  97  29  05/97_BaseColor.jpg`, normal: `${MAT}NOMA 26  55  97  29  05/97_Normal.jpg` },
    { name: "NOMA 29", diffuse: `${MAT}NOMA 26  55  97  29  05/29_BaseColor.jpg`, normal: `${MAT}NOMA 26  55  97  29  05/29_Normal.jpg` },
    { name: "NOMA 05", diffuse: `${MAT}NOMA 26  55  97  29  05/05_BaseColor.jpg`, normal: `${MAT}NOMA 26  55  97  29  05/05_Normal.jpg` },
  ],
  pegaso: [
    { name: "PEGASO 2450", diffuse: `${MAT}PEGASO 2840 2450 2960/2450_BaseColor.jpg`, normal: `${MAT}PEGASO 2840 2450 2960/2450_Normal.jpg` },
    { name: "PEGASO 2840", diffuse: `${MAT}PEGASO 2840 2450 2960/2840_BaseColor.jpg`, normal: `${MAT}PEGASO 2840 2450 2960/2840_Normal.jpg` },
    { name: "PEGASO 2960", diffuse: `${MAT}PEGASO 2840 2450 2960/2960_BaseColor.jpg`, normal: `${MAT}PEGASO 2840 2450 2960/2960_Normal.jpg` },
  ],
  puente: [
    { name: "PUENTE 15", diffuse: `${MAT}PUENTE 15  56  33  09  06  29/15_BaseColor.jpg`, normal: `${MAT}PUENTE 15  56  33  09  06  29/15_Normal.jpg` },
    { name: "PUENTE 56", diffuse: `${MAT}PUENTE 15  56  33  09  06  29/56_BaseColor.jpg`, normal: `${MAT}PUENTE 15  56  33  09  06  29/56_Normal.jpg` },
    { name: "PUENTE 33", diffuse: `${MAT}PUENTE 15  56  33  09  06  29/33_BaseColor.jpg`, normal: `${MAT}PUENTE 15  56  33  09  06  29/33_Normal.jpg` },
    { name: "PUENTE 09", diffuse: `${MAT}PUENTE 15  56  33  09  06  29/09_BaseColor.jpg`, normal: `${MAT}PUENTE 15  56  33  09  06  29/09_Normal.jpg` },
    { name: "PUENTE 06", diffuse: `${MAT}PUENTE 15  56  33  09  06  29/06_BaseColor.jpg`, normal: `${MAT}PUENTE 15  56  33  09  06  29/06_Normal.jpg` },
    { name: "PUENTE 29", diffuse: `${MAT}PUENTE 15  56  33  09  06  29/29_BaseColor.jpg`, normal: `${MAT}PUENTE 15  56  33  09  06  29/29_Normal.jpg` },
  ],
};

export const MaterialProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [objects, setObjects] = useState<SceneObject[]>([]);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [uvScale, setUvScale] = useState(5.5);
  const [normalScale, setNormalScale] = useState(0.2);
  const [metalness, setMetalness] = useState(0.15);
  const [roughness, setRoughness] = useState(0.85);

  // Legacy support - get material of selected object
  const currentMaterial = selectedObjectId
    ? objects.find((obj) => obj.id === selectedObjectId)?.material ||
      availableMaterials.amaral[0]
    : availableMaterials.amaral[0];

  const setCurrentMaterial = (material: MaterialDefinition) => {
    if (selectedObjectId) {
      setObjectMaterial(selectedObjectId, material);
    }
  };

  const addObject = (object: SceneObject) => {
    setObjects((prev) => [...prev, object]);
  };

  const removeObject = (id: string) => {
    setObjects((prev) => prev.filter((obj) => obj.id !== id));
    if (selectedObjectId === id) {
      setSelectedObjectId(null);
    }
  };

  const getObjectMaterial = (id: string): MaterialDefinition | undefined => {
    return objects.find((obj) => obj.id === id)?.material;
  };

  const setObjectMaterial = (id: string, material: MaterialDefinition) => {
    setObjects((prev) =>
      prev.map((obj) => (obj.id === id ? { ...obj, material } : obj)),
    );
  };

  return (
    <MaterialContext.Provider
      value={{
        currentMaterial,
        setCurrentMaterial,
        objects,
        selectedObjectId,
        setSelectedObjectId,
        addObject,
        removeObject,
        getObjectMaterial,
        setObjectMaterial,
        uvScale,
        setUvScale,
        normalScale,
        setNormalScale,
        metalness,
        setMetalness,
        roughness,
        setRoughness,
      }}
    >
      {children}
    </MaterialContext.Provider>
  );
};

export const MATERIAL_PBR_DEFAULTS: Record<
  keyof MaterialLibrary,
  { uvScale: number; normalScale: number; roughness: number }
> = {
  amaral:  { uvScale: 15.4, normalScale: 1.15, roughness: 0.87 },
  cremona: { uvScale: 14.5, normalScale: 1.15, roughness: 0.87 },
  glow:    { uvScale: 14.1, normalScale: 0.45, roughness: 0.91 },
  ilias:   { uvScale: 20.0, normalScale: 0.05, roughness: 0.91 },
  indiana: { uvScale: 18.8, normalScale: 0.70, roughness: 0.91 },
  madras:  { uvScale: 16.3, normalScale: 0.40, roughness: 0.91 },
  ness:    { uvScale: 18.7, normalScale: 0.95, roughness: 0.91 },
  noma:    { uvScale: 18.4, normalScale: 0.55, roughness: 0.91 },
  pegaso:  { uvScale: 19.9, normalScale: 0.20, roughness: 0.91 },
  puente:  { uvScale: 16.8, normalScale: 0.65, roughness: 0.87 },
};

export function getMaterialFamily(
  materialName: string,
): keyof MaterialLibrary | null {
  const lower = materialName.toLowerCase();
  const families = Object.keys(availableMaterials) as (keyof MaterialLibrary)[];
  return families.find((f) => lower.startsWith(f)) ?? null;
}

export const useMaterial = () => {
  const context = useContext(MaterialContext);
  if (!context) {
    throw new Error("useMaterial must be used within a MaterialProvider");
  }
  return context;
};
