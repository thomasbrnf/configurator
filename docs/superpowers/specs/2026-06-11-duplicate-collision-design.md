# Collision-aware duplicate (block on no room)

**Date:** 2026-06-11

## Problem

`duplicateObject` always places the copy at `sourcePosition.x + diagonal_offset`, ignoring every other object already in the scene. This lets a copy spawn inside an existing model.

## Behaviour

1. Compute proposed position: `[sourcePosition.x + diagonal_offset, y, z]` (same as today).
2. Build a footprint for the copy at that position using its inherited rotation quadrant and bounding offset.
3. Build obstacle footprints for every other scene object (their current positions, rotations, and bounding sizes).
4. If the proposed footprint overlaps any obstacle, call `resolveFootprintOut` to slide it to the nearest clear spot.
5. If `resolveFootprintOut` returns `null` (totally boxed in) — abort: do not add the instance to `sceneObjects`, do not set a position, do not change `selectedObjectId`. Clean up the material pre-seed by calling `removeObject(newInstanceId)` before returning.
6. Otherwise place the copy at the resolved position and proceed as today.

## Affected file

`src/context/ConfiguratorContext.tsx` — `duplicateObject` function (~line 651).

## Reused utilities

- `footprintOverlapsAny` from `src/utils/footprint.ts`
- `resolveFootprintOut` from `src/utils/footprint.ts`
- `worldHalfExtent`, `worldOffsetXZ`, `quadrantFromRotationY`, `getModuleCategory` — already imported and used in the same file by the rotation-collision check.

## Out of scope

- Visual warning / toast when blocked (no UI feedback in this iteration).
- Changes to `addModulesToScene` or `addObjectToScene`.
