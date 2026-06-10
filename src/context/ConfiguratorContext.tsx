import React, { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { useMaterial } from "./MaterialContext";
import { extractBaseModuleId, generateInstanceId } from "../utils/moduleId";
import {
  worldHalfExtent,
  worldOffsetXZ,
  quadrantFromRotationY,
  footprintOverlapsAny,
  resolveFootprintOut,
  type Footprint,
} from "../utils/footprint";

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
  "cfg_positions", "cfg_rotations", "cfg_connections", "camera_state", "mat_objects",
];

export type ConfigurationStep =
  | "welcome"
  | "config-type"
  | "module-selection"
  | "scene";
export type ConfigurationType = "complete" | "modules" | null;

export type SnappingSide =
  | "left"
  | "right"
  | "both"
  | "none"
  | "front"
  | "left-front"
  | "right-front";
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
    thumbnail: `${BASE}models/thumbnails/1(70)TVBB aku.webp`,
    category: "standard",
    snappingSides: "both",
  },
  {
    id: "1D70(1)SBB",
    name: "1D70(1)SBB",
    displayName: "1D70(1)SBB",
    modelPath: `${BASE}models/moduls/1D70(1)SBB.glb`,
    thumbnail: `${BASE}models/thumbnails/1D70(1)SBB.webp`,
    category: 'standardLong',
    snappingSides: "both",
  },
  {
    id: "2(160)FBBW PRO",
    name: "2(160)FBBW PRO",
    displayName: "2(160)FBBW PRO",
    modelPath: `${BASE}models/moduls/2(160)FBBW PRO.glb`,
    thumbnail: `${BASE}models/thumbnails/2(160)FBBW PRO.webp`,
    category: "wide",
    snappingSides: "both",
  },
  {
    id: "BAR(2z)L",
    name: "BAR(2z)L",
    displayName: "BAR(2z)L",
    modelPath: `${BASE}models/moduls/BAR(2z)L.glb`,
    thumbnail: `${BASE}models/thumbnails/BAR(2z)L.webp`,
    category: "light",
    snappingSides: "both",
  },
  {
    id: "BAR(2z)S",
    name: "BAR(2z)S",
    displayName: "BAR(2z)S",
    modelPath: `${BASE}models/moduls/BAR(2z)S.glb`,
    thumbnail: `${BASE}models/thumbnails/BAR(2z)S.webp`,
    category: "light",
    snappingSides: "both",
  },
  {
    id: "BAR",
    name: "BAR",
    displayName: "BAR",
    modelPath: `${BASE}models/moduls/BAR.glb`,
    thumbnail: `${BASE}models/thumbnails/BAR.webp`,
    category: "light",
    snappingSides: "both",
  },
  {
    id: "BL (b)",
    name: "BL (b)",
    displayName: "BL (b)",
    modelPath: `${BASE}models/moduls/BL (b).glb`,
    thumbnail: `${BASE}models/thumbnails/BL (b).webp`,
    category: "thin",
    snappingSides: "right",
  },
  {
    id: "BL",
    name: "BL",
    displayName: "BL",
    modelPath: `${BASE}models/moduls/BL.glb`,
    thumbnail: `${BASE}models/thumbnails/BL.webp`,
    category: "extralight",
    snappingSides: "right",
  },
  {
    id: "BP (b)",
    name: "BP (b)",
    displayName: "BP (b)",
    modelPath: `${BASE}models/moduls/BP (b).glb`,
    thumbnail: `${BASE}models/thumbnails/BP (b).webp`,
    category: "thin",
    snappingSides: "left",
  },
  {
    id: "BP",
    name: "BP",
    displayName: "BP",
    modelPath: `${BASE}models/moduls/BP.glb`,
    thumbnail: `${BASE}models/thumbnails/BP.webp`,
    category: "extralight",
    snappingSides: "left",
  },
  {
    id: "EN(2)L",
    name: "EN(2)L",
    displayName: "EN(2)L",
    modelPath: `${BASE}models/moduls/EN(2)L.glb`,
    thumbnail: `${BASE}models/thumbnails/EN(2)L.webp`,
    category: "corner",
    snappingSides: "right-front",
  },
  {
    id: "EN(2)R",
    name: "EN(2)R",
    displayName: "EN(2)R",
    modelPath: `${BASE}models/moduls/EN(2)R.glb`,
    thumbnail: `${BASE}models/thumbnails/EN(2)R.webp`,
    category: "corner",
    snappingSides: "left-front",
  },
  {
    id: "KE(70)SL",
    name: "KE(70)SL",
    displayName: "KE(70)SL",
    modelPath: `${BASE}models/moduls/KE(70)SL.glb`,
    thumbnail: `${BASE}models/thumbnails/KE(70)SL.webp`,
    category: "cornerWider",
    snappingSides: "right",
  },
  {
    id: "KE(70)SP",
    name: "KE(70)SP",
    displayName: "KE(70)SP",
    modelPath: `${BASE}models/moduls/KE(70)SP.glb`,
    thumbnail: `${BASE}models/thumbnails/KE(70)SP.webp`,
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
    thumbnail: `${BASE}models/thumbnails/set-bl-bp.webp`,
  },
  {
    id: "set-bl-bp-open",
    name: "BL - BP open",
    displayName: "BL – BP (open)",
    translationKey: "BL – BP (open)",
    modelPath: `${BASE}models/BL - 2(160) FFBBW - BP open.glb`,
    thumbnail: `${BASE}models/thumbnails/set-bl-bp-open.webp`,
  },
  {
    id: "set-bl-sbb-bp",
    name: "BL SBB BP",
    displayName: "BL PRO – SBB – BP",
    translationKey: "BL PRO – SBB – BP",
    modelPath: `${BASE}models/BL - 2(160) FFBBW PRO - 1D70(1)SBB - BP.glb`,
    thumbnail: `${BASE}models/thumbnails/set-bl-sbb-bp.webp`,
  },
  {
    id: "set-bl-sbb-bp-open",
    name: "BL SBB BP open",
    displayName: "BL PRO – SBB – BP (open)",
    translationKey: "BL PRO – SBB – BP (open)",
    modelPath: `${BASE}models/BL - 2(160) FFBBW PRO - 1D70(1)SBB - BP open.glb`,
    thumbnail: `${BASE}models/thumbnails/set-bl-sbb-bp-open.webp`,
  },
  {
    id: "set-bl-full",
    name: "BL full",
    displayName: "BL PRO – EN – TVBB – BAR – BP(b)",
    translationKey: "BL PRO full",
    modelPath: `${BASE}models/BL - 2(160) FFBBW PRO - EN(2) - 1(70)TVBB (aku) - BAR(2)S - 1(70) BB - BP(b).glb`,
    thumbnail: `${BASE}models/thumbnails/set-bl-full.webp`,
  },
  {
    id: "set-bl-full-open",
    name: "BL full open",
    displayName: "BL PRO – EN – TVBB – BAR – BP(b) (open)",
    translationKey: "BL PRO full (open)",
    modelPath: `${BASE}models/BL - 2(160)FFBBW PRO - EN(2) - 1(70)TVBB(aku) - BAR(2)S- 1(70)BB - BP(b) open.glb`,
    thumbnail: `${BASE}models/thumbnails/set-bl-full-open.webp`,
  },
  {
    id: "set-blb-ke",
    name: "BL(b) KE",
    displayName: "BL(b) PRO – EN – KE SP",
    translationKey: "BL(b) PRO – EN – KE SP",
    modelPath: `${BASE}models/BL(b) - 2(160) FFBBW PRO - EN(2) - KE(70) SP.glb`,
    thumbnail: `${BASE}models/thumbnails/set-blb-ke.webp`,
  },
  {
    id: "set-blb-ke-open",
    name: "BL(b) KE open",
    displayName: "BL(b) PRO – EN – KE SP (open)",
    translationKey: "BL(b) PRO – EN – KE SP (open)",
    modelPath: `${BASE}models/BL(b) - 2(160) FFBBW PRO - EN(2) - KE(70) SP open.glb`,
    thumbnail: `${BASE}models/thumbnails/set-blb-ke-open.webp`,
  },
  {
    id: "set-bar-bp",
    name: "BAR BP",
    displayName: "BAR(2z)L – TVBB – EN – PRO – BP(b)",
    translationKey: "BAR(2z)L full",
    modelPath: `${BASE}models/BAR(2z) L - 1(70) TVBBe - 1(70)BB - EN(2) - 2(160) FFBBW PRO - BP(b).glb`,
    thumbnail: `${BASE}models/thumbnails/set-bar-bp.webp`,
  },
  {
    id: "set-bar-bp-open",
    name: "BAR BP open",
    displayName: "BAR(2z)L – TVBB – EN – PRO – BP(b) (open)",
    translationKey: "BAR(2z)L full (open)",
    modelPath: `${BASE}models/BAR(2z) L - 1(70) TVBBe - 1(70)BB - EN(2) - 2(160) FFBBW PRO - BP(b) open.glb`,
    thumbnail: `${BASE}models/thumbnails/set-bar-bp-open.webp`,
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
  duplicateObject: (instanceId: string) => void;
  clearScene: () => void;

  // Model bounding sizes (keyed by baseModuleId) — registered by DynamicModel on load
  objectBoundingSizes: Map<string, [number, number, number]>;
  // Local bounding-box centre offset (keyed by baseModuleId). ~0 for centred
  // modules; non-zero for complete sets whose pivot is off-centre.
  objectBoundingOffsets: Map<string, [number, number, number]>;
  registerObjectSize: (
    moduleId: string,
    size: [number, number, number],
    offset: [number, number, number],
  ) => void;

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
  // Rotate the module 90°, but only if it isn't snapped to another module and
  // the rotated footprint has room (pushing it clear of neighbours if needed).
  // Returns false (no-op) when blocked. See tryRotateObject.
  tryRotateObject: (instanceId: string, direction: "left" | "right") => boolean;

  // Snap connections between modules (unordered pairs). Drives rotation gating.
  connectModules: (a: string, b: string) => void;
  disconnectModule: (instanceId: string) => void;
  isModuleConnected: (instanceId: string) => boolean;

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
  const { setSelectedObjectId, clearObjects, objects, getObjectMaterial, addObject } =
    useMaterial();
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
  // Unordered snap-connection pairs, stored as sorted "idA|idB" keys. A module
  // is "connected" while it appears in any pair; rotation is disabled for it.
  const [connections, setConnections] = useState<Set<string>>(
    () => new Set(loadSession<string[]>("cfg_connections", [])),
  );
  const [objectBoundingSizes, setObjectBoundingSizes] = useState<
    Map<string, [number, number, number]>
  >(new Map());
  const [objectBoundingOffsets, setObjectBoundingOffsets] = useState<
    Map<string, [number, number, number]>
  >(new Map());

  const registerObjectSize = (
    moduleId: string,
    size: [number, number, number],
    offset: [number, number, number],
  ) => {
    setObjectBoundingSizes((prev) => {
      if (prev.get(moduleId)?.[0] === size[0] && prev.get(moduleId)?.[2] === size[2]) return prev;
      const next = new Map(prev);
      next.set(moduleId, size);
      return next;
    });
    setObjectBoundingOffsets((prev) => {
      const cur = prev.get(moduleId);
      if (cur && cur[0] === offset[0] && cur[1] === offset[1] && cur[2] === offset[2]) {
        return prev;
      }
      const next = new Map(prev);
      next.set(moduleId, offset);
      return next;
    });
  };

  useEffect(() => saveSession("cfg_step", currentStep), [currentStep]);
  useEffect(() => saveSession("cfg_type", configurationType), [configurationType]);
  useEffect(() => saveSession("cfg_sceneObjects", sceneObjects), [sceneObjects]);
  useEffect(() => saveSession("cfg_rotations", mapToEntries(objectRotations)), [objectRotations]);
  useEffect(() => saveSession("cfg_positions", mapToEntries(objectPositions)), [objectPositions]);
  useEffect(() => saveSession("cfg_connections", Array.from(connections)), [connections]);

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

  // Returns the X center coordinate for a new object placed to the right of
  // whatever is currently rightmost in `currentPositions`.
  // Reads only from `currentPositions` — never from the `sceneObjects` closure —
  // so it chains correctly across multiple functional setState calls in one flush.
  const computeRightSpawnX = (
    incomingModuleId: string,
    currentPositions: Map<string, [number, number, number]>,
  ): number => {
    if (currentPositions.size === 0) return 0;

    let rightmostX = -Infinity;
    let rightmostBaseId = '';
    for (const [instId, pos] of currentPositions) {
      if (pos[0] > rightmostX) {
        rightmostX = pos[0];
        rightmostBaseId = extractBaseModuleId(instId);
      }
    }
    if (rightmostX === -Infinity) return 0;

    const rightSize = objectBoundingSizes.get(rightmostBaseId);
    const rightHalfW = rightSize
      ? Math.sqrt(rightSize[0] * rightSize[0] + rightSize[2] * rightSize[2]) / 2
      : 0.75;

    const newSize = objectBoundingSizes.get(incomingModuleId);
    const newHalfW = newSize ? newSize[0] / 2 : 0.75;

    return rightmostX + rightHalfW + 0.1 + newHalfW;
  };

  const addModulesToScene = () => {
    let counter = 0;
    const instances: SceneInstance[] = Array.from(selectedModules).map(
      (moduleId) => {
        const instanceId = generateInstanceId(moduleId, counter++);
        return { instanceId, moduleId };
      },
    );
    setSceneObjects((prev) => [...prev, ...instances]);
    setObjectPositions((prev) => {
      const next = new Map(prev);
      // Build positions left-to-right by accumulating into `next` so each
      // module is placed right of the previous one (existing or just added).
      instances.forEach((inst) => {
        const spawnX = computeRightSpawnX(inst.moduleId, next);
        next.set(inst.instanceId, [spawnX, 0, 0]);
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
      // Use prev (not sceneObjects closure) so this chains correctly when called
      // in a tight loop — each call's prev reflects positions from previous calls.
      setObjectPositions((prev) => {
        const next = new Map(prev);
        next.set(instanceId, [computeRightSpawnX(moduleId, prev), 0, 0]);
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
    disconnectModule(instanceId);
    if (rotationControlId === instanceId) {
      setRotationControlId(null);
    }
  };

  const duplicateObject = (instanceId: string) => {
    const baseModuleId = extractBaseModuleId(instanceId);
    const newInstanceId = generateInstanceId(baseModuleId, 0);
    const instance: SceneInstance = {
      instanceId: newInstanceId,
      moduleId: baseModuleId,
    };

    // Inherit the source's fabric material (DynamicModel's mount-time addObject is a
    // no-op when the id already exists, so this pre-seeded material wins).
    const sourceMaterial = getObjectMaterial(instanceId);
    if (sourceMaterial) {
      const sourceObject = objects.find((o) => o.id === instanceId);
      addObject({
        id: newInstanceId,
        name: sourceObject?.name || baseModuleId,
        material: sourceMaterial,
      });
    }

    // Inherit rotation and place the copy beside the source without overlapping.
    const sourceRotation = objectRotations.get(instanceId);
    const sourcePosition = objectPositions.get(instanceId) || [0, 0, 0];

    // Compute safe X offset from stored bounding size.
    // Use the footprint diagonal so any rotation is covered, plus a small gap.
    const storedSize = objectBoundingSizes.get(baseModuleId);
    const offsetX = storedSize
      ? Math.sqrt(storedSize[0] * storedSize[0] + storedSize[2] * storedSize[2]) + 0.1
      : 1.5;

    setSceneObjects((prev) => {
      const index = prev.findIndex((inst) => inst.instanceId === instanceId);
      if (index === -1) return [...prev, instance];
      const next = [...prev];
      next.splice(index + 1, 0, instance);
      return next;
    });
    setObjectPositions((prev) => {
      const next = new Map(prev);
      next.set(newInstanceId, [
        sourcePosition[0] + offsetX,
        sourcePosition[1],
        sourcePosition[2],
      ]);
      return next;
    });
    if (sourceRotation) {
      setObjectRotations((prev) => {
        const next = new Map(prev);
        next.set(newInstanceId, [...sourceRotation] as [number, number, number]);
        return next;
      });
    }
    setSelectedObjectId(newInstanceId);
  };

  const clearScene = () => {
    setSceneObjects([]);
    setObjectRotations(new Map());
    setObjectPositions(new Map());
    setConnections(new Set());
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

  // --- Snap-connection tracking (drives rotation gating) ---
  const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

  const connectModules = (a: string, b: string) => {
    if (a === b) return;
    setConnections((prev) => {
      const key = pairKey(a, b);
      if (prev.has(key)) return prev;
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  };

  const disconnectModule = (instanceId: string) => {
    setConnections((prev) => {
      let changed = false;
      const next = new Set<string>();
      prev.forEach((key) => {
        const sep = key.indexOf("|");
        if (key.slice(0, sep) === instanceId || key.slice(sep + 1) === instanceId) {
          changed = true;
          return;
        }
        next.add(key);
      });
      return changed ? next : prev;
    });
  };

  const isModuleConnected = (instanceId: string): boolean => {
    for (const key of connections) {
      const sep = key.indexOf("|");
      if (key.slice(0, sep) === instanceId || key.slice(sep + 1) === instanceId) {
        return true;
      }
    }
    return false;
  };

  // Rotate 90° with the rules: connected modules can't rotate; before rotating,
  // verify the rotated (X/Z-swapped) footprint has room — if it would overlap a
  // neighbour, push the module to the nearest clear spot; if it can't be cleared
  // (boxed in), cancel entirely. Returns whether the rotation was applied.
  const tryRotateObject = (
    instanceId: string,
    direction: "left" | "right",
  ): boolean => {
    if (isModuleConnected(instanceId)) return false;

    const delta = direction === "left" ? Math.PI / 2 : -Math.PI / 2;
    const currentRot = objectRotations.get(instanceId) || [0, 0, 0];
    const newQuadrant = quadrantFromRotationY(currentRot[1] + delta);

    const effPos = (id: string): [number, number, number] => {
      const p = objectPositions.get(id);
      if (p) return p;
      const idx = sceneObjects.findIndex((o) => o.instanceId === id);
      return [idx * 1.9, 0, 0];
    };
    const sizeOf = (id: string) => objectBoundingSizes.get(extractBaseModuleId(id));
    const offsetOf = (id: string) =>
      objectBoundingOffsets.get(extractBaseModuleId(id));
    const footprintAt = (id: string, quadrant: number): Footprint => {
      const p = effPos(id);
      const cat = getModuleCategory(id);
      const size = sizeOf(id);
      const off = offsetOf(id);
      const [wox, woz] = off ? worldOffsetXZ(off, quadrant) : [0, 0];
      return {
        x: p[0] + wox,
        z: p[2] + woz,
        hx: worldHalfExtent(size, cat, quadrant, "x"),
        hz: worldHalfExtent(size, cat, quadrant, "z"),
      };
    };

    const moved = footprintAt(instanceId, newQuadrant);
    const obstacles = sceneObjects
      .filter((o) => o.instanceId !== instanceId)
      .map((o) =>
        footprintAt(
          o.instanceId,
          quadrantFromRotationY((objectRotations.get(o.instanceId) || [0, 0, 0])[1]),
        ),
      );

    const pos = effPos(instanceId);
    // Offset between the rotated footprint CENTRE and the model ORIGIN, so a
    // cleared centre can be converted back to the origin we actually store.
    const ownOff = offsetOf(instanceId);
    const [movedOx, movedOz] = ownOff
      ? worldOffsetXZ(ownOff, newQuadrant)
      : [0, 0];
    let nextPos: [number, number, number] | null = null;
    if (footprintOverlapsAny(moved, obstacles)) {
      const cleared = resolveFootprintOut(moved, obstacles);
      if (!cleared) return false; // boxed in — no room to rotate
      nextPos = [cleared[0] - movedOx, pos[1], cleared[1] - movedOz];
    }

    if (nextPos) {
      setObjectPositions((prev) => {
        const next = new Map(prev);
        next.set(instanceId, nextPos!);
        return next;
      });
    }
    setObjectRotations((prev) => {
      const next = new Map(prev);
      const cur = next.get(instanceId) || [0, 0, 0];
      next.set(instanceId, [cur[0], cur[1] + delta, cur[2]]);
      return next;
    });
    return true;
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
    setConnections(new Set());
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
        duplicateObject,
        clearScene,
        objectRotations,
        setObjectRotation,
        rotateObject,
        updateObjectRotation,
        tryRotateObject,
        connectModules,
        disconnectModule,
        isModuleConnected,
        objectPositions,
        setObjectPosition,
        rotationControlId,
        setRotationControlId,
        resetConfigurator,
        objectBoundingSizes,
        objectBoundingOffsets,
        registerObjectSize,
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
