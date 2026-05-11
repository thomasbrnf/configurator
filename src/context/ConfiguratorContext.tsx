import React, { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import { useMaterial } from "./MaterialContext";
import { extractBaseModuleId, generateInstanceId } from "../utils/moduleId";

export type ConfigurationStep =
  | "welcome"
  | "config-type"
  | "module-selection"
  | "scene";
export type ConfigurationType = "complete" | "modules" | null;

export type SnappingSide = "left" | "right" | "both" | "none";
export type ModuleCategory = "standard" | "middle" | "long" | "expanded" | "wide" | "corner" | "accessory";

export interface SceneInstance {
  instanceId: string; // full encoded ID (or bare set ID for complete sets)
  moduleId: string;   // base module ID (same as instanceId for complete sets)
}

export interface ModuleDefinition {
  id: string;
  name: string;
  displayName: string;
  modelPath: string;
  thumbnail?: string;
  category: ModuleCategory;
  snappingSides?: SnappingSide;
  /** Override the global uvScale slider for this model */
  uvScale?: number;
  /** Mesh names that keep their original GLTF material instead of the custom PBR */
  preserveMeshNames?: string[];
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
  /** Override the global uvScale slider for this model */
  uvScale?: number;
  /** Mesh names that keep their original GLTF material instead of the custom PBR */
  preserveMeshNames?: string[];
}

const BASE = import.meta.env.BASE_URL;

export const availableModules: ModuleDefinition[] = [



  {
    id: "sofa part left",
    name: "Sofa Part Left",
    displayName: "Sofa Part Left",
    modelPath: `${BASE}models/sofa part left.glb`,
    thumbnail: `${BASE}models/thumbnails/sofa part left.png`,
    category: "standard",
    snappingSides: "right",
  },
  {
    id: "sofa long part left",
    name: "Sofa Long Part Left",
    displayName: "Sofa Long Part Left",
    modelPath: `${BASE}models/sofa long part left.glb`,
    thumbnail: `${BASE}models/thumbnails/sofa long part left.png`,
    category: "long",
    snappingSides: "right",
  },
  {
    id: "sofa part left exp",
    name: "Sofa Part Left Expanded",
    displayName: "Sofa Part Left Expanded",
    modelPath: `${BASE}models/sofa part left exp.glb`,
    thumbnail: `${BASE}models/thumbnails/sofa part left exp.png`,
    category: "expanded",
    snappingSides: "right",
  },
  {
    id: "sofa part middle",
    name: "Sofa Part Middle",
    displayName: "Sofa Part Middle",
    modelPath: `${BASE}models/sofa part middle.glb`,
    thumbnail: `${BASE}models/thumbnails/sofa part middle.png`,
    category: "middle",
    snappingSides: "both",
  },
  {
    id: "sofa part middle wide",
    name: "Sofa Part Middle Wide",
    displayName: "Sofa Part Middle Wide",
    modelPath: `${BASE}models/sofa middle part wide.glb`,
    thumbnail: `${BASE}models/thumbnails/sofa middle part wide.png`,
    category: "wide",
    snappingSides: "both",
  },
  {
    id: "sofa part right",
    name: "Sofa Part Right",
    displayName: "Sofa Part Right",
    modelPath: `${BASE}models/sofa part right.glb`,
    thumbnail: `${BASE}models/thumbnails/sofa part right.png`,
    category: "standard",
    snappingSides: "left",
  },
  {
    id: "sofa long part right",
    name: "Sofa Long Part Right",
    displayName: "Sofa Long Part Right",
    modelPath: `${BASE}models/sofa long part right.glb`,
    thumbnail: `${BASE}models/thumbnails/sofa long part right.png`,
    category: "long",
    snappingSides: "left",
  },
  {
    id: "sofa part right exp",
    name: "Sofa Part Right Expanded",
    displayName: "Sofa Part Right Expanded",
    modelPath: `${BASE}models/sofa part right exp.glb`,
    thumbnail: `${BASE}models/thumbnails/sofa part right exp.png`,
    category: "expanded",
    snappingSides: "left",
  },
  {
    id: "sofa part right corner",
    name: "Sofa Part Right Corner",
    displayName: "Sofa Part Right Corner",
    modelPath: `${BASE}models/sofa part right corner.glb`,
    thumbnail: `${BASE}models/thumbnails/sofa part right corner.png`,
    category: "corner",
    snappingSides: "left",
  },
  {
    id: "poduszka",
    name: "Poduszka",
    displayName: "Poduszka",
    modelPath: `${BASE}models/gala_collezione_KARATO [PODUSZKA].glb`,
    thumbnail: `${BASE}models/thumbnails/gala_collezione_KARATO [PODUSZKA].png`,
    category: "accessory",
    snappingSides: "none",
    uvScale: 0.5,
  },


];

export const availableCompleteSets: CompleteSetDefinition[] = [
  {
    id: "sofa-1",
    name: "Sofa 1",
    displayName: " Sofa 1",
    translationKey: "Sofa 1",
    modelPath: `${BASE}models/sofa 1.glb`,
    thumbnail: `${BASE}models/thumbnails/sofa 1.png`,
  },
  {
    id: "sofa-2",
    name: "Sofa 2",
    displayName: "Sofa 2",
    translationKey: "Sofa 2",
    modelPath: `${BASE}models/sofa 2.glb`,
    thumbnail: `${BASE}models/thumbnails/sofa 2.png`,
  },
    {
    id: "sofa-3",
    name: "Sofa 3",
    displayName: "Sofa 3",
    translationKey: "Sofa 3",
    modelPath: `${BASE}models/sofa 3.glb`,
    thumbnail: `${BASE}models/thumbnails/sofa 3.png`,
  },
  {
    id: "sofa-4",
    name: "Sofa 4",
    displayName: "Sofa 4",
    translationKey: "Sofa 4",
    modelPath: `${BASE}models/sofa3.glb`,
    thumbnail: `${BASE}models/thumbnails/sofa3.png`,
    uvScale: 10.5,
  }
];

export const getModuleSnappingConfig = (objectId: string): SnappingSide => {
  const baseModuleId = extractBaseModuleId(objectId);
  const module = availableModules.find((m) => m.id === baseModuleId);
  return module?.snappingSides || "both";
};

export const getModuleCategory = (objectId: string): ModuleCategory => {
  const baseModuleId = extractBaseModuleId(objectId);
  const module = availableModules.find((m) => m.id === baseModuleId);
  return module?.category || "standard";
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
  sceneObjects: SceneInstance[];
  addObjectToScene: (objectId: string) => void;
  removeObjectFromScene: (objectId: string) => void;
  removeObjectById: (instanceId: string) => void;
  clearScene: () => void;

  // Object rotations (keyed by instanceId) - [x, y, z] in radians
  objectRotations: Map<string, [number, number, number]>;
  setObjectRotation: (
    instanceId: string,
    rotation: [number, number, number],
  ) => void;
  rotateObject: (instanceId: string) => void;
  updateObjectRotation: (
    instanceId: string,
    axis: "x" | "y" | "z",
    delta: number,
  ) => void;

  // Object positions (keyed by instanceId) - [x, y, z]
  objectPositions: Map<string, [number, number, number]>;
  setObjectPosition: (instanceId: string, position: [number, number, number]) => void;

  // Rotation control UI state
  rotationControlId: string | null;
  setRotationControlId: (instanceId: string | null) => void;

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
  const [sceneObjects, setSceneObjects] = useState<SceneInstance[]>([]);
  const [objectRotations, setObjectRotations] = useState<
    Map<string, [number, number, number]>
  >(new Map());
  const [objectPositions, setObjectPositions] = useState<
    Map<string, [number, number, number]>
  >(new Map());
  const [rotationControlId, setRotationControlId] = useState<string | null>(null);

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
    let counter = 0;
    const instances: SceneInstance[] = Array.from(selectedModules).map((moduleId) => {
      const instanceId = generateInstanceId(moduleId, counter++);
      return { instanceId, moduleId };
    });
    setSceneObjects((prev) => [...prev, ...instances]);
    if (instances.length > 0) {
      setSelectedObjectId(instances[0].instanceId);
    }
    setCurrentStep("scene");
  };

  const addObjectToScene = (objectId: string) => {
    const instanceId = objectId;
    const moduleId = extractBaseModuleId(objectId);
    const instance: SceneInstance = { instanceId, moduleId };

    const isCompleteSet = objectId.startsWith("sofa-");

    if (isCompleteSet && sceneObjects.length > 0) {
      const gap = 3;
      let latestSetInstance: SceneInstance | undefined;
      for (let i = sceneObjects.length - 1; i >= 0; i--) {
        if (sceneObjects[i].instanceId.startsWith("sofa-")) {
          latestSetInstance = sceneObjects[i];
          break;
        }
      }

      if (latestSetInstance) {
        const latestPos = objectPositions.get(latestSetInstance.instanceId) || [0, 0, 0];
        setObjectPositions((prev) => {
          const next = new Map(prev);
          next.set(instanceId, [latestPos[0] + gap, 0, 0]);
          return next;
        });
      } else {
        setObjectPositions((prev) => {
          const next = new Map(prev);
          next.set(instanceId, [gap, 0, 0]);
          return next;
        });
      }
    }

    setSceneObjects((prev) => [...prev, instance]);
    setSelectedObjectId(instanceId);
  };

  const removeObjectFromScene = (objectId: string) => {
    removeObjectById(objectId);
  };

  const removeObjectById = (instanceId: string) => {
    setSceneObjects((prev) => prev.filter((inst) => inst.instanceId !== instanceId));
    setObjectRotations((prev) => {
      const next = new Map(prev);
      next.delete(instanceId);
      return next;
    });
    setObjectPositions((prev) => {
      const next = new Map(prev);
      next.delete(instanceId);
      return next;
    });
    if (rotationControlId === instanceId) {
      setRotationControlId(null);
    }
  };

  const clearScene = () => {
    setSceneObjects([]);
    setObjectRotations(new Map());
    setObjectPositions(new Map());
    setRotationControlId(null);
  };

  const setObjectRotation = (
    instanceId: string,
    rotation: [number, number, number],
  ) => {
    setObjectRotations((prev) => {
      const next = new Map(prev);
      next.set(instanceId, rotation);
      return next;
    });
  };

  const updateObjectRotation = (
    instanceId: string,
    axis: "x" | "y" | "z",
    delta: number,
  ) => {
    setObjectRotations((prev) => {
      const next = new Map(prev);
      const current = next.get(instanceId) || [0, 0, 0];
      const axisIndex = axis === "x" ? 0 : axis === "y" ? 1 : 2;
      const updated: [number, number, number] = [...current] as [number, number, number];
      updated[axisIndex] += delta;
      next.set(instanceId, updated);
      return next;
    });
  };

  const rotateObject = (instanceId: string) => {
    setObjectRotations((prev) => {
      const next = new Map(prev);
      const current = next.get(instanceId) || [0, 0, 0];
      next.set(instanceId, [current[0], current[1] + Math.PI / 2, current[2]]);
      return next;
    });
  };

  const setObjectPosition = (
    instanceId: string,
    position: [number, number, number],
  ) => {
    setObjectPositions((prev) => {
      const next = new Map(prev);
      next.set(instanceId, position);
      return next;
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
    setRotationControlId(null);
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
        removeObjectById,
        clearScene,
        objectRotations,
        setObjectRotation,
        rotateObject,
        updateObjectRotation,
        objectPositions,
        setObjectPosition,
        rotationControlId,
        setRotationControlId,
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
