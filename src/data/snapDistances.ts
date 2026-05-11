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
  "standard:standard": { xDist: 1.03, zDist: 1.03, zShift: 0 },
  // middle ↔ middle
  "middle:middle": { xDist: 0.79, zDist: 0.9, zShift: 0 },
  // long ↔ long
  "long:long": { xDist: 1.05, zDist: 1.18, zShift: 0 },
  // expanded ↔ expanded
  "expanded:expanded": { xDist: 1.825, zDist: 1.825, zShift: 0 },
  // wide ↔ wide
  "wide:wide": { xDist: 1.57, zDist: 1.20, zShift: 0 },

  // standard ↔ middle
  "standard:middle": { xDist: 0.92, zDist: 0.9, zShift: 0 },
  "middle:standard": { xDist: 0.92, zDist: 0.92, zShift: 0 },

  // standard ↔ long
  "standard:long": { xDist: 1.05, zDist: 1.05, zShift: -0.415 },
  "long:standard": { xDist: 1.05, zDist: 1.05, zShift: 0.415 },

  // standard ↔ expanded
  "standard:expanded": { xDist: 1.5, zDist: 1.43, zShift: -0.323 },
  "expanded:standard": { xDist: 1.5, zDist: 1.43, zShift: 0.323 },

  // standard ↔ wide
  "standard:wide": { xDist: 1.30, zDist: 1.30, zShift: -0.323 },
  "wide:standard": { xDist: 1.30, zDist: 1.30, zShift: 0.323 },

  // middle ↔ long
  "middle:long": { xDist: 0.92, zDist: 1.05, zShift: -0.415 },
  "long:middle": { xDist: 0.92, zDist: 1.05, zShift: 0.415 },

  // middle ↔ expanded
  "middle:expanded": { xDist: 1.305, zDist: 1.305, zShift: -0.323 },
  "expanded:middle": { xDist: 1.305, zDist: 1.305, zShift: 0.323 },

  // middle ↔ wide
  "middle:wide": { xDist: 1.18, zDist: 1.18, zShift: -0.323 },
  "wide:middle": { xDist: 1.18, zDist: 1.18, zShift: 0.323 },

  // long ↔ expanded
  "long:expanded": { xDist: 1.43, zDist: 1.43, zShift: 0.09 },
  "expanded:long": { xDist: 1.43, zDist: 1.43, zShift: -0.09 },

  // long ↔ wide
  "long:wide": { xDist: 1.31, zDist: 1.31, zShift: 0.09 },
  "wide:long": { xDist: 1.31, zDist: 1.31, zShift: -0.09 },

  // expanded ↔ wide
  "expanded:wide": { xDist: 1.69, zDist: 1.69, zShift: 0 },
  "wide:expanded": { xDist: 1.69, zDist: 1.69, zShift: 0 },
};

const FALLBACK: SnapConfig = { xDist: 1.03, zDist: 1.03, zShift: 0 };

export function getSnapConfig(
  draggedCategory: ModuleCategory,
  targetCategory: ModuleCategory,
): SnapConfig {
  const key = `${draggedCategory}:${targetCategory}`;
  return TABLE[key] ?? FALLBACK;
}
