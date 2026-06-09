import type { ModuleCategory } from "../context/ConfiguratorContext";

export interface SnapConfig {
  /** Snap distance along the X axis (left-right placement) */
  xDist: number;
  /** Snap distance along the Z axis (front-back placement) */
  zDist: number;
  /**
   * Perpendicular offset applied when modules have different depths.
   * Positive means the dragged object shifts outward on the perpendicular axis.
   * Sign is relative to (dragged, target) order — flip it if the roles are swapped.
   */
  zShift: number;
}

// All distances measured from GLTF bounding boxes.
// Key format: `${draggedCategory}:${targetCategory}`
// Only (dragged, target) pairs are stored; the function handles (target, dragged) by negating zShift.
const TABLE: Record<string, SnapConfig> = {
  // standard ↔ standard
  "standard:standard": { xDist: 0.70, zDist: 1.03, zShift: 0 },
  // standardLong ↔ standardLong
  "standardLong:standardLong": { xDist: 0.70, zDist: 1.03, zShift: 0 },
  // wide ↔ wide
  "wide:wide": { xDist: 1.61, zDist: 1.2, zShift: 0 },
  // corner ↔ corner
  "corner:corner": { xDist: 1.03, zDist: 1.03, zShift: 0 },
  // cornerWider ↔ cornerWider
  "cornerWider:cornerWider": { xDist: 1.03, zDist: 1.03, zShift: 0 },

  // standard ↔ standardLong
  "standard:standardLong": { xDist: 0.71, zDist: 1.03, zShift: -0.31 },
  "standardLong:standard": { xDist: 0.71, zDist: 1.03, zShift: 0.31 },

  // standard ↔ wide
  "standard:wide": { xDist: 1.15, zDist: 1.3, zShift: 0 },
  "wide:standard": { xDist: 1.15, zDist: 1.3, zShift: 0 },

  // standard ↔ light
  "standard:light": { xDist: 0.56, zDist: 1.03, zShift: -0.042 },
  "light:standard": { xDist: 0.56, zDist: 1.03, zShift: 0.042},

  // standard ↔ extralight
  "standard:extralight":{ xDist: 0.46, zDist: 0.9, zShift: -0.054 },
  "extralight:standard": { xDist: 0.46, zDist: 0.92, zShift: 0.054 },

  // standard ↔ thin
  "standard:thin": { xDist: 0.43, zDist: 0.9, zShift: -0.054 },
  "thin:standard": { xDist: 0.43, zDist: 0.92, zShift: 0.054 },

  // standard ↔ corner
  "standard:corner": { xDist: 0.901, zDist: 1.03, zShift: 0 },
  "corner:standard": { xDist: 0.901, zDist: 1.03, zShift: 0 },

  // standard ↔ cornerWider
  "standard:cornerWider": { xDist: 0.91, zDist: 1.03, zShift: 0 },
  "cornerWider:standard": { xDist: 0.91, zDist: 1.03, zShift: 0 },

  // standardLong ↔ wide
  "standardLong:wide": { xDist: 1.15, zDist: 1.3, zShift: 0.31 },
  "wide:standardLong": { xDist: 1.15, zDist: 1.3, zShift: -0.31 },

  // standardLong ↔ light
  "standardLong:light": { xDist: 0.56, zDist: 1.03, zShift: 0.265 },
  "light:standardLong": { xDist: 0.56, zDist: 1.03, zShift: -0.265 },

  // standardLong ↔ extralight
  "standardLong:extralight": { xDist: 0.46, zDist: 1.03, zShift: 0.255  },
  "extralight:standardLong": { xDist: 0.46, zDist: 1.03, zShift: -0.255 },

  // standardLong ↔ thin
  "standardLong:thin": { xDist: 0.43, zDist: 0.9, zShift: 0.255  },
  "thin:standardLong": { xDist: 0.43, zDist: 0.92, zShift: -0.255 },

  // standardLong ↔ corner
  "standardLong:corner": { xDist: 0.901, zDist: 1.03, zShift: 0.31 },
  "corner:standardLong": { xDist: 0.901, zDist: 1.03, zShift: -0.31 },

  // standardLong ↔ cornerWider
  "standardLong:cornerWider": { xDist: 0.91, zDist: 1.03, zShift: 0.31  },
  "cornerWider:standardLong": { xDist: 0.91, zDist: 1.03, zShift: -0.31  },

  // wide ↔ light
  "wide:light": { xDist: 1.01, zDist: 1.3, zShift: -0.042 },
  "light:wide": { xDist: 1.01, zDist: 1.3, zShift: 0.042 },

  // wide ↔ extralight
  "wide:extralight": { xDist: 0.91, zDist: 1.3, zShift: -0.054 },
  "extralight:wide": { xDist: 0.91, zDist: 1.3, zShift: 0.054 },

  // wide ↔ thin
  "wide:thin": { xDist: 0.89, zDist: 1.18, zShift:  -0.054 },
  "thin:wide": { xDist: 0.89, zDist: 1.18, zShift: 0.054 },

  // wide ↔ corner
  "wide:corner": { xDist: 1.35, zDist: 1.3, zShift: 0 },
  "corner:wide": { xDist: 1.35, zDist: 1.3, zShift: 0 },

  // wide ↔ cornerWider
  "wide:cornerWider": { xDist: 1.36, zDist: 1.3, zShift: 0},
  "cornerWider:wide": { xDist: 1.36, zDist: 1.3, zShift: 0 },

  // light ↔ corner
  "light:corner": { xDist: 0.76, zDist: 1.03, zShift: 0.038 },
  "corner:light": { xDist: 0.76, zDist: 1.03, zShift: -0.038 },

  // light ↔ cornerWider
  "light:cornerWider": { xDist: 0.77, zDist: 1.03, zShift: 0.04 },
  "cornerWider:light": { xDist: 0.77, zDist: 1.03, zShift: -0.04 },

  // extralight ↔ corner
  "extralight:corner": { xDist: 0.66, zDist: 1.03, zShift: 0.05 },
  "corner:extralight": { xDist: 0.66, zDist: 1.03, zShift: -0.05 },

  // extralight ↔ cornerWider
  "extralight:cornerWider": { xDist: 0.67, zDist: 1.03, zShift: 0.05 },
  "cornerWider:extralight": { xDist: 0.67, zDist: 1.03, zShift: -0.05 },

  // thin ↔ corner
  "thin:corner": { xDist: 0.63, zDist: 0.9, zShift: 0.05 },
  "corner:thin": { xDist: 0.63, zDist: 0.92, zShift: -0.05 },

  // thin ↔ cornerWider
  "thin:cornerWider": { xDist: 0.64, zDist: 0.9, zShift: 0.05 },
  "cornerWider:thin": { xDist: 0.64, zDist: 0.92, zShift: -0.05 },

  // corner ↔ cornerWider
  "corner:cornerWider": { xDist: 1.03, zDist: 1.03, zShift: 0 },
  "cornerWider:corner": { xDist: 1.03, zDist: 1.03, zShift: 0 },
};

// Pairs that must never snap to each other.
const BLOCKED = new Set([
  "light:light",
  "extralight:extralight",
  "thin:thin",
  "light:extralight",
  "extralight:light",
  "light:thin",
  "thin:light",
  "extralight:thin",
  "thin:extralight",
]);

export function getSnapConfig(
  draggedCategory: ModuleCategory,
  targetCategory: ModuleCategory,
): SnapConfig | null {
  const key = `${draggedCategory}:${targetCategory}`;
  if (BLOCKED.has(key)) return null;
  return TABLE[key] ?? null;
}

/**
 * Per-category footprint half-extents, used only for the rotation-aware snap path.
 * `halfWidth` is half the module's local X extent, `halfDepth` half the local Z extent.
 *
 * Seeded by decomposing the pairwise TABLE above (same-category xDist/2 → halfWidth,
 * zDist/2 → halfDepth). corner / cornerWider — the main rotation targets — decompose
 * cleanly; light/extralight/thin/standardLong depths are approximate and may need a
 * small visual tuning pass.
 */
export interface ModuleDimensions {
  halfWidth: number;
  halfDepth: number;
}

export const MODULE_DIMENSIONS: Record<ModuleCategory, ModuleDimensions> = {
  standard: { halfWidth: 0.35, halfDepth: 0.515 },
  standardLong: { halfWidth: 0.35, halfDepth: 0.515 },
  wide: { halfWidth: 0.805, halfDepth: 0.6 },
  light: { halfWidth: 0.21, halfDepth: 0.515 },
  extralight: { halfWidth: 0.11, halfDepth: 0.385 },
  thin: { halfWidth: 0.08, halfDepth: 0.385 },
  corner: { halfWidth: 0.515, halfDepth: 0.515 },
  cornerWider: { halfWidth: 0.515, halfDepth: 0.515 },
};

/**
 * Half-extent a module occupies along a WORLD axis, given its 90° rotation quadrant.
 *  - quadrant even (0 / 180°): local X ↔ world X, local Z ↔ world Z
 *  - quadrant odd  (90 / 270°): local X ↔ world Z, local Z ↔ world X
 */
export function halfExtentAlong(
  category: ModuleCategory,
  quadrant: number,
  worldAxis: "x" | "z",
): number {
  const dims = MODULE_DIMENSIONS[category];
  const isOdd = quadrant % 2 !== 0;
  if (worldAxis === "x") return isOdd ? dims.halfDepth : dims.halfWidth;
  return isOdd ? dims.halfWidth : dims.halfDepth;
}
