# Duplicate Collision Detection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent `duplicateObject` from spawning a copy inside an existing model by resolving to the nearest clear position, or aborting if none exists.

**Architecture:** Reuse `footprintOverlapsAny` / `resolveFootprintOut` from `footprint.ts` — the same pattern already used by the rotation-collision check in the same file. Material pre-seed is moved after the collision check so there's nothing to clean up on abort.

**Tech Stack:** TypeScript, React context, Three.js bounding sizes

---

### Task 1: Reorder material pre-seed and add collision resolution in `duplicateObject`

**Files:**
- Modify: `src/context/ConfiguratorContext.tsx` — `duplicateObject` function (~line 651)

- [ ] **Step 1: Read the current function** to confirm line numbers haven't shifted

Open `src/context/ConfiguratorContext.tsx` and locate `duplicateObject` (search for `const duplicateObject`). The function spans roughly lines 651–706.

- [ ] **Step 2: Replace the function body**

Replace the entire `duplicateObject` function with the version below. Key changes:
- Material pre-seed is moved to **after** the collision check passes (so no cleanup is needed on abort).
- Footprint for the copy is built using inherited rotation quadrant + bounding offset (mirrors the rotation handler at ~line 832).
- Obstacle footprints are built for every other scene object.
- `resolveFootprintOut` slides the copy to the nearest clear spot; `null` → abort silently.

```typescript
const duplicateObject = (instanceId: string) => {
  const baseModuleId = extractBaseModuleId(instanceId);
  const newInstanceId = generateInstanceId(baseModuleId, 0);

  // Inherit rotation and compute initial proposed position.
  const sourceRotation = objectRotations.get(instanceId);
  const sourcePosition = objectPositions.get(instanceId) || [0, 0, 0];

  const storedSize = objectBoundingSizes.get(baseModuleId);
  const offsetX = storedSize
    ? Math.sqrt(storedSize[0] * storedSize[0] + storedSize[2] * storedSize[2]) + 0.1
    : 1.5;

  const copyQuadrant = quadrantFromRotationY(
    sourceRotation ? sourceRotation[1] : 0,
  );
  const copyOffset = objectBoundingOffsets.get(baseModuleId);
  const [wox, woz] = copyOffset ? worldOffsetXZ(copyOffset, copyQuadrant) : [0, 0];
  const cat = getModuleCategory(instanceId);

  const proposedX = sourcePosition[0] + offsetX;
  const proposedZ = sourcePosition[2];

  const copyFootprint: Footprint = {
    x: proposedX + wox,
    z: proposedZ + woz,
    hx: worldHalfExtent(storedSize, cat, copyQuadrant, "x"),
    hz: worldHalfExtent(storedSize, cat, copyQuadrant, "z"),
  };

  const obstacles: Footprint[] = sceneObjects
    .filter((o) => o.instanceId !== instanceId)
    .map((o) => {
      const oBaseId = extractBaseModuleId(o.instanceId);
      const oPos = objectPositions.get(o.instanceId) || [0, 0, 0];
      const oRot = objectRotations.get(o.instanceId);
      const oQuadrant = quadrantFromRotationY(oRot ? oRot[1] : 0);
      const oSize = objectBoundingSizes.get(oBaseId);
      const oCat = getModuleCategory(o.instanceId);
      const oOff = objectBoundingOffsets.get(oBaseId);
      const [owox, owoz] = oOff ? worldOffsetXZ(oOff, oQuadrant) : [0, 0];
      return {
        x: oPos[0] + owox,
        z: oPos[2] + owoz,
        hx: worldHalfExtent(oSize, oCat, oQuadrant, "x"),
        hz: worldHalfExtent(oSize, oCat, oQuadrant, "z"),
      };
    });

  let finalX = proposedX;
  let finalZ = proposedZ;

  if (footprintOverlapsAny(copyFootprint, obstacles)) {
    const cleared = resolveFootprintOut(copyFootprint, obstacles);
    if (!cleared) return; // boxed in — abort silently
    finalX = cleared[0] - wox;
    finalZ = cleared[1] - woz;
  }

  // Collision resolved — now commit everything.
  const instance: SceneInstance = {
    instanceId: newInstanceId,
    moduleId: baseModuleId,
  };

  // Pre-seed the fabric material so DynamicModel's mount-time addObject is a no-op.
  const sourceMaterial = getObjectMaterial(instanceId);
  if (sourceMaterial) {
    const sourceObject = objects.find((o) => o.id === instanceId);
    addObject({
      id: newInstanceId,
      name: sourceObject?.name || baseModuleId,
      material: sourceMaterial,
    });
  }

  setSceneObjects((prev) => {
    const index = prev.findIndex((inst) => inst.instanceId === instanceId);
    if (index === -1) return [...prev, instance];
    const next = [...prev];
    next.splice(index + 1, 0, instance);
    return next;
  });
  setObjectPositions((prev) => {
    const next = new Map(prev);
    next.set(newInstanceId, [finalX, sourcePosition[1], finalZ]);
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
```

- [ ] **Step 3: Verify `Footprint` type and `footprintOverlapsAny`/`resolveFootprintOut` are imported**

Check the import block at the top of `ConfiguratorContext.tsx`. It should already import from `../utils/footprint`. Confirm these names are present:

```typescript
import {
  worldHalfExtent,
  worldOffsetXZ,
  footprintOverlapsAny,
  resolveFootprintOut,
  quadrantFromRotationY,
  type Footprint,
} from "../utils/footprint";
```

Add any missing names to the existing import — do not create a second import line.

- [ ] **Step 4: TypeScript check**

```bash
cd /Users/tommydi/Personal/configurator && npx tsc --noEmit
```

Expected: zero errors. Fix any type errors before continuing.

- [ ] **Step 5: Manual smoke test**

Start the dev server (`npm run dev`), open the configurator, add 2–3 models so they are close together, then duplicate one that is surrounded. Verify:
- With room available: copy spawns at the nearest clear spot, not overlapping anything.
- When totally boxed in: nothing happens (no crash, no duplicate spawned).

- [ ] **Step 6: Commit**

```bash
git add src/context/ConfiguratorContext.tsx
git commit -m "feat: prevent duplicate from spawning inside existing models"
```
