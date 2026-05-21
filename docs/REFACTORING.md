# Refactoring Roadmap

This document describes the phased refactoring plan to make the configurator scalable and ready for an upcoming redesign. Each phase keeps the app fully functional throughout — no big-bang rewrites.

---

## Why Now

The codebase has several structural issues that will compound during a redesign:

- A 466-line `ClickHandler` component containing selection, drag, and snap logic — impossible to test or modify safely
- 170 lines of snap distance if/else branches with magic numbers coupled to module ID string names
- Object positions/rotations tracked by array index (desync risk on delete)
- The brand color `#06402b` hardcoded in 51+ places
- `extractBaseModuleId` duplicated in two files
- Leva debug controls always visible in production

These are fixed in phases, from low-risk wins to high-value structural work.

---

## Phase Sequencing

```
Phase 0 — Shared Utilities        (prerequisite for all later phases)
Phase 1 — Design Tokens           (safe anytime, high redesign leverage)
Phase 2 — Stable Object IDs       (prerequisite for Phase 3)
Phase 3 — Split ClickHandler      (highest value, highest effort)
Phase 4 — Harden DynamicModel     (parallelizable with Phase 3)
Phase 5 — Gate Leva in Dev Only   (safe anytime)
Phase 6 — Externalize Data        (after redesign ships)
```

Phases 0, 1, and 5 can be done in any order immediately. Phase 2 must precede Phase 3. Phase 4 can be done in parallel with Phase 3 by a second developer (different files).

---

## Phase 0 — Shared Utilities

**Size:** Small (~0.5 days)  
**Goal:** Eliminate the duplicated `extractBaseModuleId` logic before any other phase touches IDs.

### What to do

Create **`src/utils/moduleId.ts`** with two named exports:

```ts
// Strip the "-counter-timestamp-random" suffix from a module instance ID
export function extractBaseModuleId(instanceId: string): string { ... }

// Generate a new unique instance ID for a module
export function generateInstanceId(baseId: string, counter: number): string {
  return `${baseId}-${counter}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}
```

### Files to change

| File                                                  | Change                                                                                          |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `src/utils/moduleId.ts`                               | Create — canonical implementation                                                               |
| `src/context/ConfiguratorContext.tsx`                 | Remove inline `extractBaseModuleId` closure inside `getModuleSnappingConfig`; import from utils |
| `src/components/DynamicModel/index.tsx`               | Remove local `extractBaseModuleId` function; import from utils                                  |
| `src/components/Configurator/ModuleSelectionStep.tsx` | Replace inline ID generation string with `generateInstanceId()`                                 |

### Verification

`npm run build` passes. Add a module to the scene, change its material, delete it — all should work as before.

---

## Phase 1 — Design Tokens

**Size:** Small (~0.5 days)  
**Goal:** Define the brand color token so the redesign can change it in one place.

### What to do

1. Add to `tailwind.config.js`:

```js
theme: {
  extend: {
    colors: {
      brand: {
        DEFAULT: '#06402b',
      }
    }
  }
}
```

2. Add to `src/index.css`:

```css
:root {
  --color-brand: #06402b;
}
```

**Do not replace existing hardcoded occurrences yet.** Replace them component-by-component as part of redesign work, so each PR is reviewable in isolation.

### Files to change

| File                 | Change                           |
| -------------------- | -------------------------------- |
| `tailwind.config.js` | Add `brand` color to theme       |
| `src/index.css`      | Add `--color-brand` CSS variable |

### Verification

`npm run build` passes. Visual appearance is unchanged (no occurrences replaced yet).

---

## Phase 2 — Stable Object ID System

**Size:** Medium (~1–2 days)  
**Goal:** Replace index-based position/rotation tracking with stable ID-based tracking, eliminating the desync risk on object deletion.

### Current problem

`objectPositions` and `objectRotations` are `Map<number, [x,y,z]>` keyed by array index. When object at index 2 is deleted, indices 3, 4, 5… shift down. `removeObjectByIndex` manually re-indexes the maps. Any read of these maps that happens out of sync with the render loop risks using a stale index.

### What to do

**Add a new type:**

```ts
interface SceneInstance {
  instanceId: string; // the full encoded ID (e.g. "sofa part left-0-1715000-abc")
  moduleId: string; // the base module ID (e.g. "sofa part left")
}
```

**Change in `ConfiguratorContext`:**

- `sceneObjects: string[]` → `sceneObjects: SceneInstance[]`
- `objectPositions: Map<number, …>` → `objectPositions: Map<string, …>` (keyed by `instanceId`)
- `objectRotations: Map<number, …>` → `objectRotations: Map<string, …>` (keyed by `instanceId`)
- `removeObjectByIndex(index)` → `removeObjectById(instanceId: string)` (no index-shift logic needed)
- `addModulesToScene` populates `instanceId` and `moduleId` from `generateInstanceId` (Phase 0)

**Update consumers:**

- `Scene/index.tsx` — `SceneObjects` render loop uses `instance.instanceId` as React key; passes `instanceId` and `moduleId` as separate props to `DynamicModel`; `ClickHandler` drag/snap logic references instances by `instanceId`
- `DynamicModel/index.tsx` — receives `instanceId: string` and `moduleId: string` as props instead of the encoded `objectId`; no longer needs to call `extractBaseModuleId` on a prop

### Files to change

| File                                                  | Change                                                                     |
| ----------------------------------------------------- | -------------------------------------------------------------------------- |
| `src/context/ConfiguratorContext.tsx`                 | New `SceneInstance` type, Map keys to instanceId, remove index-shift logic |
| `src/components/Scene/index.tsx`                      | SceneObjects render, ClickHandler drag state, AutoCenterCamera             |
| `src/components/DynamicModel/index.tsx`               | Props: `instanceId` + `moduleId` instead of `objectId`                     |
| `src/components/Configurator/ModuleSelectionStep.tsx` | `addModulesToScene` call updated to new signature                          |

### Verification

`npm run build` passes. Add 4 modules, drag them around, delete the second one, verify remaining modules retain their positions and materials. Add more modules after deletion — indices must not collide.

---

## Phase 3 — Split ClickHandler + Data-Driven Snap

**Size:** Large (~2–3 days)  
**Goal:** Break the 466-line `ClickHandler` into testable units. Replace 12+ if/else snap distance branches with a data-driven lookup table.

### Current problem

`ClickHandler` in `Scene/index.tsx` (lines ~340–806) mixes three unrelated concerns:

1. Raycaster-based click-to-select
2. Mouse drag with plane intersection
3. Snap candidate search + distance calculation

The snap distance table uses float literals (`0.79`, `0.9`, `1.03`…) and detects module types by string matching on IDs (`includes('long')`, `includes('middle')`). Adding one new module type requires editing the logic itself.

### What to do

**Step 3a — Add `category` to `ModuleDefinition`:**

```ts
interface ModuleDefinition {
  // ... existing fields
  category: "standard" | "middle" | "long" | "expanded" | "wide" | "corner";
}
```

Populate `category` for all existing entries in `availableModules`. Remove all `includes('long')` / `includes('middle')` string checks from snap logic — use `module.category` instead.

**Step 3b — Create `src/data/snapDistances.ts`:**

A lookup table keyed by `${draggedCategory}:${targetCategory}` returning `{ xDist: number; zDist: number; zShift: number }`. Each entry documents the module dimensions it represents. The 12+ if/else branches in `ClickHandler` collapse to a single `snapDistances.get(key)` call.

**Step 3c — Create `src/hooks/useObjectSelection.ts`:**

Encapsulates:

- Raycaster setup and click-to-select logic
- Object ID extraction by traversing the scene graph
- Select/deselect state

Returns `{ selectedInstanceId, handleCanvasClick }`.

**Step 3d — Create `src/hooks/useDragAndSnap.ts`:**

Encapsulates:

- Mouse-to-world-space raycasting (drag plane intersection)
- Nearest snap candidate search using the `snapDistances` table
- Snap position calculation
- Drag state (`isDragging`, `draggedInstanceId`, `snapPreview`)

Accepts scene instance list and returns callbacks for the canvas mouse listeners.

**Step 3e — Reduce `ClickHandler` to coordinator:**

`ClickHandler` becomes a thin component (~60–80 lines) that attaches canvas event listeners and delegates to the two hooks.

### Files to change

| File                                  | Change                                                              |
| ------------------------------------- | ------------------------------------------------------------------- |
| `src/context/ConfiguratorContext.tsx` | Add `category` to `ModuleDefinition` type; populate for all entries |
| `src/data/snapDistances.ts`           | Create — snap distance lookup table                                 |
| `src/hooks/useObjectSelection.ts`     | Create — click-to-select logic                                      |
| `src/hooks/useDragAndSnap.ts`         | Create — drag + snap logic                                          |
| `src/components/Scene/index.tsx`      | Replace `ClickHandler` body with hook calls                         |

### Verification

`npm run build` passes. **Manually test every module pair combination for snap:**

- standard left + standard middle
- standard middle + standard right
- long left + long right
- long left + standard middle
- wide middle + standard left/right
- corner + any
- complete sets (no snap expected)

Snap positions must be identical before and after.

---

## Phase 4 — Harden DynamicModel

**Size:** Medium (~1 day)  
**Goal:** Remove hardcoded per-model UV scales and mesh-name material assignment. Replace the draw-call-doubling selection outline with a post-processing effect.

This phase can be done in parallel with Phase 3 by a second developer — it only touches `DynamicModel` and `ConfiguratorContext` type definitions, which Phase 3 does not modify.

### What to do

**Step 4a — UV scale per module definition:**

Add optional `uvScale?: number` to `ModuleDefinition` and `CompleteSetDefinition`. Set it for `sofa3.glb` (10.5) and the pillow (0.5). Remove the `if (modelPath.endsWith(...))` chain in `DynamicModel` — use `definition.uvScale ?? globalUvScale` instead.

**Step 4b — Material slot declaration:**

Add optional `preserveMeshNames?: string[]` to `ModuleDefinition`. When specified, these mesh names keep their original GLTF material instead of the custom PBR. For modules where it is not specified, fall back to the hardcoded default list (`table_top`, `lamp_and_usb`, etc.). This decouples the "which meshes are fabric" decision from the renderer.

**Step 4c — Post-processing selection outline:**

Replace the 1.02× clone selection outline with `@react-three/postprocessing` `<Outline>`. This library is already installed.

```tsx
// In Scene/index.tsx, inside <Canvas>:
<EffectComposer>
  <Outline selection={selectedMeshes} edgeStrength={5} />
</EffectComposer>
```

Selected meshes are collected by `DynamicModel` using R3F's `<Selection>` primitive. The 1.02× clone and the `THREE.BackSide` green material are removed from `DynamicModel`.

### Files to change

| File                                    | Change                                                                                  |
| --------------------------------------- | --------------------------------------------------------------------------------------- |
| `src/context/ConfiguratorContext.tsx`   | Add `uvScale?`, `preserveMeshNames?` to definition types; populate for affected modules |
| `src/components/DynamicModel/index.tsx` | Use definition fields; remove UV scale chain; remove outline clone                      |
| `src/components/Scene/index.tsx`        | Add `<EffectComposer><Outline /></EffectComposer>` inside Canvas                        |

### Verification

`npm run build` passes. Selection outline renders identically. With 5+ objects in scene, verify no visible performance regression. Confirm UV scaling on sofa3 and pillow still looks correct.

---

## Phase 5 — Gate Leva Behind DEV Flag

**Size:** Small (~0.5 days)  
**Goal:** Remove Leva from production bundles without losing the production-tuned lighting/camera defaults it currently holds.

### What to do

1. Create **`src/config/sceneDefaults.ts`** — export typed constants for all Leva-controlled values (camera position/fov/target, tone mapping, ambient/directional light, shadow params, environment preset, material PBR defaults). Copy the current `value:` defaults from each `useControls(...)` call.

2. In `Scene/index.tsx`, guard Leva render:

```tsx
{
  import.meta.env.DEV && <Leva collapsed />;
}
```

3. Guard `useControls` calls to return static defaults in production:

```ts
const lightingControls = import.meta.env.DEV
  ? useControls('Lighting', { ... })
  : sceneDefaults.lighting;
```

This requires extracting each `useControls` block into a dedicated sub-component so the hook call is at the top level of that component (React rules of hooks).

### Files to change

| File                             | Change                                                               |
| -------------------------------- | -------------------------------------------------------------------- |
| `src/config/sceneDefaults.ts`    | Create — production constant values                                  |
| `src/components/Scene/index.tsx` | Conditional Leva render; conditional `useControls` / static defaults |

### Verification

`npm run build`. Run the production preview (`npm run preview`). Verify Leva panel is absent. Verify lighting, shadows, and environment look identical to dev mode.

---

## Phase 6 — Externalize Module and Material Data

**Size:** Large (post-redesign)  
**Goal:** Move `availableModules`, `availableCompleteSets`, and `availableMaterials` out of TypeScript into JSON so non-developers can add or update products without a code change.

**Why last:** This requires a settled data model (shape of `ModuleDefinition` will change in Phases 2–4). It also requires choosing a data source (static JSON in `public/data/`, a headless CMS, or a REST API) and adding fetch + loading/error states. All earlier phases produce cleaner TypeScript interfaces that directly inform the Zod validation schemas needed here.

### Outline

1. Create `public/data/modules.json` and `public/data/materials.json` matching the TypeScript types from earlier phases
2. Fetch on app init (or use `import ... assert { type: 'json' }` for static JSON)
3. Validate with Zod schemas generated from the TypeScript interfaces
4. Add a loading/error state before the wizard starts
5. `getModuleSnappingConfig` and the snap category lookup (Phase 3) must work with runtime-fetched data — verify no circular dependency

---

## Acceptance Checklist Per Phase

After completing each phase, verify:

- [ ] `npm run build` succeeds (TypeScript + Vite)
- [ ] `npm run lint` clean
- [ ] Can add modules/complete sets to scene
- [ ] Drag and snap works for all module pair combinations (Phase 3 only: full matrix test)
- [ ] Delete object — remaining objects retain correct positions and materials
- [ ] Material change applies to selected object only
- [ ] Language toggle (PL/EN) works
- [ ] Loading spinner appears and disappears correctly
