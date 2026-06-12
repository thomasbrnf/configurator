import React, { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";

function saveSession(key: string, value: unknown) {
  try { sessionStorage.setItem(key, JSON.stringify(value)); } catch {}
}

function loadSession<T>(key: string, fallback: T): T {
  try {
    const raw = sessionStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch { return fallback; }
}

export interface MaterialDefinition {
  name: string;
  diffuse: string;
  normal: string;
}

export interface MaterialLibrary {
  amaral: MaterialDefinition[];
  cremona: MaterialDefinition[];
  ilias: MaterialDefinition[];
  indiana: MaterialDefinition[];
  madras: MaterialDefinition[];
  ness: MaterialDefinition[];
  noma: MaterialDefinition[];
  otaru: MaterialDefinition[];
  pegaso: MaterialDefinition[];
  puente: MaterialDefinition[];
}

/** Per-object surface tuning. Each scene object owns its own copy so two
 *  modules with different fabrics keep independent looks. */
export interface PbrSettings {
  uvScale: number;
  normalScale: number;
  metalness: number;
  roughness: number;
  sheen: number;
  sheenRoughness: number;
  envMapIntensity: number;
  aoMapIntensity: number;
}

export interface SceneObject {
  id: string;
  name: string;
  material: MaterialDefinition;
  /** Surface tuning for this object. Seeded from the material-family defaults
   *  when the object is added or its material changes. */
  pbr?: PbrSettings;
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
  clearObjects: () => void;
  getObjectMaterial: (id: string) => MaterialDefinition | undefined;
  setObjectMaterial: (id: string, material: MaterialDefinition) => void;
  /** Resolved PBR for an object — its stored override, or the family defaults
   *  derived from its current material when no override exists yet. */
  getObjectPbr: (id: string) => PbrSettings;
  /** Patch the stored PBR for an object (used by the Leva tuning panel). */
  setObjectPbr: (id: string, patch: Partial<PbrSettings>) => void;

  uvScale: number;
  setUvScale: (scale: number) => void;
  normalScale: number;
  setNormalScale: (scale: number) => void;
  metalness: number;
  setMetalness: (metalness: number) => void;
  roughness: number;
  setRoughness: (roughness: number) => void;
  sheen: number;
  setSheen: (v: number) => void;
  sheenRoughness: number;
  setSheenRoughness: (v: number) => void;
  envMapIntensity: number;
  setEnvMapIntensity: (v: number) => void;
  aoMapIntensity: number;
  setAoMapIntensity: (v: number) => void;
}

const MaterialContext = createContext<MaterialContextType | undefined>(
  undefined,
);

const BASE = import.meta.env.BASE_URL;
const MAT = `${BASE}materials/`;

export const availableMaterials: MaterialLibrary = {
  amaral: [
    {
      name: "AMARAL 90",
      diffuse: `${MAT}AMARAL 90  790  10  32/AMARAL 90_BaseColor.webp`,
      normal: `${MAT}AMARAL 90  790  10  32/90_Normal.webp`,
    },
    {
      name: "AMARAL 790",
      diffuse: `${MAT}AMARAL 90  790  10  32/AMARAL 790_BaseColor.webp`,
      normal: `${MAT}AMARAL 90  790  10  32/790_Normal.webp`,
    },
    {
      name: "AMARAL 10",
      diffuse: `${MAT}AMARAL 90  790  10  32/AMARAL 10_BaseColor.webp`,
      normal: `${MAT}AMARAL 90  790  10  32/10_Normal.webp`,
    },
    {
      name: "AMARAL 32",
      diffuse: `${MAT}AMARAL 90  790  10  32/AMARAL 32_BaseColor.webp`,
      normal: `${MAT}AMARAL 90  790  10  32/32_Normal.webp`,
    },
  ],
  cremona: [
    {
      name: "CREMONA 02",
      diffuse: `${MAT}CREMONA 02  24  96  81  77  34/02_BaseColor.webp`,
      normal: `${MAT}CREMONA 02  24  96  81  77  34/02_Normal.webp`,
    },
    {
      name: "CREMONA 24",
      diffuse: `${MAT}CREMONA 02  24  96  81  77  34/24_BaseColor.webp`,
      normal: `${MAT}CREMONA 02  24  96  81  77  34/24_Normal.webp`,
    },
    {
      name: "CREMONA 96",
      diffuse: `${MAT}CREMONA 02  24  96  81  77  34/96_BaseColor.webp`,
      normal: `${MAT}CREMONA 02  24  96  81  77  34/96_Normal.webp`,
    },
    {
      name: "CREMONA 81",
      diffuse: `${MAT}CREMONA 02  24  96  81  77  34/81_BaseColor.webp`,
      normal: `${MAT}CREMONA 02  24  96  81  77  34/81_Normal.webp`,
    },
    {
      name: "CREMONA 77",
      diffuse: `${MAT}CREMONA 02  24  96  81  77  34/77_BaseColor.webp`,
      normal: `${MAT}CREMONA 02  24  96  81  77  34/77_Normal.webp`,
    },
    {
      name: "CREMONA 34",
      diffuse: `${MAT}CREMONA 02  24  96  81  77  34/34_BaseColor.webp`,
      normal: `${MAT}CREMONA 02  24  96  81  77  34/34_Normal.webp`,
    },
  ],
  otaru: [
    {
      name: "OTARU 02",
      diffuse: `${MAT}OTARU 02 27 300 605 611 612 615/02_BaseColor.webp`,
      normal: `${MAT}OTARU 02 27 300 605 611 612 615/Otaru_Normal.webp`,
    },
    {
      name: "OTARU 27",
      diffuse: `${MAT}OTARU 02 27 300 605 611 612 615/27_BaseColor.webp`,
      normal: `${MAT}OTARU 02 27 300 605 611 612 615/Otaru_Normal.webp`,
    },
    {
      name: "OTARU 300",
      diffuse: `${MAT}OTARU 02 27 300 605 611 612 615/300_BaseColor.webp`,
      normal: `${MAT}OTARU 02 27 300 605 611 612 615/Otaru_Normal.webp`,
    },
    {
      name: "OTARU 605",
      diffuse: `${MAT}OTARU 02 27 300 605 611 612 615/605_BaseColor.webp`,
      normal: `${MAT}OTARU 02 27 300 605 611 612 615/Otaru_Normal.webp`,
    },
    {
      name: "OTARU 611",
      diffuse: `${MAT}OTARU 02 27 300 605 611 612 615/611_BaseColor.webp`,
      normal: `${MAT}OTARU 02 27 300 605 611 612 615/Otaru_Normal.webp`,
    },
    {
      name: "OTARU 612",
      diffuse: `${MAT}OTARU 02 27 300 605 611 612 615/612_BaseColor.webp`,
      normal: `${MAT}OTARU 02 27 300 605 611 612 615/Otaru_Normal.webp`,
    },
    {
      name: "OTARU 615",
      diffuse: `${MAT}OTARU 02 27 300 605 611 612 615/615_BaseColor.webp`,
      normal: `${MAT}OTARU 02 27 300 605 611 612 615/Otaru_Normal.webp`,
    },
  ],
  ilias: [
    {
      name: "ILIAS 13",
      diffuse: `${MAT}ILIAS 13  18  06/13_BaseColor.webp`,
      normal: `${MAT}ILIAS 13  18  06/13_Normal.webp`,
    },
    {
      name: "ILIAS 18",
      diffuse: `${MAT}ILIAS 13  18  06/18_BaseColor.webp`,
      normal: `${MAT}ILIAS 13  18  06/18_Normal.webp`,
    },
    {
      name: "ILIAS 06",
      diffuse: `${MAT}ILIAS 13  18  06/06_BaseColor.webp`,
      normal: `${MAT}ILIAS 13  18  06/06_Normal.webp`,
    },
  ],
  indiana: [
    {
      name: "INDIANA 1",
      diffuse: `${MAT}INDIANA 1  6  9  12  15  17  21  22/1_BaseColor.webp`,
      normal: `${MAT}INDIANA 1  6  9  12  15  17  21  22/1_Normal.webp`,
    },
    {
      name: "INDIANA 6",
      diffuse: `${MAT}INDIANA 1  6  9  12  15  17  21  22/6_BaseColor.webp`,
      normal: `${MAT}INDIANA 1  6  9  12  15  17  21  22/6_Normal.webp`,
    },
    {
      name: "INDIANA 9",
      diffuse: `${MAT}INDIANA 1  6  9  12  15  17  21  22/9_BaseColor.webp`,
      normal: `${MAT}INDIANA 1  6  9  12  15  17  21  22/9_Normal.webp`,
    },
    {
      name: "INDIANA 12",
      diffuse: `${MAT}INDIANA 1  6  9  12  15  17  21  22/12_BaseColor.webp`,
      normal: `${MAT}INDIANA 1  6  9  12  15  17  21  22/12_Normal.webp`,
    },
    {
      name: "INDIANA 15",
      diffuse: `${MAT}INDIANA 1  6  9  12  15  17  21  22/15_BaseColor.webp`,
      normal: `${MAT}INDIANA 1  6  9  12  15  17  21  22/15_Normal.webp`,
    },
    {
      name: "INDIANA 17",
      diffuse: `${MAT}INDIANA 1  6  9  12  15  17  21  22/17_BaseColor.webp`,
      normal: `${MAT}INDIANA 1  6  9  12  15  17  21  22/17_Normal.webp`,
    },
    {
      name: "INDIANA 21",
      diffuse: `${MAT}INDIANA 1  6  9  12  15  17  21  22/21_BaseColor.webp`,
      normal: `${MAT}INDIANA 1  6  9  12  15  17  21  22/21_Normal.webp`,
    },
    {
      name: "INDIANA 22",
      diffuse: `${MAT}INDIANA 1  6  9  12  15  17  21  22/22_BaseColor.webp`,
      normal: `${MAT}INDIANA 1  6  9  12  15  17  21  22/22_Normal.webp`,
    },
  ],
  madras: [
    {
      name: "MADRAS 230",
      diffuse: `${MAT}MADRAS 230 310 220/230_BaseColor.webp`,
      normal: `${MAT}MADRAS 230 310 220/230_Normal.webp`,
    },
    {
      name: "MADRAS 310",
      diffuse: `${MAT}MADRAS 230 310 220/310_BaseColor.webp`,
      normal: `${MAT}MADRAS 230 310 220/310_Normal.webp`,
    },
    {
      name: "MADRAS 220",
      diffuse: `${MAT}MADRAS 230 310 220/220_BaseColor.webp`,
      normal: `${MAT}MADRAS 230 310 220/220_Normal.webp`,
    },
  ],
  ness: [
    {
      name: "NESS 09",
      diffuse: `${MAT}NESS 15  09  25  56  96/09 ness_BaseColor.webp`,
      normal: `${MAT}NESS 15  09  25  56  96/09  ness_Normal.webp`,
    },
    {
      name: "NESS 15",
      diffuse: `${MAT}NESS 15  09  25  56  96/15 ness_BaseColor.webp`,
      normal: `${MAT}NESS 15  09  25  56  96/Ness_Normal.webp`,
    },
    {
      name: "NESS 25",
      diffuse: `${MAT}NESS 15  09  25  56  96/25 ness_BaseColor.webp`,
      normal: `${MAT}NESS 15  09  25  56  96/Ness_Normal.webp`,
    },
    {
      name: "NESS 56",
      diffuse: `${MAT}NESS 15  09  25  56  96/56 ness_BaseColor.webp`,
      normal: `${MAT}NESS 15  09  25  56  96/Ness_Normal.webp`,
    },
    {
      name: "NESS 96",
      diffuse: `${MAT}NESS 15  09  25  56  96/96 ness_BaseColor.webp`,
      normal: `${MAT}NESS 15  09  25  56  96/Ness_Normal.webp`,
    },
  ],
  noma: [
    {
      name: "NOMA 26",
      diffuse: `${MAT}NOMA 26  55  97  29  05/26_BaseColor.webp`,
      normal: `${MAT}NOMA 26  55  97  29  05/26_Normal.webp`,
    },
    {
      name: "NOMA 55",
      diffuse: `${MAT}NOMA 26  55  97  29  05/55_BaseColor.webp`,
      normal: `${MAT}NOMA 26  55  97  29  05/55_Normal.webp`,
    },
    {
      name: "NOMA 97",
      diffuse: `${MAT}NOMA 26  55  97  29  05/97_BaseColor.webp`,
      normal: `${MAT}NOMA 26  55  97  29  05/97_Normal.webp`,
    },
    {
      name: "NOMA 29",
      diffuse: `${MAT}NOMA 26  55  97  29  05/29_BaseColor.webp`,
      normal: `${MAT}NOMA 26  55  97  29  05/29_Normal.webp`,
    },
    {
      name: "NOMA 05",
      diffuse: `${MAT}NOMA 26  55  97  29  05/05_BaseColor.webp`,
      normal: `${MAT}NOMA 26  55  97  29  05/05_Normal.webp`,
    },
  ],
  pegaso: [
    {
      name: "PEGASO 2450",
      diffuse: `${MAT}PEGASO 2840 2450 2960/2450_BaseColor.webp`,
      normal: `${MAT}PEGASO 2840 2450 2960/2450_Normal.webp`,
    },
    {
      name: "PEGASO 2840",
      diffuse: `${MAT}PEGASO 2840 2450 2960/2840_BaseColor.webp`,
      normal: `${MAT}PEGASO 2840 2450 2960/2840_Normal.webp`,
    },
    {
      name: "PEGASO 2960",
      diffuse: `${MAT}PEGASO 2840 2450 2960/2960_BaseColor.webp`,
      normal: `${MAT}PEGASO 2840 2450 2960/2960_Normal.webp`,
    },
  ],
  puente: [
    {
      name: "PUENTE 15",
      diffuse: `${MAT}PUENTE 15  56  33  06  29/15_BaseColor.webp`,
      normal: `${MAT}PUENTE 15  56  33  06  29/15_Normal.webp`,
    },
    {
      name: "PUENTE 56",
      diffuse: `${MAT}PUENTE 15  56  33  06  29/56_BaseColor.webp`,
      normal: `${MAT}PUENTE 15  56  33  06  29/56_Normal.webp`,
    },
    {
      name: "PUENTE 33",
      diffuse: `${MAT}PUENTE 15  56  33  06  29/33_BaseColor.webp`,
      normal: `${MAT}PUENTE 15  56  33  06  29/33_Normal.webp`,
    },
    {
      name: "PUENTE 06",
      diffuse: `${MAT}PUENTE 15  56  33  06  29/06_BaseColor.webp`,
      normal: `${MAT}PUENTE 15  56  33  06  29/06_Normal.webp`,
    },
    {
      name: "PUENTE 29",
      diffuse: `${MAT}PUENTE 15  56  33  06  29/29_BaseColor.webp`,
      normal: `${MAT}PUENTE 15  56  33  06  29/29_Normal.webp`,
    },
  ],
};

// Texture variant helpers. The paths above point at the original 2048px
// BaseColor/Normal maps. At build-prep time we generate sibling files:
//   *_1k.webp    — 1024px, used on the 3D model. The model tiles each texture
//                  16-20x (see uvScale), so 1K is more on-surface detail than
//                  any screen can resolve.
//   *_thumb.webp — 256px, used for the swatch grid in the materials panel.
// The original 2K diffuse is loaded only for the large modal preview, where
// fabric quality is actually inspected (one image at a time, on demand).
export const lowResUrl = (tex: string): string =>
  tex.replace(/\.webp$/, "_1k.webp");
export const thumbUrl = (diffuse: string): string =>
  diffuse.replace(/\.webp$/, "_thumb.webp");

export const MaterialProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [objects, setObjects] = useState<SceneObject[]>(
    () => loadSession<SceneObject[]>("mat_objects", []),
  );
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${BASE}material-pbr-defaults.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json: Record<string, Partial<PbrSettings>> | null) => {
        if (json) Object.assign(pbrOverrides, json);
      })
      .catch(() => {
        // No file → use hardcoded defaults. Silent fallback intentional.
      });
  }, []);

  useEffect(() => saveSession("mat_objects", objects), [objects]);
  const [uvScale, setUvScale] = useState(15.4);
  const [normalScale, setNormalScale] = useState(1.15);
  const [metalness, setMetalness] = useState(0.0);
  const [roughness, setRoughness] = useState(0.87);
  const [sheen, setSheen] = useState(0.04);
  const [sheenRoughness, setSheenRoughness] = useState(0.8);
  const [envMapIntensity, setEnvMapIntensity] = useState(0.15);
  const [aoMapIntensity, setAoMapIntensity] = useState(0.7);

  // Legacy support - get material of selected object
  const currentMaterial = selectedObjectId
    ? objects.find((obj) => obj.id === selectedObjectId)?.material ||
      availableMaterials.cremona[0]
    : availableMaterials.cremona[0];

  const setCurrentMaterial = (material: MaterialDefinition) => {
    if (selectedObjectId) {
      setObjectMaterial(selectedObjectId, material);
    }
  };

  const addObject = (object: SceneObject) => {
    setObjects((prev) => {
      if (prev.some((o) => o.id === object.id)) return prev;
      return [
        ...prev,
        { ...object, pbr: object.pbr ?? defaultPbrForMaterial(object.material.name) },
      ];
    });
  };

  const removeObject = (id: string) => {
    setObjects((prev) => prev.filter((obj) => obj.id !== id));
    if (selectedObjectId === id) {
      setSelectedObjectId(null);
    }
  };

  const clearObjects = () => {
    sessionStorage.removeItem("mat_objects");
    setObjects([]);
    setSelectedObjectId(null);
  };

  const getObjectMaterial = (id: string): MaterialDefinition | undefined => {
    return objects.find((obj) => obj.id === id)?.material;
  };

  const setObjectMaterial = (id: string, material: MaterialDefinition) => {
    // Changing the fabric re-seeds this object's surface tuning from the new
    // material family's defaults, so each (module, material) pair gets the
    // look intended for that fabric.
    setObjects((prev) =>
      prev.map((obj) =>
        obj.id === id
          ? { ...obj, material, pbr: defaultPbrForMaterial(material.name) }
          : obj,
      ),
    );
  };

  const getObjectPbr = (id: string): PbrSettings => {
    const obj = objects.find((o) => o.id === id);
    return obj?.pbr ?? defaultPbrForMaterial(obj?.material.name ?? "");
  };

  const setObjectPbr = (id: string, patch: Partial<PbrSettings>) => {
    setObjects((prev) =>
      prev.map((obj) =>
        obj.id === id
          ? {
              ...obj,
              pbr: {
                ...(obj.pbr ?? defaultPbrForMaterial(obj.material.name)),
                ...patch,
              },
            }
          : obj,
      ),
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
        clearObjects,
        getObjectMaterial,
        setObjectMaterial,
        getObjectPbr,
        setObjectPbr,
        uvScale,
        setUvScale,
        normalScale,
        setNormalScale,
        metalness,
        setMetalness,
        roughness,
        setRoughness,
        sheen,
        setSheen,
        sheenRoughness,
        setSheenRoughness,
        envMapIntensity,
        setEnvMapIntensity,
        aoMapIntensity,
        setAoMapIntensity,
      }}
    >
      {children}
    </MaterialContext.Provider>
  );
};

export const MATERIAL_PBR_DEFAULTS: Record<
  keyof MaterialLibrary,
  {
    uvScale: number;
    normalScale: number;
    roughness: number;
    metalness?: number;
    sheen: number;
    sheenRoughness: number;
    envMapIntensity: number;
  }
> = {
  amaral: {
    uvScale: 18.0,
    normalScale: 1.55,
    roughness: 1,
    metalness: 1,
    sheen: 0.04,
    sheenRoughness: 0.87,
    envMapIntensity: 0.15,
  },
  cremona: {
    uvScale: 18.9,
    normalScale: 1.35,
    roughness: 0.93,
    metalness: 1,
    sheen: 0.05,
    sheenRoughness: 0.93,
    envMapIntensity: 0.15,
  },
  otaru: {
    uvScale: 18.2,
    normalScale: 1.55,
    roughness: 0.98,
    metalness: 0.98,
    sheen: 0.04,
    sheenRoughness: 0.9,
    envMapIntensity: 0.1,
  },
  ilias: {
    uvScale: 20.0,
    normalScale: 1.35,
    roughness: 0.91,
    metalness: 1,
    sheen: 0.04,
    sheenRoughness: 0.9,
    envMapIntensity: 0.1,
  },
  indiana: {
    uvScale: 16.0,
    normalScale: 0.8,
    roughness: 0.94,
    metalness: 0.97,
    sheen: 0.03,
    sheenRoughness: 0.8,
    envMapIntensity: 0.15,
  },
  madras: {
    uvScale: 16.3,
    normalScale: 0.4,
    roughness: 0.91,
    sheen: 0.05,
    sheenRoughness: 0.9,
    envMapIntensity: 0.1,
  },
  ness: {
    uvScale: 18.7,
    normalScale: 1.75,
    roughness: 1,
    metalness: 1,
    sheen: 0,
    sheenRoughness: 1,
    envMapIntensity: 0.07,
  },
  noma: {
    uvScale: 18.4,
    normalScale: 0.55,
    roughness: 0.91,
    sheen: 0.04,
    sheenRoughness: 0.8,
    envMapIntensity: 0.15,
  },
  pegaso: {
    uvScale: 19.9,
    normalScale: 0.2,
    roughness: 0.91,
    sheen: 0.05,
    sheenRoughness: 0.9,
    envMapIntensity: 0.1,
  },
  puente: {
    uvScale: 16.8,
    normalScale: 0.045,
    roughness: 0.87,
    sheen: 0.04,
    sheenRoughness: 0.8,
    envMapIntensity: 0.15,
  },
};

export function getMaterialFamily(
  materialName: string,
): keyof MaterialLibrary | null {
  const lower = materialName.toLowerCase();
  const families = Object.keys(availableMaterials) as (keyof MaterialLibrary)[];
  return families.find((f) => lower.startsWith(f)) ?? null;
}

// aoMapIntensity isn't material-family specific, so it has no per-family entry;
// every object starts from this uniform default.
const DEFAULT_AO_MAP_INTENSITY = 0.7;

// Module-level — survives React remounts, never triggers re-renders.
// Keys are either exact material names ("NESS 15") or family names ("ness").
// Populated at startup from public/material-pbr-defaults.json.
let pbrOverrides: Record<string, Partial<PbrSettings>> = {};

/** Store the current PBR as the default for a specific material shade or family.
 *  Call this from the Leva "Set as Shade Default" button. */
export function setPbrDefault(materialName: string, pbr: PbrSettings): void {
  pbrOverrides[materialName] = { ...pbr };
}

/** Download the merged defaults (hardcoded family values + all runtime overrides)
 *  as material-pbr-defaults.json. Drop this file in /public on the server. */
export function exportPbrDefaults(): void {
  const output: Record<string, Partial<PbrSettings>> = {};

  // Seed with hardcoded family defaults (includes aoMapIntensity)
  for (const [family, d] of Object.entries(MATERIAL_PBR_DEFAULTS) as [
    keyof MaterialLibrary,
    (typeof MATERIAL_PBR_DEFAULTS)[keyof MaterialLibrary],
  ][]) {
    output[family] = {
      uvScale: d.uvScale,
      normalScale: d.normalScale,
      metalness: d.metalness ?? 0,
      roughness: d.roughness,
      sheen: d.sheen,
      sheenRoughness: d.sheenRoughness,
      envMapIntensity: d.envMapIntensity,
      aoMapIntensity: DEFAULT_AO_MAP_INTENSITY,
    };
  }

  // Shade-level or family-level overrides set at runtime win
  Object.assign(output, pbrOverrides);

  const json = JSON.stringify(output, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "material-pbr-defaults.json";
  a.click();
  URL.revokeObjectURL(url);
}

/** Build a fresh PBR settings object for a material.
 *  Lookup order: exact shade override → family override → hardcoded family default. */
export function defaultPbrForMaterial(materialName: string): PbrSettings {
  const family = getMaterialFamily(materialName) ?? "amaral";
  const hardcoded = MATERIAL_PBR_DEFAULTS[family];

  // Exact shade name wins over family name wins over hardcoded
  const override = pbrOverrides[materialName] ?? pbrOverrides[family] ?? {};

  return {
    uvScale: override.uvScale ?? hardcoded.uvScale,
    normalScale: override.normalScale ?? hardcoded.normalScale,
    metalness: override.metalness ?? hardcoded.metalness ?? 0,
    roughness: override.roughness ?? hardcoded.roughness,
    sheen: override.sheen ?? hardcoded.sheen,
    sheenRoughness: override.sheenRoughness ?? hardcoded.sheenRoughness,
    envMapIntensity: override.envMapIntensity ?? hardcoded.envMapIntensity,
    aoMapIntensity: override.aoMapIntensity ?? DEFAULT_AO_MAP_INTENSITY,
  };
}

export const useMaterial = () => {
  const context = useContext(MaterialContext);
  if (!context) {
    throw new Error("useMaterial must be used within a MaterialProvider");
  }
  return context;
};
