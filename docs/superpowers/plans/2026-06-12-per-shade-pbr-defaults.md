# Per-Shade PBR Defaults with Manager Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow per-shade PBR defaults (e.g. "NESS 15" different from "NESS 09"), loaded from a JSON file that managers can regenerate by tuning sliders in the Leva panel and clicking an Export button.

**Architecture:** A module-level `pbrOverrides` map in `MaterialContext.tsx` is seeded at startup by fetching `public/material-pbr-defaults.json` (404 = silently fall back to hardcoded). `defaultPbrForMaterial` checks exact shade name → family name → hardcoded `MATERIAL_PBR_DEFAULTS`. Two new Leva buttons (DEV-only) let a manager mark the current object's tuned PBR as the shade default and download the full merged JSON when done. Dropping that JSON at `public/material-pbr-defaults.json` on the server applies it to all users with no code deploy.

**Tech Stack:** React, TypeScript, Leva (already in project), native `fetch` + `Blob` download

---

## File Map

- **Create:** `public/material-pbr-defaults.json` — initial family-level defaults (mirrors current hardcoded values); managers extend this with shade-level keys
- **Modify:** `src/context/MaterialContext.tsx` — add `pbrOverrides` module-level map, fetch JSON on mount, update `defaultPbrForMaterial`, export `setPbrDefault` + `exportPbrDefaults`
- **Modify:** `src/components/Scene/index.tsx` — add two Leva buttons inside the existing Material folder

---

### Task 1: Create `public/material-pbr-defaults.json`

**Files:**
- Create: `public/material-pbr-defaults.json`

The file uses family names as keys. Shade-level entries (e.g. `"NESS 15"`) can be added manually or via the Export button built in Task 3. Values here mirror the current hardcoded `MATERIAL_PBR_DEFAULTS` exactly — so before any manager tuning, behaviour is unchanged.

- [ ] **Step 1: Create the file**

Write `public/material-pbr-defaults.json` with this exact content:

```json
{
  "amaral": {
    "uvScale": 18.0,
    "normalScale": 1.55,
    "roughness": 1,
    "metalness": 1,
    "sheen": 0.04,
    "sheenRoughness": 0.87,
    "envMapIntensity": 0.15,
    "aoMapIntensity": 0.7
  },
  "cremona": {
    "uvScale": 18.9,
    "normalScale": 1.35,
    "roughness": 0.93,
    "metalness": 1,
    "sheen": 0.05,
    "sheenRoughness": 0.93,
    "envMapIntensity": 0.15,
    "aoMapIntensity": 0.7
  },
  "otaru": {
    "uvScale": 18.2,
    "normalScale": 1.55,
    "roughness": 0.98,
    "metalness": 0.98,
    "sheen": 0.04,
    "sheenRoughness": 0.9,
    "envMapIntensity": 0.1,
    "aoMapIntensity": 0.7
  },
  "ilias": {
    "uvScale": 20.0,
    "normalScale": 1.35,
    "roughness": 0.91,
    "metalness": 1,
    "sheen": 0.04,
    "sheenRoughness": 0.9,
    "envMapIntensity": 0.1,
    "aoMapIntensity": 0.7
  },
  "indiana": {
    "uvScale": 16.0,
    "normalScale": 0.8,
    "roughness": 0.94,
    "metalness": 0.97,
    "sheen": 0.03,
    "sheenRoughness": 0.8,
    "envMapIntensity": 0.15,
    "aoMapIntensity": 0.7
  },
  "madras": {
    "uvScale": 16.3,
    "normalScale": 0.4,
    "roughness": 0.91,
    "metalness": 0,
    "sheen": 0.05,
    "sheenRoughness": 0.9,
    "envMapIntensity": 0.1,
    "aoMapIntensity": 0.7
  },
  "ness": {
    "uvScale": 18.7,
    "normalScale": 1.75,
    "roughness": 1,
    "metalness": 1,
    "sheen": 0,
    "sheenRoughness": 1,
    "envMapIntensity": 0.07,
    "aoMapIntensity": 0.7
  },
  "noma": {
    "uvScale": 18.4,
    "normalScale": 0.55,
    "roughness": 0.91,
    "metalness": 0,
    "sheen": 0.04,
    "sheenRoughness": 0.8,
    "envMapIntensity": 0.15,
    "aoMapIntensity": 0.7
  },
  "pegaso": {
    "uvScale": 19.9,
    "normalScale": 0.2,
    "roughness": 0.91,
    "metalness": 0,
    "sheen": 0.05,
    "sheenRoughness": 0.9,
    "envMapIntensity": 0.1,
    "aoMapIntensity": 0.7
  },
  "puente": {
    "uvScale": 16.8,
    "normalScale": 0.045,
    "roughness": 0.87,
    "metalness": 0,
    "sheen": 0.04,
    "sheenRoughness": 0.8,
    "envMapIntensity": 0.15,
    "aoMapIntensity": 0.7
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add public/material-pbr-defaults.json
git commit -m "feat: add material-pbr-defaults.json with initial family-level defaults"
```

---

### Task 2: Add shade-level override support to MaterialContext

**Files:**
- Modify: `src/context/MaterialContext.tsx`

This task adds three things:
1. A module-level `pbrOverrides` map (persists across remounts, doesn't trigger re-renders)
2. `MaterialProvider` fetches `material-pbr-defaults.json` on mount and merges it into `pbrOverrides`
3. `defaultPbrForMaterial` checks `pbrOverrides[exactName]` → `pbrOverrides[familyName]` → hardcoded
4. Two exported functions: `setPbrDefault` and `exportPbrDefaults`

The JSON keys are either exact material names (`"NESS 15"`) or family names (`"ness"`). Values are `Partial<PbrSettings>` — only fields that differ from the hardcoded family default need to be present.

- [ ] **Step 1: Add `pbrOverrides` module-level map and the two exported utility functions**

After the `MATERIAL_PBR_DEFAULTS` block (around line 609) and before `getMaterialFamily`, add:

```ts
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
```

- [ ] **Step 2: Update `defaultPbrForMaterial` to consult `pbrOverrides`**

Replace the existing `defaultPbrForMaterial` function (around line 624) with:

```ts
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
```

- [ ] **Step 3: Fetch `material-pbr-defaults.json` on mount in `MaterialProvider`**

Inside `MaterialProvider`, add a `useEffect` directly after the `useState` declarations (before the existing `useEffect(() => saveSession(...))` line). The `BASE` constant is already available at the top of the file:

```ts
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
```

- [ ] **Step 4: Verify TypeScript compiles cleanly**

```bash
cd /Users/tommydi/Personal/configurator
npx tsc --noEmit
```

Expected: no errors related to `pbrOverrides`, `setPbrDefault`, `exportPbrDefaults`, or `defaultPbrForMaterial`. Fix any type errors before continuing.

- [ ] **Step 5: Commit**

```bash
git add src/context/MaterialContext.tsx
git commit -m "feat: add per-shade PBR override support with JSON fetch and export"
```

---

### Task 3: Add Leva buttons for "Set as Shade Default" and "Export PBR JSON"

**Files:**
- Modify: `src/components/Scene/index.tsx`

The Leva panel is already gated behind `import.meta.env.DEV` (line ~1685). The buttons go inside the existing `Material` folder in `matControls`. Because Leva button callbacks are captured at mount, we need a ref that stays current — standard pattern for Leva + React state.

- [ ] **Step 1: Add import for `setPbrDefault` and `exportPbrDefaults`**

At the top of `src/components/Scene/index.tsx`, find the import from `../../context/MaterialContext` and add the two new exports:

```ts
// Find the existing import line and add setPbrDefault and exportPbrDefaults:
import {
  // ... existing named imports ...
  setPbrDefault,
  exportPbrDefaults,
} from "../../context/MaterialContext";
```

Also add `button` to the leva import if it isn't already there. The existing leva import is at line 9:

```ts
import { useControls, folder, Leva, button } from "leva";
```

(`button` may already be imported — check first; add only if missing.)

- [ ] **Step 2: Add a stable-ref for button callbacks**

Leva button callbacks close over the mount-time scope. We use a single ref object that we keep current on every render so button handlers always see the latest values.

Add this block right before the `useControls(() => ({ Material: folder(...)  }))` call (around line 1470):

```ts
const pbrActionRef = useRef<{
  selectedObjectId: string | null;
  getObjectMaterial: typeof getObjectMaterial;
  getObjectPbr: typeof getObjectPbr;
}>({ selectedObjectId: null, getObjectMaterial, getObjectPbr });

// Keep ref current on every render — no dep array, intentional
useEffect(() => {
  pbrActionRef.current = { selectedObjectId, getObjectMaterial, getObjectPbr };
});
```

- [ ] **Step 3: Add buttons to the Material folder in `useControls`**

Inside the existing `useControls(() => ({ Material: folder({ ... }, { collapsed: true }) }))` call, append two button entries after `aoMapIntensity`:

```ts
const [matControls, setMatControls] = useControls(() => ({
  Material: folder(
    {
      uvScale: { value: 15.4, min: 0.1, max: 25, step: 0.1 },
      normalStrength: {
        value: 1.15,
        min: 0,
        max: 2,
        step: 0.05,
        label: "Normal Strength",
      },
      metalness: { value: 0.0, min: 0, max: 1, step: 0.01 },
      roughness: { value: 0.87, min: 0, max: 1, step: 0.01 },
      sheen: { value: 0.04, min: 0, max: 1, step: 0.01 },
      sheenRoughness: {
        value: 0.8,
        min: 0,
        max: 1,
        step: 0.01,
        label: "Sheen Roughness",
      },
      envMapIntensity: {
        value: 0.15,
        min: 0,
        max: 2,
        step: 0.01,
        label: "Env Map",
      },
      aoMapIntensity: {
        value: 0.53,
        min: 0,
        max: 2,
        step: 0.01,
        label: "AO Intensity",
      },
      // ─── PBR default management (DEV only) ───────────────────────
      setShadeDefault: button(
        () => {
          const { selectedObjectId: id, getObjectMaterial: getMat, getObjectPbr: getPbr } =
            pbrActionRef.current;
          if (!id) return;
          const mat = getMat(id);
          if (!mat) return;
          setPbrDefault(mat.name, getPbr(id));
          console.info(`[PBR] Set default for "${mat.name}"`);
        },
        { label: "★ Set as Shade Default" },
      ),
      exportJson: button(
        () => {
          exportPbrDefaults();
        },
        { label: "⬇ Export PBR JSON" },
      ),
    },
    { collapsed: true },
  ),
}));
```

- [ ] **Step 4: Verify TypeScript compiles cleanly**

```bash
cd /Users/tommydi/Personal/configurator
npx tsc --noEmit
```

Expected: no errors. If `button` was not previously imported from leva, add it now.

- [ ] **Step 5: Commit**

```bash
git add src/components/Scene/index.tsx
git commit -m "feat: add Set as Shade Default and Export PBR JSON Leva buttons"
```

---

### Task 4: Manual smoke-test (DEV mode)

No automated tests exist in this project. Verify the feature end-to-end manually.

- [ ] **Step 1: Start the dev server**

```bash
cd /Users/tommydi/Personal/configurator
npm run dev
```

- [ ] **Step 2: Verify JSON loads on startup**

Open browser DevTools → Network tab → filter for `material-pbr-defaults.json`. Confirm a 200 response with the family defaults. Open Console — no errors.

- [ ] **Step 3: Verify family-level defaults are unchanged**

Add any module to the scene. Select it. Open the Leva panel → Material folder. Confirm slider values match the family's entry in `MATERIAL_PBR_DEFAULTS` (e.g. for a NESS material, `uvScale` should be `18.7`).

- [ ] **Step 4: Test "Set as Shade Default"**

With a NESS material selected, change `uvScale` to `19.5` in Leva. Click "★ Set as Shade Default". Check Console — should print `[PBR] Set default for "NESS 15"` (or whichever shade is active). Remove the object from the scene, add a new one, apply the same NESS shade → confirm `uvScale` loads as `19.5`.

- [ ] **Step 5: Test "Export PBR JSON"**

Click "⬇ Export PBR JSON". A file `material-pbr-defaults.json` should download. Open it — confirm it contains all family keys plus `"NESS 15": { "uvScale": 19.5, ... }` (or whichever shade was set). Confirm all `metalness` values are present (including the ones that were `undefined` in hardcoded, now `0`).

- [ ] **Step 6: Test the full round-trip**

Copy the downloaded file to `public/material-pbr-defaults.json` (overwrite). Hard-reload the browser. Add a NESS 15 module → confirm `uvScale` is `19.5`. Add a different NESS shade (e.g. NESS 09) → confirm it uses the family default (`18.7`), not the NESS 15 override.

- [ ] **Step 7: Test 404 graceful fallback**

Temporarily rename `public/material-pbr-defaults.json` to `public/material-pbr-defaults.json.bak`. Reload. Confirm no console errors, and all PBR values match the hardcoded `MATERIAL_PBR_DEFAULTS`. Rename the file back.
