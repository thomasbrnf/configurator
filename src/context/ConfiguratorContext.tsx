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
    "Sofa 1": string;
    "Sofa 2": string;
    "Sofa 3": string;
    "Sofa 4": string;
  };
  modelPath: string;
  thumbnail?: string;
}

export const availableModules: ModuleDefinition[] = [

  {
    id: "sofa part middle",
    name: "Sofa Part Middle",
    displayName: "Sofa Part Middle",
    modelPath: "/models/sofa part middle.glb",
    thumbnail: "/models/thumbnails/sofa part middle.png",
    snappingSides: "both", 
  },

  {
    id: "sofa part left",
    name: "Sofa Part Left",
    displayName: "Sofa Part Left",
    modelPath: "/models/sofa part left.glb",
    thumbnail: "/models/thumbnails/sofa part left.jpg",
    snappingSides: "right", 
  },
    {
    id: "sofa long part left",
    name: "Sofa Long Part Left",
    displayName: "Sofa Long Part Left",
    modelPath: "/models/sofa long part left.glb",
    thumbnail: "/models/thumbnails/sofa long part left.jpg",
    snappingSides: "right", 
  },
  {
    id: "sofa part right",
    name: "Sofa Part Right",
    displayName: "Sofa Part Right",
    modelPath: "/models/sofa part right.glb",
    thumbnail: "/models/thumbnails/sofa part right.jpg",
    snappingSides: "left", 
  },
    {
    id: "sofa long part right",
    name: "Sofa Long Part Right",
    displayName: "Sofa Long Part Right",
    modelPath: "/models/sofa long part right.glb",
    thumbnail: "/models/thumbnails/sofa long part right.jpg",
    snappingSides: "left", 
  }
];

export const availableCompleteSets: CompleteSetDefinition[] = [
  {
    id: "sofa-1",
    name: "Sofa 1",
    displayName: " Sofa 1",
    translationKey: "Sofa 1",
    modelPath: "/models/sofa 1.glb",
    thumbnail: "/models/thumbnails/sofa 1.png",
  },
  {
    id: "sofa-2",
    name: "Sofa 2",
    displayName: "Sofa 2",
    translationKey: "Sofa 2",
    modelPath: "/models/sofa 2.glb",
    thumbnail: "/models/thumbnails/sofa 2.png",
  },
    {
    id: "sofa-3",
    name: "Sofa 3",
    displayName: "Sofa 3",
    translationKey: "Sofa 3",
    modelPath: "/models/sofa 3.glb",
    thumbnail: "/models/thumbnails/sofa 3.png",
  },
      {
    id: "sofa-4",
    name: "Sofa 4",
    displayName: "Sofa 4",
    translationKey: "Sofa 4",
    modelPath: "/models/sofa3.glb",
    thumbnail: "/models/thumbnails/sofa3.jpg",
  }
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
