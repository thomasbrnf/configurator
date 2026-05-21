# CLAUDE.md — Furniture Configurator Developer Guide

## Project Overview

This is a 3D furniture configurator that lets users build sofa configurations from individual modules or pre-assembled complete sets. Users pick from complete sofas or compose a sofa from modular parts (left arm, middle sections, right arm, etc.), see them in a photorealistic 3D scene, drag and snap modules together, rotate individual pieces, and change fabric/material textures.

The app is a single-page experience with no routing. A step machine gates the 3D scene behind a configuration wizard: **Welcome → Config Type → Module Selection → Scene**. There is no state persistence — refreshing resets the scene.

---

## Tech Stack

| Layer           | Library                                                | Version              |
| --------------- | ------------------------------------------------------ | -------------------- |
| UI              | React, TypeScript                                      | 19.1.1, 5.9.3        |
| 3D Rendering    | Three.js, React Three Fiber, @react-three/drei         | 0.180, 9.3.0, 10.7.6 |
| Post-processing | @react-three/postprocessing                            | 3.0.4                |
| State           | React Context API (3 contexts) + Zustand (loader only) | 5.0.8                |
| Styling         | Tailwind CSS                                           | 4.1.14               |
| Build           | Vite (rolldown-vite fork), SWC                         | 7.1.14               |
| Debug UI        | Leva                                                   | 0.10.0               |

No routing library. No test suite. No state persistence.

---

## Directory Map

```
src/
  App.tsx                          — Provider tree root, top-level layout
  main.tsx                         — React entry point
  index.css / App.css              — Global CSS, Tailwind base, custom scrollbar

  components/
    Scene/index.tsx                — R3F Canvas + all sub-components (1314 lines)
                                     Contains: AutoCenterCamera, ClickHandler,
                                     ContextMenu integration, snap preview,
                                     Leva debug panels
    DynamicModel/index.tsx         — Per-object GLTF loader + material applicator
                                     + selection outline rendering
    ControlPanel/
      index.tsx                    — Composes ConfiguratorHeader (scene variant),
                                     SceneActionButtons, MaterialsModal
      SceneActionButtons.tsx       — Floating delete/copy action buttons
      MaterialsModal.tsx           — Right-side material picker panel
    Configurator/
      index.tsx                    — Step router (switch on currentStep)
      ConfiguratorHeader.tsx       — Unified header used by ALL steps + scene
      WelcomeStep.tsx              — Initial welcome overlay
      ConfigTypeStep.tsx           — Complete sets vs. modules choice
      ModuleSelectionStep.tsx      — Module picker with quantity counter
    ContextMenu/index.tsx          — Draggable floating menu (delete action)
    ControlsInfo/index.tsx         — Camera controls help tooltip
    Spinner/index.tsx              — Loading overlay
    model/index.tsx                — Legacy component, verify before touching
    ui/
      Breadcrumb.tsx               — Reusable breadcrumb trail (arrow-separated items)
      LanguageSwitcher.tsx         — PL/EN toggle button (reads useLanguage internally)
      ItemCard.tsx                 — Module/complete-set card (thumbnail + name + overlay slot)

  context/
    ConfiguratorContext.tsx        — Step state, scene object list (string[]),
                                     positions/rotations (Map<index,…>),
                                     module + complete-set definitions (hardcoded)
    MaterialContext.tsx            — Per-object material, global PBR scalar props,
                                     material library (hardcoded)
    LanguageContext.tsx            — PL/EN translations (70+ keys), localStorage

  store/
    loaderStore.ts                 — Zustand: isLoading + loadingMessage

public/
  models/                          — GLB files (sofa parts + complete sets)
    thumbnails/                    — PNG previews for module selection UI
  materials/
    the smallest club/             — 4 texture pairs (diffuse + normal)
    the smallest granit/           — 6 texture pairs (diffuse + normal)
```

---

## Design Tokens

All UI colors and the Lato font are defined as Tailwind tokens in `tailwind.config.js`. **Never hardcode these hex values directly** — always use the token class.

| Token            | Class                                            | Hex       | Usage                                                           |
| ---------------- | ------------------------------------------------ | --------- | --------------------------------------------------------------- |
| Brand green      | `text-brand` / `bg-brand`                        | `#06402b` | Primary brand color                                             |
| Dark text/border | `text-ui-dark` / `border-ui-dark` / `bg-ui-dark` | `#454343` | Primary text, active borders, buttons                           |
| Header accent    | `text-ui-mid` / `border-ui-mid` / `bg-ui-mid`    | `#7e7870` | Header lines, accent bars, secondary borders                    |
| Muted text       | `text-ui-muted` / `bg-ui-muted`                  | `#757575` | Breadcrumb text, disabled labels, add-module bar                |
| Inactive border  | `border-ui-border`                               | `#acacac` | Inactive card borders, disabled buttons                         |
| Card surface     | `from-ui-surface`                                | `#f3f3f3` | Card gradient start (used with `bg-gradient-to-b ... to-white`) |

The Lato typeface is available as `font-lato`. Use `font-lato` instead of `font-['Lato',sans-serif]` everywhere.

---

## Architecture Decisions

### Provider Order in App.tsx (Load-Bearing)

```
LanguageProvider
  MaterialProvider
    ConfiguratorProvider        ← calls useMaterial() internally
      Scene / ControlPanel / Configurator / Spinner
```

`ConfiguratorProvider` depends on `MaterialProvider` — it calls `setSelectedObjectId` from `useMaterial` inside its own logic. **Never hoist `ConfiguratorProvider` above `MaterialProvider`.**

### Unified Header: ConfiguratorHeader

A single `ConfiguratorHeader` component is used across all four steps and the scene view. Its props:

```ts
interface ConfiguratorHeaderProps {
  showLabel?: boolean; // "Sofa configurator" label (WelcomeStep)
  onBack?: () => void; // renders standard BACK button
  leftContent?: React.ReactNode; // fully custom left slot (overrides showLabel/onBack)
  breadcrumb?: string[];
  onClose?: () => void;
  subBar?: React.ReactNode; // second row below header bar (scene ADD MODULE button)
  fixed?: boolean; // position:fixed vs absolute (true for scene header)
}
```

- Wizard steps (`WelcomeStep`, `ConfigTypeStep`, `ModuleSelectionStep`) live inside `fixed inset-0` containers so they use `fixed={false}` (default).
- `ControlPanel` passes `fixed={true}` because it renders directly in the document, outside any overlay container.
- `Breadcrumb` and `LanguageSwitcher` are consumed internally by `ConfiguratorHeader` — do not render them separately alongside it.

### Shared UI Primitives (`src/components/ui/`)

| Component          | Props                                                                              | Notes                                             |
| ------------------ | ---------------------------------------------------------------------------------- | ------------------------------------------------- |
| `Breadcrumb`       | `items: string[]`                                                                  | Arrow-separated uppercase items                   |
| `LanguageSwitcher` | none                                                                               | Reads `useLanguage` internally                    |
| `ItemCard`         | `name`, `subtitle`, `thumbnail?`, `selected?`, `disabled?`, `onClick?`, `overlay?` | Used for both module cards and complete-set cards |

### Object Identity System

Scene objects are stored as `sceneObjects: string[]` in `ConfiguratorContext`. IDs come in two forms:

- **Complete sets** — bare ID: `"sofa-1"`
- **Module instances** — encoded ID: `"<baseId>-<counter>-<timestamp>-<random>"`, e.g. `"sofa part left-0-1715000000000-abc123def"`

The base module ID is recovered by stripping the trailing `counter-timestamp-random` suffix. This extraction logic is duplicated in `ConfiguratorContext.tsx` and `DynamicModel/index.tsx` — both copies must stay in sync. See the **Things NOT To Do** section.

### Index-Based Position/Rotation Tracking

Object positions and rotations are stored in `Map<number, [number, number, number]>` keyed by the array index of the object in `sceneObjects`. When an object is deleted, all higher indices shift down — `removeObjectByIndex` handles this synchronously. Do not key these maps by anything other than array index without refactoring the entire deletion path.

### R3F vs DOM Component Boundary

Everything inside `<Canvas>` is an R3F (Three.js) component — it cannot use DOM APIs (no `document`, no `window`, no CSS positioning). Everything outside `<Canvas>` is a regular React DOM component. `ClickHandler` is an R3F null-render component that attaches native mouse listeners to the WebGL canvas DOM element via `useEffect`.

All UI overlays (`ContextMenu`, `ControlPanel`, `Configurator`, `Spinner`) are outside the Canvas and use CSS `position: fixed` with z-index stacking.

---

## Critical Conventions

### Unique ID Format for Module Instances

When adding a module instance, always generate IDs in this exact format:

```ts
`${moduleId}-${counter}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
```

The 3-segment suffix (counter: digits, timestamp: 13 digits, random: 9 alphanumeric) is what `extractBaseModuleId` uses to recover the base module ID. Changing this format breaks material lookup, model resolution, and snapping.

### Adding a New Module Type

1. Add a `ModuleDefinition` entry to `availableModules` in `ConfiguratorContext.tsx`
2. Add a thumbnail PNG to `public/models/thumbnails/`
3. Add the GLB to `public/models/`
4. Set `snappingSides` correctly (`"left"`, `"right"`, `"both"`, or `"none"`)
5. **Update the snap distance lookup table** in `ClickHandler` (the if/else block on `draggedIsLong`, `targetIsMiddle`, etc.) — the new module's dimensions must be measured from the GLTF bounding box

### Adding a New Complete Set

1. Add a `CompleteSetDefinition` entry to `availableCompleteSets` in `ConfiguratorContext.tsx`
2. Add translation keys to both `pl` and `en` in `LanguageContext.tsx`
3. Complete set IDs must start with `"sofa-"` — `startsWith("sofa-")` is the check used to distinguish complete sets from module instances

### Material Application (DynamicModel)

`applyMaterials` traverses the GLTF hierarchy and assigns materials by mesh name inspection. The following mesh names keep their **original GLTF material** (no custom PBR applied):
`table_top`, `lamp_and_usb`, `legs`, `Sofa_top`, `Sofa_lamp`, `Sofa_mattress`, `Sofa_Bed_Metal`, `Sofa_technical_fabric`

All other meshes receive the custom PBR material. Meshes with `material.name === "Sofa_Wood_top"` get a second variant with a different AO map.

If you add a new GLTF and upholstery isn't applying, check that mesh names don't accidentally match one of the shadow keywords above.

### UV Scale Overrides Per Model

Two models have hardcoded UV scale overrides in `DynamicModel`:

- `models/sofa3.glb` → scale `10.5`
- `models/gala_collezione_KARATO [PODUSZKA].glb` → scale `0.5`

If you add a model that needs a non-default UV scale, add another condition to the `effectiveUvScale` assignment in `DynamicModel/index.tsx`.

### Translation Keys

Always add new keys to **both** `pl` and `en` objects in `LanguageContext.tsx`. TypeScript will catch missing keys only if the `Translations` interface is kept in sync — update the interface when adding new keys.

---

## Gotchas and Known Issues

### Leva Debug Panel is Always Present in Production

`<Leva>` is rendered unconditionally in `Scene/index.tsx`. It controls camera position, tone mapping, lighting, shadow parameters, material PBR scalars, and environment. The Leva-controlled `value:` defaults are the **production-tuned values**. Do not remove Leva until those defaults are extracted to constants — removing it resets lighting to non-tuned initial values.

### Selection Outline Doubles Draw Calls

When an object is selected, `DynamicModel` renders a second clone of the GLTF at 1.02× scale with `THREE.BackSide` on a green material. This works visually but doubles geometry for the selected object. The correct fix is a post-processing outline pass (`@react-three/postprocessing` is already installed).

### Index Desync Risk on Delete

Positions and rotations are re-indexed synchronously in `removeObjectByIndex`. If any component reads `objectPositions.get(index)` in the same render cycle after deletion, it may get a stale index. The app avoids this by reading positions only inside the `sceneObjects.map()` render loop. Do not decouple position reads from that loop.

### `extractBaseModuleId` is Duplicated

The function that strips the unique suffix from a module instance ID exists in:

1. `ConfiguratorContext.tsx` — as an inline closure inside `getModuleSnappingConfig`
2. `DynamicModel/index.tsx` — as a local function inside the component

These must stay in sync. If you change the ID format, update both.

### Snap Logic Uses Magic Numbers

The snap distance table in `ClickHandler` contains float literals like `0.79`, `0.9`, `1.03`, `1.05`, `1.18`, `1.305`, `1.69`, `1.825`. These are the physical widths and half-widths of the sofa modules as measured from the 3D assets — they are not arbitrary. If you resize a module GLB, measure the new bounding box and update the corresponding entry.

### Module Type Detection by String Match

The snap logic detects module types like:

```ts
const draggedIsLong = draggedObjectId.toLowerCase().includes('long');
const draggedIsMiddle = draggedObjectId.toLowerCase().includes('middle') && !...
```

Module type is inferred from the ID string. **If you rename a module ID, the snap logic silently breaks.** The `snappingSides` field controls which side snaps, but sizing relies on these string checks.

### `isAutoCenterEnabled` Flag Is Inverted

In `Scene/index.tsx`, `AutoCenterCamera` is enabled when `isAutoCenterEnabled` is `false`:

```tsx
enabled={rotationControlIndex === null && !isAutoCenterEnabled}
```

The flag was originally named for "manual mode enabled." The behavior is correct — when the UI shows "ON", the camera auto-centers — but the prop inversion is confusing. Don't rename the flag without auditing all usages.

### Hardcoded Polish Loader Messages

`DynamicModel` calls `showLoader("Ładowanie obiektu...")` (Polish). `Spinner` then does a manual dictionary lookup to translate to English. This is a separate translation layer from `LanguageContext`. Fix by passing a translation key instead of a raw string to `showLoader`.

### No Error Boundaries

There are no React error boundaries. If a GLTF fails to load, `useGLTF` throws and the entire scene crashes. Wrap `DynamicModel` usages with error boundaries before shipping to production.

### `isAlreadyInScene` Check Asymmetry

In `ModuleSelectionStep`, the "already in scene" check for complete sets is an exact match on the bare ID:

```ts
sceneObjects.some((obj) => obj === set.id);
```

Module instances always generate a unique suffix, so they are never blocked from being re-added. This asymmetry is intentional — complete sets are singletons, modules are not.

### `useLoaderStore` Called via `getState()` in useEffect

In `DynamicModel`, the Zustand store is accessed via `useLoaderStore.getState()` inside a `useEffect` (the non-reactive escape hatch). This is intentional — it avoids a hook-in-callback error. Do not refactor this to `useLoaderStore()` at the component level without auditing the re-render implications.

---

## Development Workflow

### Commands

```bash
npm run dev        # Vite dev server with HMR
npm run build      # TypeScript check + Vite production build
npm run preview    # Serve the built output locally
npm run lint       # ESLint
```

### Asset Paths

All 3D models and textures load via `import.meta.env.BASE_URL`. In development this is `/`. In production it is set via the `BASE_URL` variable in `.env` (or the deployment environment). Always prefix asset paths with:

```ts
const BASE = import.meta.env.BASE_URL;
```

Never hardcode an absolute asset path.

### Adding Models and Textures

- Place GLBs in `public/models/`
- Place thumbnails in `public/models/thumbnails/`
- File names with spaces are allowed (existing ones use them)
- All new modules are automatically preloaded because `DynamicModel/index.tsx` loops over `availableModules` and `availableCompleteSets` to call `useGLTF.preload()`

---

## Things NOT To Do

- **Do not hardcode UI colors** — use the `ui.*` Tailwind tokens (`text-ui-dark`, `bg-ui-mid`, etc.) defined in `tailwind.config.js`.
- **Do not write `font-['Lato',sans-serif]`** — use `font-lato` (the Tailwind token).
- **Do not render `<Breadcrumb>` or `<LanguageSwitcher>` manually in header areas** — they are already included inside `ConfiguratorHeader`. Duplicating them creates desynced state.
- **Do not rename module IDs** without auditing the snap logic — string-match type detection (`includes('long')`, `includes('middle')`) is coupled to ID naming and breaks silently.
- **Do not move `ConfiguratorProvider` above `MaterialProvider`** — `ConfiguratorProvider` calls `useMaterial()` internally and will throw.
- **Do not remove Leva before extracting production defaults** — the Leva `value:` defaults for lighting, tone mapping, shadows, and environment are the production-tuned values.
- **Do not key `objectPositions` or `objectRotations` by anything other than array index** without refactoring the entire delete/re-index path in `removeObjectByIndex`.
- **Do not add new magic numbers to the snap logic without a comment** identifying which module pairing it covers and the measured dimension.
- **Do not add translation keys without updating both `pl` and `en`** in `LanguageContext.tsx`.
- **Do not render DOM elements inside the R3F `<Canvas>`** — only Three.js/R3F scene objects are valid there.
- **Do not call hooks inside `useEffect` callbacks** — use the `useLoaderStore.getState()` Zustand escape hatch pattern for store access in callbacks, not `useContext`.
- **Do not import a context hook in a non-React file** — use `useLoaderStore.getState()` for Zustand or restructure to pass values as arguments.
- **Do not add IDs for new complete sets that don't start with `"sofa-"`** — the `isAlreadyInScene` check and other detection logic rely on this prefix convention.
