import type {
  ModuleCategory,
  SnappingSide,
} from "../context/ConfiguratorContext";
import { halfExtentAlong } from "../data/snapDistances";

// Footprint scale applied to the real measured geometry. 1.0 = collide / snap at
// true bounding-box edges. Lower it slightly (e.g. 0.97) if soft cushion overhang
// should be allowed to nestle together. Collision, snapping and rotation all
// share this factor so they stay consistent.
export const COLLISION_FOOTPRINT_SCALE = 1.0;

// 90° rotation quadrant from a Y rotation in radians: 0/1/2/3 → 0/90/180/270°.
export function quadrantFromRotationY(ry: number): number {
  return ((Math.round(ry / (Math.PI / 2)) % 4) + 4) % 4;
}

// Half-extent a module occupies along a WORLD axis. Prefers the real measured
// bounding box (rotation-independent, swapped per quadrant); falls back to the
// hand-tuned per-category table until the model has been measured on first load.
export function worldHalfExtent(
  size: [number, number, number] | undefined,
  category: ModuleCategory,
  quadrant: number,
  worldAxis: "x" | "z",
): number {
  if (size) {
    const isOdd = quadrant % 2 !== 0;
    const halfLocalX = (size[0] / 2) * COLLISION_FOOTPRINT_SCALE;
    const halfLocalZ = (size[2] / 2) * COLLISION_FOOTPRINT_SCALE;
    if (worldAxis === "x") return isOdd ? halfLocalZ : halfLocalX;
    return isOdd ? halfLocalX : halfLocalZ;
  }
  return halfExtentAlong(category, quadrant, worldAxis);
}

// Rotate a model-LOCAL (x, z) bounding-box centre offset into WORLD space for a
// 90° rotation quadrant. Matches three's Object3D Y-rotation (local +Z maps to
// world +X at 90°). Most GLBs are authored with the geometry centred on the
// origin (offset ≈ 0), but the complete sets pivot at one end, so their
// footprint/overlay must be shifted by this to sit on the actual mesh.
export function worldOffsetXZ(
  offset: [number, number, number],
  quadrant: number,
): [number, number] {
  const ox = offset[0];
  const oz = offset[2];
  switch (((quadrant % 4) + 4) % 4) {
    case 1:
      return [oz, -ox];
    case 2:
      return [-ox, -oz];
    case 3:
      return [-oz, ox];
    default:
      return [ox, oz];
  }
}

// An axis-aligned footprint on the XZ plane: centre (x, z) and half-extents.
export interface Footprint {
  x: number;
  z: number;
  hx: number;
  hz: number;
}

// World direction of a module's local +X ("right") face after a q·90° Y rotation.
export const RIGHT_DIR: readonly [number, number][] = [
  [1, 0],
  [0, -1],
  [-1, 0],
  [0, 1],
];

// World direction of a module's local −Z ("back") face after a q·90° Y rotation.
export const BACK_DIR: readonly [number, number][] = [
  [0, -1],
  [-1, 0],
  [0, 1],
  [1, 0],
];

// World-space [x, z] unit vectors of all active snapping faces for a module,
// given its snapping config and 90°-quadrant rotation. Mirrors the logic in
// useDragAndSnap so the debug overlay uses exactly the same face set.
export function snapFaceDirs(
  snapping: SnappingSide,
  quadrant: number,
): [number, number][] {
  if (snapping === "none") return [];
  const right = RIGHT_DIR[quadrant] as [number, number];
  const left: [number, number] = [-right[0], -right[1]];
  const back = BACK_DIR[quadrant] as [number, number];
  const front: [number, number] = [-back[0], -back[1]];
  switch (snapping) {
    case "both":        return [right, left];
    case "right":       return [right];
    case "left":        return [left];
    case "front":       return [front];
    case "left-front":  return [left, front];
    case "right-front": return [right, front];
    default:            return [];
  }
}

const EPS = 1e-3;

// True if `a` overlaps any obstacle by more than a flush-seam epsilon.
export function footprintOverlapsAny(
  a: Footprint,
  obstacles: Footprint[],
): boolean {
  return obstacles.some((o) => {
    const overlapX = a.hx + o.hx - Math.abs(a.x - o.x);
    const overlapZ = a.hz + o.hz - Math.abs(a.z - o.z);
    return overlapX > EPS && overlapZ > EPS;
  });
}

// Slide `moved` out of every obstacle footprint, pushing along the axis of least
// penetration away from each obstacle's centre. Returns a fully-cleared [x, z],
// or null if it can't be separated within `passes` (wedged / boxed in) — the
// caller treats null as "no room" and cancels the operation.
export function resolveFootprintOut(
  moved: Footprint,
  obstacles: Footprint[],
  passes = 6,
): [number, number] | null {
  let px = moved.x;
  let pz = moved.z;

  for (let pass = 0; pass < passes; pass++) {
    let pushed = false;
    for (const o of obstacles) {
      const sumX = moved.hx + o.hx;
      const sumZ = moved.hz + o.hz;
      const dx = px - o.x;
      const dz = pz - o.z;
      const overlapX = sumX - Math.abs(dx);
      const overlapZ = sumZ - Math.abs(dz);
      if (overlapX <= EPS || overlapZ <= EPS) continue;
      if (overlapX < overlapZ) {
        px = o.x + (dx >= 0 ? 1 : -1) * sumX;
      } else {
        pz = o.z + (dz >= 0 ? 1 : -1) * sumZ;
      }
      pushed = true;
    }
    if (!pushed) return [px, pz]; // settled with no overlaps
  }

  // Pass budget exhausted — accept only if actually clear of everything.
  for (const o of obstacles) {
    const overlapX = moved.hx + o.hx - Math.abs(px - o.x);
    const overlapZ = moved.hz + o.hz - Math.abs(pz - o.z);
    if (overlapX > EPS && overlapZ > EPS) return null;
  }
  return [px, pz];
}
