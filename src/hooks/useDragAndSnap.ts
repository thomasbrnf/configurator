import { useRef } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import {
  getModuleSnappingConfig,
  getModuleCategory,
} from "../context/ConfiguratorContext";
import { getSnapConfig, halfExtentAlong } from "../data/snapDistances";
import { extractBaseModuleId } from "../utils/moduleId";
import { worldHalfExtent, worldOffsetXZ } from "../utils/footprint";

export interface SnapPreview {
  fromId: string;
  toId: string;
  fromPos: [number, number, number];
  toPos: [number, number, number];
}

interface SceneInstanceRef {
  instanceId: string;
}

interface UseDragAndSnapOptions {
  sceneObjects: SceneInstanceRef[];
  objectPositions: Map<string, [number, number, number]>;
  objectRotations: Map<string, [number, number, number]>;
  /** Real measured [x, y, z] bounding sizes, keyed by base module id. */
  objectBoundingSizes: Map<string, [number, number, number]>;
  /** Local bounding-box centre offset, keyed by base module id (~0 unless off-centre). */
  objectBoundingOffsets: Map<string, [number, number, number]>;
  onDragUpdate: (
    instanceId: string,
    position: [number, number, number],
  ) => void;
  onSnapPreview: (preview: SnapPreview | null) => void;
  onDragStateChange: (isDragging: boolean) => void;
  /** Called once when a real drag begins — the module leaves its current bonds. */
  onDisconnect?: (instanceId: string) => void;
  /** Called when a drag ends in a committed snap — records the new bond. */
  onConnect?: (draggedId: string, targetId: string) => void;
  SNAP_DISTANCE?: number;
}

// World direction of a module's local +X ("right") face after a q·90° Y rotation,
// as a cardinal [x, z] unit vector. q = [0,1,2,3] → 0/90/180/270°.
const RIGHT_DIR: [number, number][] = [
  [1, 0],
  [0, -1],
  [-1, 0],
  [0, 1],
];

// World direction of a module's BACK face (local -Z) after a q·90° Y rotation.
// q0 unrotated → back points world -Z (the cyan debug face). Used to align a
// row of modules by their backs in a rotation-aware way.
const BACK_DIR: [number, number][] = [
  [0, -1],
  [-1, 0],
  [0, 1],
  [1, 0],
];

export function useDragAndSnap({
  sceneObjects,
  objectPositions,
  objectRotations,
  objectBoundingSizes,
  objectBoundingOffsets,
  onDragUpdate,
  onSnapPreview,
  onDragStateChange,
  onDisconnect,
  onConnect,
  SNAP_DISTANCE = 1.8,
}: UseDragAndSnapOptions) {
  const { camera } = useThree();
  const raycaster = useRef(new THREE.Raycaster());
  const mouse = useRef(new THREE.Vector2());
  const dragPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
  const dragOffset = useRef(new THREE.Vector3());

  const isDraggingRef = useRef(false);
  const draggedInstanceIdRef = useRef<string | null>(null);
  const snapTargetIdRef = useRef<string | null>(null);
  // Last collision-free [x, z] of the dragged module. Collision resolution
  // pushes the module back toward this side of an obstacle, so it can never
  // tunnel to the far side when the cursor is dragged past the obstacle.
  const prevDragPosRef = useRef<[number, number] | null>(null);

  function startDrag(
    instanceId: string,
    intersects: THREE.Intersection[],
    canvasRect: DOMRect,
    event: MouseEvent,
  ) {
    draggedInstanceIdRef.current = instanceId;

    // Seed the collision-resolution anchor with the module's current (assumed
    // collision-free) position so the first move can't tunnel.
    const startPos = objectPositions.get(instanceId);
    prevDragPosRef.current = startPos ? [startPos[0], startPos[2]] : null;

    mouse.current.x =
      ((event.clientX - canvasRect.left) / canvasRect.width) * 2 - 1;
    mouse.current.y =
      -((event.clientY - canvasRect.top) / canvasRect.height) * 2 + 1;
    raycaster.current.setFromCamera(mouse.current, camera);

    const intersectionPoint = new THREE.Vector3();
    raycaster.current.ray.intersectPlane(dragPlane.current, intersectionPoint);

    // Find the DRAGGED object's own group among the intersections — not just
    // intersects[0], which may be the floor / shadow / another module in front.
    // Picking the wrong (or no) object left dragOffset at zero, which made the
    // module's origin teleport to the cursor on the first move. The grab offset
    // (object position − cursor's ground point) is what keeps the drag relative
    // to the object's current position; only snap is allowed to reposition it.
    let actualObject: THREE.Object3D | null = null;
    for (const hit of intersects) {
      let o: THREE.Object3D | null = hit.object;
      while (o) {
        if (o.userData?.objectId === instanceId) {
          actualObject = o;
          break;
        }
        o = o.parent;
      }
      if (actualObject) break;
    }

    if (actualObject) {
      const worldPosition = new THREE.Vector3();
      actualObject.getWorldPosition(worldPosition);
      dragOffset.current.copy(worldPosition).sub(intersectionPoint);
    } else {
      // Fallback: anchor to the stored position so we still never teleport.
      const p = objectPositions.get(instanceId);
      if (p) {
        dragOffset.current
          .set(p[0], p[1], p[2])
          .sub(intersectionPoint);
      } else {
        dragOffset.current.set(0, 0, 0);
      }
    }
  }

  // Half-extent of a module's footprint along a WORLD axis. Prefers the real
  // measured bounding box (rotation-independent, swapped per quadrant here);
  // falls back to the hand-tuned per-category table only until the model has
  // been measured on first load. This is what makes collision + snapping use
  // the true geometry with no per-module tuning.
  function footHalf(instanceId: string, worldAxis: "x" | "z"): number {
    return worldHalfExtent(
      objectBoundingSizes.get(extractBaseModuleId(instanceId)),
      getModuleCategory(instanceId),
      quadrant(instanceId),
      worldAxis,
    );
  }

  // World [x, z] offset from a module's stored origin to its footprint CENTRE.
  // ~0 for centred modules; non-zero for off-centre complete sets (rotation
  // aware). Every collision/snap test centres footprints at origin + this.
  function footOffset(instanceId: string): [number, number] {
    const off = objectBoundingOffsets.get(extractBaseModuleId(instanceId));
    if (!off) return [0, 0];
    return worldOffsetXZ(off, quadrant(instanceId));
  }

  function hasMeasuredSize(instanceId: string): boolean {
    return objectBoundingSizes.has(extractBaseModuleId(instanceId));
  }

  // Slide the dragged module's footprint out of every other module's footprint
  // on the XZ plane. Footprints are axis-aligned rectangles sized from the real
  // measured geometry (see footHalf). Resolution pushes along the axis of least
  // penetration; a few passes let the module settle when wedged against several
  // neighbours at once.
  //
  // The push-out direction is taken from `prev` (the last collision-free
  // position), NOT from the proposed `x`/`z`. Otherwise, dragging the cursor
  // far enough that the module's centre crosses the obstacle's centre would
  // flip the resolution and snap the module to the FAR side of the obstacle
  // (AABB tunnelling). Anchoring to the approach side keeps it pinned against
  // the near face and sliding along it instead.
  function resolveCollision(
    draggedId: string,
    x: number,
    z: number,
    prev: [number, number],
  ): [number, number] {
    const dHalfX = footHalf(draggedId, "x");
    const dHalfZ = footHalf(draggedId, "z");

    // Work in footprint-CENTRE space (origin + offset) so off-centre modules
    // (complete sets) collide by their real geometry. Inputs `x/z`/`prev` are
    // origins; convert in, resolve, convert the result back to an origin.
    const [dOffX, dOffZ] = footOffset(draggedId);
    let px = x + dOffX;
    let pz = z + dOffZ;
    const prevCx = prev[0] + dOffX;
    const prevCz = prev[1] + dOffZ;

    for (let pass = 0; pass < 4; pass++) {
      let moved = false;
      sceneObjects.forEach((inst, index) => {
        if (inst.instanceId === draggedId) return;

        const oPos = objectPositions.get(inst.instanceId) || [index * 1.9, 0, 0];
        const [oOffX, oOffZ] = footOffset(inst.instanceId);
        const oCx = oPos[0] + oOffX;
        const oCz = oPos[2] + oOffZ;
        const sumX = dHalfX + footHalf(inst.instanceId, "x");
        const sumZ = dHalfZ + footHalf(inst.instanceId, "z");

        const dx = px - oCx;
        const dz = pz - oCz;
        const overlapX = sumX - Math.abs(dx);
        const overlapZ = sumZ - Math.abs(dz);
        // No overlap if separated on either axis.
        if (overlapX <= 0 || overlapZ <= 0) return;

        // Push out along whichever axis needs the smaller correction, but onto
        // the side the module approached from (sign from `prev`), so it can
        // never be placed behind the obstacle.
        if (overlapX < overlapZ) {
          const sign = prevCx >= oCx ? 1 : -1;
          px = oCx + sign * sumX;
        } else {
          const sign = prevCz >= oCz ? 1 : -1;
          pz = oCz + sign * sumZ;
        }
        moved = true;
      });
      if (!moved) break;
    }

    return [px - dOffX, pz - dOffZ];
  }

  // IDs of every module whose footprint the dragged module would overlap at
  // (x, z), excluding `ignoreIds`. A small epsilon keeps flush (touching) seams
  // — overlap ≈ 0 — from counting as a real overlap.
  function overlappingIds(
    draggedId: string,
    x: number,
    z: number,
    ignoreIds: Set<string>,
  ): { id: string; ox: number; oz: number }[] {
    const dHalfX = footHalf(draggedId, "x");
    const dHalfZ = footHalf(draggedId, "z");
    // `x/z` is the dragged ORIGIN; centre its footprint like the obstacles'.
    const [dOffX, dOffZ] = footOffset(draggedId);
    const cx = x + dOffX;
    const cz = z + dOffZ;
    const EPS = 1e-3;
    const hits: { id: string; ox: number; oz: number }[] = [];
    sceneObjects.forEach((inst, index) => {
      if (ignoreIds.has(inst.instanceId)) return;
      const oPos = objectPositions.get(inst.instanceId) || [index * 1.9, 0, 0];
      const [oOffX, oOffZ] = footOffset(inst.instanceId);
      const overlapX = dHalfX + footHalf(inst.instanceId, "x") - Math.abs(cx - (oPos[0] + oOffX));
      const overlapZ = dHalfZ + footHalf(inst.instanceId, "z") - Math.abs(cz - (oPos[2] + oOffZ));
      if (overlapX > EPS && overlapZ > EPS) {
        hits.push({ id: inst.instanceId, ox: overlapX, oz: overlapZ });
      }
    });
    return hits;
  }

  function updateDrag(event: MouseEvent, canvasRect: DOMRect) {
    if (draggedInstanceIdRef.current === null) return;

    if (!isDraggingRef.current) {
      isDraggingRef.current = true;
      onDragStateChange(true);
      // Real drag has begun: the module leaves any snap bonds it was part of.
      // It re-bonds on release if it snaps to something. Done here (not on
      // mousedown) so a plain click never breaks an existing connection.
      onDisconnect?.(draggedInstanceIdRef.current!);
    }

    mouse.current.x =
      ((event.clientX - canvasRect.left) / canvasRect.width) * 2 - 1;
    mouse.current.y =
      -((event.clientY - canvasRect.top) / canvasRect.height) * 2 + 1;
    raycaster.current.setFromCamera(mouse.current, camera);

    const intersectionPoint = new THREE.Vector3();
    if (
      !raycaster.current.ray.intersectPlane(
        dragPlane.current,
        intersectionPoint,
      )
    )
      return;
    intersectionPoint.add(dragOffset.current);

    const draggedId = draggedInstanceIdRef.current;

    // Prevent the dragged module from being pushed into another module: clamp
    // the proposed position so its footprint can't overlap any other module's.
    const prev = prevDragPosRef.current ?? [
      intersectionPoint.x,
      intersectionPoint.z,
    ];
    let [resolvedX, resolvedZ] = resolveCollision(
      draggedId,
      intersectionPoint.x,
      intersectionPoint.z,
      prev,
    );

    // resolveCollision settles each neighbour along its own least-penetration
    // axis. When the module is wedged between two FLUSH-connected neighbours the
    // shallow axis is the same for both, but there is zero gap there — pushing
    // out of one neighbour lands the module inside the other, so the passes just
    // ping-pong and can terminate STILL overlapping. Committing that position is
    // the penetration-through-a-connected-module bug. The rest of the system
    // (snap detection + the snap veto) assumes the dragged module is never left
    // overlapping, so enforce that invariant here: if resolution couldn't fully
    // separate it, reject this frame's move and hold it at the last known
    // collision-free position. The module then slides along the seam's front
    // face instead of being forced into the zero-gap gap.
    if (
      overlappingIds(draggedId, resolvedX, resolvedZ, new Set([draggedId]))
        .length > 0 &&
      prevDragPosRef.current
    ) {
      [resolvedX, resolvedZ] = prevDragPosRef.current;
    }

    intersectionPoint.x = resolvedX;
    intersectionPoint.z = resolvedZ;
    // Advance the approach anchor only to this verified collision-free position,
    // so a wedged frame can never corrupt `prev` for the frames that follow.
    prevDragPosRef.current = [resolvedX, resolvedZ];

    const draggedSnapping = getModuleSnappingConfig(draggedId);

    // Pick the nearest neighbour the dragged module could ACTUALLY snap to, not
    // merely the nearest one. computeSnapPosition applies every rule (snapping
    // config, blocked pairs, active faces, the opposite-facing side block, and
    // the occupied-spot veto), so the SnapIndicator only appears when releasing
    // here would genuinely connect — and previews exactly that committed spot.
    let closestId: string | null = null;
    let closestDistance = SNAP_DISTANCE;

    if (draggedSnapping !== "none") {
      sceneObjects.forEach((inst, index) => {
        if (inst.instanceId === draggedId) return;
        if (getModuleSnappingConfig(inst.instanceId) === "none") return;

        const targetPos = objectPositions.get(inst.instanceId) || [
          index * 1.9,
          0,
          0,
        ];
        const dist = Math.hypot(
          intersectionPoint.x - targetPos[0],
          intersectionPoint.z - targetPos[2],
        );
        if (dist >= closestDistance) return;
        // Only a target that yields a valid snap from here counts.
        if (
          !computeSnapPosition(
            draggedId,
            inst.instanceId,
            intersectionPoint.x,
            intersectionPoint.z,
          )
        )
          return;
        closestDistance = dist;
        closestId = inst.instanceId;
      });
    }

    snapTargetIdRef.current = closestId;
    if (closestId !== null) {
      const targetPos = objectPositions.get(closestId) || [0, 0, 0];
      onSnapPreview({
        fromId: draggedId,
        toId: closestId,
        fromPos: [
          intersectionPoint.x,
          intersectionPoint.y,
          intersectionPoint.z,
        ],
        toPos: targetPos as [number, number, number],
      });
    } else {
      onSnapPreview(null);
    }

    onDragUpdate(draggedId, [
      intersectionPoint.x,
      intersectionPoint.y,
      intersectionPoint.z,
    ]);
  }

  // 90° rotation quadrant of a module from its Y rotation: 0/1/2/3 → 0/90/180/270°.
  function quadrant(instanceId: string): number {
    const ry = objectRotations.get(instanceId)?.[1] ?? 0;
    return ((Math.round(ry / (Math.PI / 2)) % 4) + 4) % 4;
  }

  // Sign (+1 / -1) of a module's BACK face along a world axis, or 0 if its back
  // is perpendicular to that axis (module rotated 90° to it). Rotation-aware via
  // BACK_DIR, so "align by the back" stays correct at any 90° orientation.
  function backSignAlong(instanceId: string, worldAxis: "x" | "z"): number {
    const back = BACK_DIR[quadrant(instanceId)];
    return worldAxis === "x" ? back[0] : back[1];
  }

  // World-space directions of a module's ACTIVE snapping faces, accounting for rotation.
  function worldSideDirs(instanceId: string): [number, number][] {
    const snapping = getModuleSnappingConfig(instanceId);
    if (snapping === "none") return [];
    const q = quadrant(instanceId);
    const right = RIGHT_DIR[q];
    const left: [number, number] = [-right[0], -right[1]];
    // Front face is local +Z = the opposite of the back direction.
    const back = BACK_DIR[q];
    const front: [number, number] = [-back[0], -back[1]];
    switch (snapping) {
      case "both":
        return [right, left];
      case "right":
        return [right];
      case "left":
        return [left];
      case "front":
        return [front];
      case "left-front":
        return [left, front];
      case "right-front":
        return [right, front];
      default:
        return [];
    }
  }

  function hasSideFacing(
    instanceId: string,
    dir: [number, number],
  ): boolean {
    return worldSideDirs(instanceId).some(
      (s) => s[0] === dir[0] && s[1] === dir[1],
    );
  }

  // Flush snap position of `draggedId` against `targetId` for the dragged
  // module sitting at (draggedX, draggedZ) — or null if the pair may NOT snap
  // there. This is the single source of truth for snap validity, shared by the
  // live preview (so the SnapIndicator only shows when releasing would actually
  // connect) and by the commit (so what you see is exactly what you get).
  function computeSnapPosition(
    draggedId: string,
    targetId: string,
    draggedX: number,
    draggedZ: number,
  ): [number, number, number] | null {
    const draggedSnapping = getModuleSnappingConfig(draggedId);
    const targetSnapping = getModuleSnappingConfig(targetId);
    const draggedIsSet = draggedId.startsWith("set-");
    const targetIsSet = targetId.startsWith("set-");

    if (
      (draggedIsSet && targetIsSet) ||
      draggedSnapping === "none" ||
      targetSnapping === "none"
    ) {
      return null;
    }

    const targetPos = objectPositions.get(targetId) || [0, 0, 0];

    // Compare and butt the modules by their footprint CENTRES (origin + offset)
    // so off-centre sets join by real geometry; snapPos is converted back to the
    // dragged module's stored origin at the end.
    const [dOffX, dOffZ] = footOffset(draggedId);
    const [tOffX, tOffZ] = footOffset(targetId);
    const dCx = draggedX + dOffX;
    const dCz = draggedZ + dOffZ;
    const tCx = targetPos[0] + tOffX;
    const tCz = targetPos[2] + tOffZ;

    const dx = dCx - tCx;
    const dz = dCz - tCz;
    const absX = Math.abs(dx);
    const absZ = Math.abs(dz);

    const draggedCat = getModuleCategory(draggedId);
    const targetCat = getModuleCategory(targetId);
    // getSnapConfig also gates BLOCKED pairs (e.g. light↔light) — keep that for all cases.
    const config = getSnapConfig(draggedCat, targetCat);
    if (!config) return null;

    // World connection axis + sign: the dominant separation axis decides whether the
    // modules meet left-right (x) or front-back (z); the sign says which side.
    const axis: "x" | "z" = absX > absZ ? "x" : "z";
    const delta = axis === "x" ? dx : dz;
    const sign = delta > 0 ? 1 : -1;

    // Unit vector pointing from the dragged module toward the target (the face that must
    // be active on the dragged side), and its opposite for the target.
    const contactFromDragged: [number, number] =
      axis === "x" ? [-sign, 0] : [0, -sign];
    const contactFromTarget: [number, number] = [
      -contactFromDragged[0],
      -contactFromDragged[1],
    ];

    // Both modules must present an active snapping face toward the contact (rotation-aware).
    if (
      !hasSideFacing(draggedId, contactFromDragged) ||
      !hasSideFacing(targetId, contactFromTarget)
    ) {
      return null;
    }

    const qD = quadrant(draggedId);
    const qT = quadrant(targetId);

    // Block side-by-side snapping between two opposite-facing modules (rotations
    // 180° apart, e.g. one at 0° and one at 180°). Their backs point opposite
    // ways, so a left/right join would seat them back-to-front with no shared
    // back line to align — not a valid row. Only the SIDE faces are blocked:
    // front/back joins and 90° corner joins (which are not 180° apart) stay
    // allowed. When two modules are 180° apart their local axes stay parallel,
    // so a contact along the dragged module's left/right face means the target
    // meets it side-on too — checking the dragged side alone is sufficient.
    const rightDir = RIGHT_DIR[qD];
    const draggedSideContact =
      (contactFromDragged[0] === rightDir[0] &&
        contactFromDragged[1] === rightDir[1]) ||
      (contactFromDragged[0] === -rightDir[0] &&
        contactFromDragged[1] === -rightDir[1]);
    const oppositeFacing = (((qD - qT) % 4) + 4) % 4 === 2;
    if (draggedSideContact && oppositeFacing) {
      return null;
    }

    const perpAxis: "x" | "z" = axis === "x" ? "z" : "x";

    let gap: number;
    let perpOffset: number;
    if (hasMeasuredSize(draggedId) && hasMeasuredSize(targetId)) {
      // Fully automatic: butt the two real footprints flush along the contact
      // axis (centre-to-centre = sum of half-extents). No hand-tuned numbers.
      gap = footHalf(draggedId, axis) + footHalf(targetId, axis);

      // Perpendicular alignment: line the modules up by their BACK face so the
      // back edge of the row is perfectly straight, regardless of differing
      // depths — and rotation-aware. A module's back face lies at
      //   centrePerp + backSign * halfPerp
      // (backSign from its rotation). Equating the two backs gives the centre
      // offset below. If either module's back is perpendicular to this axis
      // (a corner join, backSign 0) there's no shared back line to align to, so
      // we fall back to centring them.
      const sD = backSignAlong(draggedId, perpAxis);
      const sT = backSignAlong(targetId, perpAxis);
      perpOffset =
        sD !== 0 && sT !== 0
          ? sT * footHalf(targetId, perpAxis) -
            sD * footHalf(draggedId, perpAxis)
          : 0;
    } else if (qD === 0 && qT === 0 && axis === "x") {
      // Fallback (model not yet measured): unrotated row — hand-tuned table.
      gap = config.xDist;
      perpOffset = config.zShift;
    } else {
      // Fallback: rotation-aware gap from the per-category footprint table.
      gap =
        halfExtentAlong(draggedCat, qD, axis) +
        halfExtentAlong(targetCat, qT, axis);
      perpOffset = 0;
    }

    // Snapped CENTRE: flush along the contact axis, back-aligned on the perp
    // axis. Convert back to the stored origin by removing the dragged offset.
    let snapCenterX = tCx;
    let snapCenterZ = tCz;
    if (axis === "x") {
      snapCenterX = tCx + sign * gap;
      snapCenterZ = tCz + perpOffset;
    } else {
      snapCenterZ = tCz + sign * gap;
      snapCenterX = tCx + perpOffset;
    }
    const snapPos: [number, number, number] = [
      snapCenterX - dOffX,
      targetPos[1],
      snapCenterZ - dOffZ,
    ];

    // Veto the snap if the target's contact face is already occupied: snapping
    // flush to the target would plant this module on top of whatever is already
    // connected there. The target itself is excluded (flush contact is the
    // intended result); overlap with anyone else means "already connected".
    const snapHitsExclTarget = overlappingIds(
      draggedId,
      snapPos[0],
      snapPos[2],
      new Set([draggedId, targetId]),
    );
    if (snapHitsExclTarget.length > 0) {
      return null;
    }

    return snapPos;
  }

  function commitSnap(): boolean {
    const draggedId = draggedInstanceIdRef.current;
    const targetId = snapTargetIdRef.current;
    if (!isDraggingRef.current || !draggedId || !targetId) return false;

    const draggedPos = objectPositions.get(draggedId) || [0, 0, 0];
    const snapPos = computeSnapPosition(
      draggedId,
      targetId,
      draggedPos[0],
      draggedPos[2],
    );
    if (!snapPos) return false;

    onDragUpdate(draggedId, snapPos);
    onConnect?.(draggedId, targetId);
    return true;
  }

  function endDrag() {
    commitSnap();
    if (isDraggingRef.current) {
      onDragStateChange(false);
      onSnapPreview(null);
    }
    isDraggingRef.current = false;
    draggedInstanceIdRef.current = null;
    snapTargetIdRef.current = null;
    prevDragPosRef.current = null;
  }

  return {
    startDrag,
    updateDrag,
    endDrag,
    get isDragging() {
      return isDraggingRef.current;
    },
    get draggedInstanceId() {
      return draggedInstanceIdRef.current;
    },
  };
}
