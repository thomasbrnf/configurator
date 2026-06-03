import React, { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

export interface MaterialDefinition {
  name: string;
  diffuse: string;
  normal: string;
}

export interface MaterialLibrary {
  club: MaterialDefinition[];
  granit: MaterialDefinition[];
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

export const availableMaterials: MaterialLibrary = {
  club: [
    {
      name: "Club 07",
      diffuse: `${BASE}materials/the smallest club/club2_07_diffuse_4.jpg`,
      normal: `${BASE}materials/the smallest club/club2_normal_map_m.jpg`,
    },
    {
      name: "Club 51",
      diffuse: `${BASE}materials/the smallest club/club2_51_diffuse_4.jpg`,
      normal: `${BASE}materials/the smallest club/club2_normal_map_m.jpg`,
    },
    {
      name: "Club 52",
      diffuse: `${BASE}materials/the smallest club/club2_52_diffuse_4.jpg`,
      normal: `${BASE}materials/the smallest club/club2_normal_map_m.jpg`,
    },
    {
      name: "Club 54",
      diffuse: `${BASE}materials/the smallest club/club2_54_diffuse_4.jpg`,
      normal: `${BASE}materials/the smallest club/club2_normal_map_m.jpg`,
    },
  ],
  granit: [
    {
      name: "Granit 01",
      diffuse: `${BASE}materials/the smallest granit/Granit_01_new_3.jpg`,
      normal: `${BASE}materials/the smallest granit/Granit_normal_map_5.jpg`,
    },
    {
      name: "Granit 05",
      diffuse: `${BASE}materials/the smallest granit/Granit_05_new_3.jpg`,
      normal: `${BASE}materials/the smallest granit/Granit_normal_map_5.jpg`,
    },
    {
      name: "Granit 07",
      diffuse: `${BASE}materials/the smallest granit/Granit_07_new_3.jpg`,
      normal: `${BASE}materials/the smallest granit/Granit_normal_map_5.jpg`,
    },
    {
      name: "Granit 26",
      diffuse: `${BASE}materials/the smallest granit/Granit_26_new_4.jpg`,
      normal: `${BASE}materials/the smallest granit/Granit_normal_map_5.jpg`,
    },
    {
      name: "Granit 51",
      diffuse: `${BASE}materials/the smallest granit/Granit_51_new_3.jpg`,
      normal: `${BASE}materials/the smallest granit/Granit_normal_map_5.jpg`,
    },
    {
      name: "Granit 54",
      diffuse: `${BASE}materials/the smallest granit/Granit_54_new_4.jpg`,
      normal: `${BASE}materials/the smallest granit/Granit_normal_map_5.jpg`,
    },
  ],
};

export const MaterialProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [objects, setObjects] = useState<SceneObject[]>([
    {
      id: "sofa-1",
      name: "Sofa",
      material: availableMaterials.granit[0],
    },
  ]);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(
    "sofa-1",
  );
  const [uvScale, setUvScale] = useState(4.2);
  const [normalScale, setNormalScale] = useState(0.2);
  const [metalness, setMetalness] = useState(0.15);
  const [roughness, setRoughness] = useState(0.85);

  // Legacy support - get material of selected object
  const currentMaterial = selectedObjectId
    ? objects.find((obj) => obj.id === selectedObjectId)?.material ||
      availableMaterials.granit[0]
    : availableMaterials.granit[0];

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

export const useMaterial = () => {
  const context = useContext(MaterialContext);
  if (!context) {
    throw new Error("useMaterial must be used within a MaterialProvider");
  }
  return context;
};

// Preload all material images via the browser cache so Three.js finds them warm.
const _preloadedImages: HTMLImageElement[] = [];
const _uniqueTexturePaths = new Set<string>();
for (const group of Object.values(availableMaterials)) {
  for (const mat of group) {
    _uniqueTexturePaths.add(mat.diffuse);
    _uniqueTexturePaths.add(mat.normal);
  }
}
for (const src of _uniqueTexturePaths) {
  const img = new Image();
  img.src = src;
  _preloadedImages.push(img);
}
