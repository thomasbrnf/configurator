import React, { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { useMaterial } from "./MaterialContext";
import { extractBaseModuleId, generateInstanceId } from "../utils/moduleId";

function saveSession(key: string, value: unknown) {
  try { sessionStorage.setItem(key, JSON.stringify(value)); } catch {}
}

function loadSession<T>(key: string, fallback: T): T {
  try {
    const raw = sessionStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch { return fallback; }
}

function mapToEntries<V>(map: Map<string, V>): [string, V][] {
  return Array.from(map.entries());
}

function entriesToMap<V>(entries: [string, V][]): Map<string, V> {
  return new Map(entries);
}

const SESSION_KEYS = [
  "cfg_step", "cfg_type", "cfg_sceneObjects",
  "cfg_positions", "cfg_rotations", "camera_state", "mat_objects",
];

export type ConfigurationStep =
  | "welcome"
  | "config-type"
  | "module-selection"
  | "scene";
export type ConfigurationType = "complete" | "modules" | null;

export type SnappingSide = "left" | "right" | "both" | "none";
export type ModuleCategory =
  | "standard"
  | "standardLong"
  | "wide"
  | "light"
  | "extralight"
  | "thin"
  | "corner"
  | "cornerWider";

export interface SceneInstance {
  instanceId: string; // full encoded ID (or bare set ID for complete sets)
  moduleId: string; // base module ID (same as instanceId for complete sets)
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
  translationKey: string;
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
    id: "1(70)TVBB aku",
    name: "1(70)TVBB aku",
    displayName: "1(70)TVBB aku",
    modelPath: `${BASE}models/moduls/1(70)TVBB aku.glb`,
    thumbnail: `${BASE}models/thumbnails/1(70)TVBB aku.jpg`,
    category: "standard",
    snappingSides: "both",
  },
  {
    id: "1D70(1)SBB",
    name: "1D70(1)SBB",
    displayName: "1D70(1)SBB",
    modelPath: `${BASE}models/moduls/1D70(1)SBB.glb`,
    thumbnail: `${BASE}models/thumbnails/1D70(1)SBB.jpg`,
    category: 'standardLong',
    snappingSides: "both",
  },
  {
    id: "2(160)FBBW PRO",
    name: "2(160)FBBW PRO",
    displayName: "2(160)FBBW PRO",
    modelPath: `${BASE}models/moduls/2(160)FBBW PRO.glb`,
    thumbnail: `${BASE}models/thumbnails/2(160)FBBW PRO.jpg`,
    category: "wide",
    snappingSides: "both",
  },
  {
    id: "BAR(2z)L",
    name: "BAR(2z)L",
    displayName: "BAR(2z)L",
    modelPath: `${BASE}models/moduls/BAR(2z)L.glb`,
    thumbnail: `${BASE}models/thumbnails/BAR(2z)L.jpg`,
    category: "light",
    snappingSides: "both",
  },
  {
    id: "BAR(2z)S",
    name: "BAR(2z)S",
    displayName: "BAR(2z)S",
    modelPath: `${BASE}models/moduls/BAR(2z)S.glb`,
    thumbnail: `${BASE}models/thumbnails/BAR(2z)S.jpg`,
    category: "light",
    snappingSides: "both",
  },
  {
    id: "BAR",
    name: "BAR",
    displayName: "BAR",
    modelPath: `${BASE}models/moduls/BAR.glb`,
    thumbnail: `${BASE}models/thumbnails/BAR.jpg`,
    category: "light",
    snappingSides: "both",
  },
  {
    id: "BL (b)",
    name: "BL (b)",
    displayName: "BL (b)",
    modelPath: `${BASE}models/moduls/BL (b).glb`,
    thumbnail: `${BASE}models/thumbnails/BL (b).jpg`,
    category: "thin",
    snappingSides: "right",
  },
  {
    id: "BL",
    name: "BL",
    displayName: "BL",
    modelPath: `${BASE}models/moduls/BL.glb`,
    thumbnail: `${BASE}models/thumbnails/BL.jpg`,
    category: "extralight",
    snappingSides: "right",
  },
  {
    id: "BP (b)",
    name: "BP (b)",
    displayName: "BP (b)",
    modelPath: `${BASE}models/moduls/BP (b).glb`,
    thumbnail: `${BASE}models/thumbnails/BP (b).jpg`,
    category: "thin",
    snappingSides: "left",
  },
  {
    id: "BP",
    name: "BP",
    displayName: "BP",
    modelPath: `${BASE}models/moduls/BP.glb`,
    thumbnail: `${BASE}models/thumbnails/BP.jpg`,
    category: "extralight",
    snappingSides: "left",
  },
  {
    id: "EN(2)L",
    name: "EN(2)L",
    displayName: "EN(2)L",
    modelPath: `${BASE}models/moduls/EN(2)L.glb`,
    thumbnail: `${BASE}models/thumbnails/EN(2)L.jpg`,
    category: "corner",
    snappingSides: "right",
  },
  {
    id: "EN(2)R",
    name: "EN(2)R",
    displayName: "EN(2)R",
    modelPath: `${BASE}models/moduls/EN(2)R.glb`,
    thumbnail: `${BASE}models/thumbnails/EN(2)R.jpg`,
    category: "corner",
    snappingSides: "left",
  },
  {
    id: "KE(70)SL",
    name: "KE(70)SL",
    displayName: "KE(70)SL",
    modelPath: `${BASE}models/moduls/KE(70)SL.glb`,
    thumbnail: `${BASE}models/thumbnails/KE(70)SL.jpg`,
    category: "cornerWider",
    snappingSides: "right",
  },
  {
    id: "KE(70)SP",
    name: "KE(70)SP",
    displayName: "KE(70)SP",
    modelPath: `${BASE}models/moduls/KE(70)SP.glb`,
    thumbnail: `${BASE}models/thumbnails/KE(70)SP.jpg`,
    category: "cornerWider",
    snappingSides: "left",
  },
];

export const availableCompleteSets: CompleteSetDefinition[] = [
  {
    id: "set-bl-bp",
    name: "BL - BP",
    displayName: "BL – BP",
    translationKey: "BL – BP",
    modelPath: `${BASE}models/BL - 2(160) FFBBW - BP.glb`,
    thumbnail: `${BASE}models/thumbnails/set-bl-bp.jpg`,
  },
  {
    id: "set-bl-bp-open",
    name: "BL - BP open",
    displayName: "BL – BP (open)",
    translationKey: "BL – BP (open)",
    modelPath: `${BASE}models/BL - 2(160) FFBBW - BP open.glb`,
    thumbnail: `${BASE}models/thumbnails/set-bl-bp-open.jpg`,
  },
  {
    id: "set-bl-sbb-bp",
    name: "BL SBB BP",
    displayName: "BL PRO – SBB – BP",
    translationKey: "BL PRO – SBB – BP",
    modelPath: `${BASE}models/BL - 2(160) FFBBW PRO - 1D70(1)SBB - BP.glb`,
    thumbnail: `${BASE}models/thumbnails/set-bl-sbb-bp.jpg`,
  },
  {
    id: "set-bl-sbb-bp-open",
    name: "BL SBB BP open",
    displayName: "BL PRO – SBB – BP (open)",
    translationKey: "BL PRO – SBB – BP (open)",
    modelPath: `${BASE}models/BL - 2(160) FFBBW PRO - 1D70(1)SBB - BP open.glb`,
    thumbnail: `${BASE}models/thumbnails/set-bl-sbb-bp-open.jpg`,
  },
  {
    id: "set-bl-full",
    name: "BL full",
    displayName: "BL PRO – EN – TVBB – BAR – BP(b)",
    translationKey: "BL PRO full",
    modelPath: `${BASE}models/BL - 2(160) FFBBW PRO - EN(2) - 1(70)TVBB (aku) - BAR(2)S - 1(70) BB - BP(b).glb`,
    thumbnail: `${BASE}models/thumbnails/set-bl-full.jpg`,
  },
  {
    id: "set-bl-full-open",
    name: "BL full open",
    displayName: "BL PRO – EN – TVBB – BAR – BP(b) (open)",
    translationKey: "BL PRO full (open)",
    modelPath: `${BASE}models/BL - 2(160)FFBBW PRO - EN(2) - 1(70)TVBB(aku) - BAR(2)S- 1(70)BB - BP(b) open.glb`,
    thumbnail: `${BASE}models/thumbnails/set-bl-full-open.jpg`,
  },
  {
    id: "set-blb-ke",
    name: "BL(b) KE",
    displayName: "BL(b) PRO – EN – KE SP",
    translationKey: "BL(b) PRO – EN – KE SP",
    modelPath: `${BASE}models/BL(b) - 2(160) FFBBW PRO - EN(2) - KE(70) SP.glb`,
    thumbnail: `${BASE}models/thumbnails/set-blb-ke.jpg`,
  },
  
  {
    id: "set-bar-bp",
    name: "BAR BP",
    displayName: "BAR(2z)L – TVBB – EN – PRO – BP(b)",
    translationKey: "BAR(2z)L full",
    modelPath: `${BASE}models/BAR(2z) L - 1(70) TVBBe - 1(70)BB - EN(2) - 2(160) FFBBW PRO - BP(b).glb`,
    thumbnail: `${BASE}models/thumbnails/set-bar-bp.jpg`,
  },
  {
    id: "set-bar-bp-open",
    name: "BAR BP open",
    displayName: "BAR(2z)L – TVBB – EN – PRO – BP(b) (open)",
    translationKey: "BAR(2z)L full (open)",
    modelPath: `${BASE}models/BAR(2z) L - 1(70) TVBBe - 1(70)BB - EN(2) - 2(160) FFBBW PRO - BP(b) open.glb`,
    thumbnail: `${BASE}models/thumbnails/set-bar-bp-open.jpg`,
  },
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
  setObjectPosition: (
    instanceId: string,
    position: [number, number, number],
  ) => void;

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
  const { setSelectedObjectId, clearObjects } = useMaterial();
  const [currentStep, setCurrentStep] = useState<ConfigurationStep>(
    () => loadSession<ConfigurationStep>("cfg_step", "welcome"),
  );
  const [configurationType, setConfigurationType] =
    useState<ConfigurationType>(
      () => loadSession<ConfigurationType>("cfg_type", null),
    );
  const [selectedModules, setSelectedModules] = useState<Set<string>>(
    new Set(),
  );
  const [selectedCompleteSet, setSelectedCompleteSet] = useState<string | null>(
    null,
  );
  const [sceneObjects, setSceneObjects] = useState<SceneInstance[]>(
    () => loadSession<SceneInstance[]>("cfg_sceneObjects", []),
  );
  const [objectRotations, setObjectRotations] = useState<
    Map<string, [number, number, number]>
  >(() => entriesToMap(loadSession<[string, [number, number, number]][]>("cfg_rotations", [])));
  const [objectPositions, setObjectPositions] = useState<
    Map<string, [number, number, number]>
  >(() => entriesToMap(loadSession<[string, [number, number, number]][]>("cfg_positions", [])));
  const [rotationControlId, setRotationControlId] = useState<string | null>(
    null,
  );

  useEffect(() => saveSession("cfg_step", currentStep), [currentStep]);
  useEffect(() => saveSession("cfg_type", configurationType), [configurationType]);
  useEffect(() => saveSession("cfg_sceneObjects", sceneObjects), [sceneObjects]);
  useEffect(() => saveSession("cfg_rotations", mapToEntries(objectRotations)), [objectRotations]);
  useEffect(() => saveSession("cfg_positions", mapToEntries(objectPositions)), [objectPositions]);

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
    const startIndex = sceneObjects.length;
    const instances: SceneInstance[] = Array.from(selectedModules).map(
      (moduleId) => {
        const instanceId = generateInstanceId(moduleId, counter++);
        return { instanceId, moduleId };
      },
    );
    setSceneObjects((prev) => [...prev, ...instances]);
    setObjectPositions((prev) => {
      const next = new Map(prev);
      instances.forEach((inst, i) => {
        next.set(inst.instanceId, [(startIndex + i) * 1.9, 0, 0]);
      });
      return next;
    });
    if (instances.length > 0) {
      setSelectedObjectId(instances[0].instanceId);
    }
    setCurrentStep("scene");
  };

  const addObjectToScene = (objectId: string) => {
    const instanceId = objectId;
    const moduleId = extractBaseModuleId(objectId);
    const instance: SceneInstance = { instanceId, moduleId };

    const isCompleteSet = objectId.startsWith("set-");

    if (isCompleteSet && sceneObjects.length > 0) {
      const gap = 3;
      let latestSetInstance: SceneInstance | undefined;
      for (let i = sceneObjects.length - 1; i >= 0; i--) {
        if (sceneObjects[i].instanceId.startsWith("set-")) {
          latestSetInstance = sceneObjects[i];
          break;
        }
      }

      if (latestSetInstance) {
        const latestPos = objectPositions.get(latestSetInstance.instanceId) || [
          0, 0, 0,
        ];
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
    } else if (!isCompleteSet) {
      setObjectPositions((prev) => {
        const next = new Map(prev);
        next.set(instanceId, [prev.size * 1.9, 0, 0]);
        return next;
      });
    }

    setSceneObjects((prev) => [...prev, instance]);
    setSelectedObjectId(instanceId);
  };

  const removeObjectFromScene = (objectId: string) => {
    removeObjectById(objectId);
  };

  const removeObjectById = (instanceId: string) => {
    setSceneObjects((prev) =>
      prev.filter((inst) => inst.instanceId !== instanceId),
    );
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
      const updated: [number, number, number] = [...current] as [
        number,
        number,
        number,
      ];
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
    SESSION_KEYS.forEach((k) => sessionStorage.removeItem(k));
    clearObjects();
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
