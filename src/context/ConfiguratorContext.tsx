import React, { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import { useMaterial } from "./MaterialContext";

export type ConfigurationStep =
  | "welcome"
  | "config-type"
  | "module-selection"
  | "scene";
export type ConfigurationType = "complete" | "modules" | null;

export type SnappingSide = "left" | "right" | "both" | "none";

export interface ModuleDefinition {
  id: string;
  name: string;
  displayName: string;
  modelPath: string;
  thumbnail?: string;
  category?: string;
  snappingSides?: SnappingSide; // Which sides can snap to other modules
}

export interface CompleteSetDefinition {
  id: string;
  name: string;
  displayName: string;
  translationKey: keyof {
    completeSofa: string;
    completeSofa2: string;
    completeSofa3: string;
    completeSofa4: string;
  };
  modelPath: string;
  thumbnail?: string;
}

// Available models based on the GLB files provided
export const availableModules: ModuleDefinition[] = [
  {
    id: "1-80-bb",
    name: "[1(80)BB]",
    displayName: "[1(80)BB]",
    modelPath: "/models/[1(80)BB].glb",
    thumbnail: "/models/thumbnails/[1(80)BB].jpg",
    snappingSides: "both", // Middle part - can snap on both sides
  },
  {
    id: "1-80-l",
    name: "[1(80)L]",
    displayName: "[1(80)L]",
    modelPath: "/models/[1(80)L].glb",
    thumbnail: "/models/thumbnails/[1(80)L].jpg",
    snappingSides: "right", // Left corner - can only snap on right side
  },
  {
    id: "1-80-p",
    name: "[1(80)P]",
    displayName: "[1(80)P]",
    modelPath: "/models/gala_collezione_KARATO [1(80)P].glb",
    thumbnail: "/models/thumbnails/gala_collezione_KARATO [1(80)P].jpg",
    snappingSides: "left", // Right corner - can only snap on left side
  },
  {
    id: "1d-5-sl",
    name: "[1D(5)SL]",
    displayName: "[1D(5)SL]",
    modelPath: "/models/[1D(5)SL].glb",
    thumbnail: "/models/thumbnails/[1D(5)SL].jpg",
    snappingSides: "right", // Left corner - can only snap on right side
  },
  {
    id: "1d-5-sp",
    name: "[1D(5)SP]",
    displayName: "[1D(5)SP]",
    modelPath: "/models/gala_collezione_KARATO [1D(5)SP].glb",
    thumbnail: "/models/thumbnails/gala_collezione_KARATO [1D(5)SP].jpg",
    snappingSides: "left", // Right corner - can only snap on left side
  },
  {
    id: "en-2",
    name: "[EN(2)]",
    displayName: "[EN(2)]",
    modelPath: "/models/gala_collezione_KARATO [EN(2)].glb",
    thumbnail: "/models/thumbnails/gala_collezione_KARATO [EN(2)].jpg",
    snappingSides: "left", // Right corner - can only snap on left side
  },
  {
    id: "poduszka",
    name: "[PODUSZKA]",
    displayName: "[PODUSZKA]",
    modelPath: "/models/gala_collezione_KARATO [PODUSZKA].glb",
    thumbnail: "/models/thumbnails/gala_collezione_KARATO [PODUSZKA].jpg",
    snappingSides: "none", // Pillow - no snapping
  },
];

export const availableCompleteSets: CompleteSetDefinition[] = [
  {
    id: "complete-sofa-1",
    name: "Complete Sofa",
    displayName: "Kompletna Sofa",
    translationKey: "completeSofa",
    modelPath: "/models/complete sofa.glb",
    thumbnail: "/models/thumbnails/complete sofa.jpg",
  },
  {
    id: "complete-sofa-2",
    name: "Complete Sofa 2",
    displayName: "Kompletna Sofa 2",
    translationKey: "completeSofa2",
    modelPath: "/models/complete sofa 2.glb",
    thumbnail: "/models/thumbnails/complete sofa 2.jpg",
  },
  {
    id: "complete-sofa-3",
    name: "Complete Sofa 3",
    displayName: "Kompletna Sofa 3",
    translationKey: "completeSofa3",
    modelPath: "/models/complete sofa 3.glb",
    thumbnail: "/models/thumbnails/complete sofa 3.jpg",
  },
  {
    id: "complete-sofa-4",
    name: "Complete Sofa 4",
    displayName: "Kompletna Sofa 4",
    translationKey: "completeSofa4",
    modelPath: "/models/sofa3.glb",
    thumbnail: "/models/thumbnails/sofa3.jpg",
  },
];

// Helper function to get snapping configuration for a module
export const getModuleSnappingConfig = (objectId: string): SnappingSide => {
  // Extract base module ID (remove counter, timestamp and random suffix)
  const extractBaseModuleId = (id: string): string => {
    const parts = id.split('-');
    // If we have at least 4 parts and the last 3 look like counter-timestamp-random
    if (parts.length >= 4) {
      const lastPart = parts[parts.length - 1];
      const secondLastPart = parts[parts.length - 2];
      const thirdLastPart = parts[parts.length - 3];
      
      if (/^[a-z0-9]{9}$/.test(lastPart) && 
          /^\d{13}$/.test(secondLastPart) && 
          /^\d+$/.test(thirdLastPart)) {
        return parts.slice(0, -3).join('-');
      }
    }
    
    // Fallback for old format
    if (parts.length >= 3) {
      const lastPart = parts[parts.length - 1];
      const secondLastPart = parts[parts.length - 2];
      if (/^[a-z0-9]{9}$/.test(lastPart) && /^\d{13}$/.test(secondLastPart)) {
        return parts.slice(0, -2).join('-');
      }
    }
    
    return id;
  };
  
  const baseModuleId = extractBaseModuleId(objectId);
  const module = availableModules.find((m) => m.id === baseModuleId);
  
  return module?.snappingSides || "both"; // Default to "both" for unknown modules
};

interface ConfiguratorContextType {
  // Step management
  currentStep: ConfigurationStep;
  setCurrentStep: (step: ConfigurationStep) => void;

  // Configuration type
  configurationType: ConfigurationType;
  setConfigurationType: (type: ConfigurationType) => void;

  // Module selection (for modular configuration)
  selectedModules: Set<string>;
  toggleModule: (moduleId: string) => void;
  clearModules: () => void;
  addModulesToScene: () => void;

  // Complete set selection
  selectedCompleteSet: string | null;
  setSelectedCompleteSet: (setId: string | null) => void;

  // Scene objects (what's currently displayed)
  sceneObjects: string[];
  addObjectToScene: (objectId: string) => void;
  removeObjectFromScene: (objectId: string) => void;
  removeObjectByIndex: (index: number) => void;
  clearScene: () => void;

  // Object rotations (tracked by index in sceneObjects) - [x, y, z] in radians
  objectRotations: Map<number, [number, number, number]>;
  setObjectRotation: (
    index: number,
    rotation: [number, number, number],
  ) => void;
  rotateObject: (index: number) => void; // Legacy: 90° Y-axis rotation
  updateObjectRotation: (
    index: number,
    axis: "x" | "y" | "z",
    delta: number,
  ) => void;

  // Object positions (tracked by index in sceneObjects) - [x, y, z]
  objectPositions: Map<number, [number, number, number]>;
  setObjectPosition: (index: number, position: [number, number, number]) => void;

  // Rotation control UI state
  rotationControlIndex: number | null;
  setRotationControlIndex: (index: number | null) => void;

  // Reset configurator
  resetConfigurator: () => void;
}

const ConfiguratorContext = createContext<ConfiguratorContextType | undefined>(
  undefined,
);

export const ConfiguratorProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { setSelectedObjectId } = useMaterial();
  const [currentStep, setCurrentStep] = useState<ConfigurationStep>("welcome");
  const [configurationType, setConfigurationType] =
    useState<ConfigurationType>(null);
  const [selectedModules, setSelectedModules] = useState<Set<string>>(
    new Set(),
  );
  const [selectedCompleteSet, setSelectedCompleteSet] = useState<string | null>(
    null,
  );
  const [sceneObjects, setSceneObjects] = useState<string[]>([]);
  const [objectRotations, setObjectRotations] = useState<
    Map<number, [number, number, number]>
  >(new Map());
  const [objectPositions, setObjectPositions] = useState<
    Map<number, [number, number, number]>
  >(new Map());
  const [rotationControlIndex, setRotationControlIndex] = useState<
    number | null
  >(null);

  const toggleModule = (moduleId: string) => {
    setSelectedModules((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(moduleId)) {
        newSet.delete(moduleId);
      } else {
        newSet.add(moduleId);
      }
      return newSet;
    });
  };

  const clearModules = () => {
    setSelectedModules(new Set());
  };

  const addModulesToScene = () => {
    const moduleIds = Array.from(selectedModules);
    setSceneObjects((prev) => [...prev, ...moduleIds]);
    // Select the first added module
    if (moduleIds.length > 0) {
      setSelectedObjectId(moduleIds[0]);
    }
    setCurrentStep("scene");
  };

  const addObjectToScene = (objectId: string) => {
    setSceneObjects((prev) => [...prev, objectId]);
    // Select the added object
    setSelectedObjectId(objectId);
  };

  const removeObjectFromScene = (objectId: string) => {
    const indexToRemove = sceneObjects.findIndex((id) => id === objectId);
    if (indexToRemove !== -1) {
      removeObjectByIndex(indexToRemove);
    }
  };

  const removeObjectByIndex = (indexToRemove: number) => {
    setSceneObjects((prev) => prev.filter((_, index) => index !== indexToRemove));

    // Clean up rotation and position for removed object and adjust indices
    setObjectRotations((prev) => {
      const newRotations = new Map<number, [number, number, number]>();
      prev.forEach((rotation, index) => {
        if (index < indexToRemove) {
          newRotations.set(index, rotation);
        } else if (index > indexToRemove) {
          newRotations.set(index - 1, rotation);
        }
      });
      return newRotations;
    });

    setObjectPositions((prev) => {
      const newPositions = new Map<number, [number, number, number]>();
      prev.forEach((position, index) => {
        if (index < indexToRemove) {
          newPositions.set(index, position);
        } else if (index > indexToRemove) {
          newPositions.set(index - 1, position);
        }
      });
      return newPositions;
    });

    // Close rotation control if it was on the deleted object
    if (rotationControlIndex === indexToRemove) {
      setRotationControlIndex(null);
    } else if (
      rotationControlIndex !== null &&
      rotationControlIndex > indexToRemove
    ) {
      setRotationControlIndex(rotationControlIndex - 1);
    }
  };

  const clearScene = () => {
    setSceneObjects([]);
    setObjectRotations(new Map());
    setObjectPositions(new Map());
    setRotationControlIndex(null);
  };

  const setObjectRotation = (
    index: number,
    rotation: [number, number, number],
  ) => {
    setObjectRotations((prev) => {
      const newRotations = new Map(prev);
      newRotations.set(index, rotation);
      return newRotations;
    });
  };

  const updateObjectRotation = (
    index: number,
    axis: "x" | "y" | "z",
    delta: number,
  ) => {
    setObjectRotations((prev) => {
      const newRotations = new Map(prev);
      const currentRotation = newRotations.get(index) || [0, 0, 0];
      const axisIndex = axis === "x" ? 0 : axis === "y" ? 1 : 2;
      const updatedRotation: [number, number, number] = [
        ...currentRotation,
      ] as [number, number, number];
      updatedRotation[axisIndex] += delta;
      newRotations.set(index, updatedRotation);
      return newRotations;
    });
  };

  const rotateObject = (index: number) => {
    // Legacy: 90° Y-axis rotation
    setObjectRotations((prev) => {
      const newRotations = new Map(prev);
      const currentRotation = newRotations.get(index) || [0, 0, 0];
      const updatedRotation: [number, number, number] = [
        currentRotation[0],
        currentRotation[1] + Math.PI / 2,
        currentRotation[2],
      ];
      newRotations.set(index, updatedRotation);
      return newRotations;
    });
  };

  const setObjectPosition = (
    index: number,
    position: [number, number, number],
  ) => {
    setObjectPositions((prev) => {
      const newPositions = new Map(prev);
      newPositions.set(index, position);
      return newPositions;
    });
  };

  const resetConfigurator = () => {
    setCurrentStep("welcome");
    setConfigurationType(null);
    setSelectedModules(new Set());
    setSelectedCompleteSet(null);
    setSceneObjects([]);
    setObjectRotations(new Map());
    setObjectPositions(new Map());
    setRotationControlIndex(null);
  };

  return (
    <ConfiguratorContext.Provider
      value={{
        currentStep,
        setCurrentStep,
        configurationType,
        setConfigurationType,
        selectedModules,
        toggleModule,
        clearModules,
        addModulesToScene,
        selectedCompleteSet,
        setSelectedCompleteSet,
        sceneObjects,
        addObjectToScene,
        removeObjectFromScene,
        removeObjectByIndex,
        clearScene,
        objectRotations,
        setObjectRotation,
        rotateObject,
        updateObjectRotation,
        objectPositions,
        setObjectPosition,
        rotationControlIndex,
        setRotationControlIndex,
        resetConfigurator,
      }}
    >
      {children}
    </ConfiguratorContext.Provider>
  );
};

export const useConfigurator = () => {
  const context = useContext(ConfiguratorContext);
  if (!context) {
    throw new Error(
      "useConfigurator must be used within a ConfiguratorProvider",
    );
  }
  return context;
};
