import { useRef } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import {
  getModuleSnappingConfig,
  getModuleCategory,
} from "../context/ConfiguratorContext";
import { getSnapConfig, halfExtentAlong } from "../data/snapDistances";

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
  onDragUpdate: (
    instanceId: string,
    position: [number, number, number],
  ) => void;
  onSnapPreview: (preview: SnapPreview | null) => void;
  onDragStateChange: (isDragging: boolean) => void;
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

export function useDragAndSnap({
  sceneObjects,
  objectPositions,
  objectRotations,
  onDragUpdate,
  onSnapPreview,
  onDragStateChange,
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

  function startDrag(
    instanceId: string,
    intersects: THREE.Intersection[],
    canvasRect: DOMRect,
    event: MouseEvent,
  ) {
    draggedInstanceIdRef.current = instanceId;

    mouse.current.x =
      ((event.clientX - canvasRect.left) / canvasRect.width) * 2 - 1;
    mouse.current.y =
      -((event.clientY - canvasRect.top) / canvasRect.height) * 2 + 1;
    raycaster.current.setFromCamera(mouse.current, camera);

    const intersectionPoint = new THREE.Vector3();
    raycaster.current.ray.intersectPlane(dragPlane.current, intersectionPoint);

    let actualObject = intersects[0]?.object as THREE.Object3D | null;
    while (actualObject && !actualObject.userData?.objectId) {
      actualObject = actualObject.parent;
    }
    if (actualObject) {
      const worldPosition = new THREE.Vector3();
      actualObject.getWorldPosition(worldPosition);
      dragOffset.current.copy(worldPosition).sub(intersectionPoint);
    }
  }

  // Slide the dragged module's footprint out of every other module's footprint
  // on the XZ plane. Footprints are axis-aligned rectangles derived from each
  // module's category + 90° rotation quadrant (same data the snap path uses).
  // Resolution pushes along the axis of least penetration; a few passes let the
  // module settle when wedged against several neighbours at once.
  function resolveCollision(
    draggedId: string,
    x: number,
    z: number,
  ): [number, number] {
    const dCat = getModuleCategory(draggedId);
    const dq = quadrant(draggedId);
    const dHalfX = halfExtentAlong(dCat, dq, "x");
    const dHalfZ = halfExtentAlong(dCat, dq, "z");

    let px = x;
    let pz = z;

    for (let pass = 0; pass < 4; pass++) {
      let moved = false;
      sceneObjects.forEach((inst, index) => {
        if (inst.instanceId === draggedId) return;

        const oPos = objectPositions.get(inst.instanceId) || [index * 1.9, 0, 0];
        const oCat = getModuleCategory(inst.instanceId);
        const oq = quadrant(inst.instanceId);
        const sumX = dHalfX + halfExtentAlong(oCat, oq, "x");
        const sumZ = dHalfZ + halfExtentAlong(oCat, oq, "z");

        const dx = px - oPos[0];
        const dz = pz - oPos[2];
        const overlapX = sumX - Math.abs(dx);
        const overlapZ = sumZ - Math.abs(dz);
        // No overlap if separated on either axis.
        if (overlapX <= 0 || overlapZ <= 0) return;

        // Push out along whichever axis needs the smaller correction.
        if (overlapX < overlapZ) {
          px += dx >= 0 ? overlapX : -overlapX;
        } else {
          pz += dz >= 0 ? overlapZ : -overlapZ;
        }
        moved = true;
      });
      if (!moved) break;
    }

    return [px, pz];
  }

  function updateDrag(event: MouseEvent, canvasRect: DOMRect) {
    if (draggedInstanceIdRef.current === null) return;

    if (!isDraggingRef.current) {
      isDraggingRef.current = true;
      onDragStateChange(true);
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
    const [resolvedX, resolvedZ] = resolveCollision(
      draggedId,
      intersectionPoint.x,
      intersectionPoint.z,
    );
    intersectionPoint.x = resolvedX;
    intersectionPoint.z = resolvedZ;

    const draggedSnapping = getModuleSnappingConfig(draggedId);

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
        if (dist < closestDistance) {
          closestDistance = dist;
          closestId = inst.instanceId;
        }
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

  // World-space directions of a module's ACTIVE snapping faces, accounting for rotation.
  function worldSideDirs(instanceId: string): [number, number][] {
    const snapping = getModuleSnappingConfig(instanceId);
    if (snapping === "none") return [];
    const right = RIGHT_DIR[quadrant(instanceId)];
    const left: [number, number] = [-right[0], -right[1]];
    if (snapping === "both") return [right, left];
    if (snapping === "right") return [right];
    if (snapping === "left") return [left];
    return [];
  }

  function hasSideFacing(
    instanceId: string,
    dir: [number, number],
  ): boolean {
    return worldSideDirs(instanceId).some(
      (s) => s[0] === dir[0] && s[1] === dir[1],
    );
  }

  function commitSnap(): boolean {
    const draggedId = draggedInstanceIdRef.current;
    const targetId = snapTargetIdRef.current;
    if (!isDraggingRef.current || !draggedId || !targetId) return false;

    const draggedSnapping = getModuleSnappingConfig(draggedId);
    const targetSnapping = getModuleSnappingConfig(targetId);
    const draggedIsSet = draggedId.startsWith("set-");
    const targetIsSet = targetId.startsWith("set-");

    if (
      (draggedIsSet && targetIsSet) ||
      draggedSnapping === "none" ||
      targetSnapping === "none"
    ) {
      return false;
    }

    const draggedPos = objectPositions.get(draggedId) || [0, 0, 0];
    const targetPos = objectPositions.get(targetId) || [0, 0, 0];

    const dx = draggedPos[0] - targetPos[0];
    const dz = draggedPos[2] - targetPos[2];
    const absX = Math.abs(dx);
    const absZ = Math.abs(dz);

    const draggedCat = getModuleCategory(draggedId);
    const targetCat = getModuleCategory(targetId);
    // getSnapConfig also gates BLOCKED pairs (e.g. light↔light) — keep that for all cases.
    const config = getSnapConfig(draggedCat, targetCat);
    if (!config) return false;

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
      return false;
    }

    const qD = quadrant(draggedId);
    const qT = quadrant(targetId);
    const perpAxis: "x" | "z" = axis === "x" ? "z" : "x";

    let gap: number;
    let perpOffset: number;
    if (qD === 0 && qT === 0 && axis === "x") {
      // Unrotated row case — preserve the exact hand-tuned table behaviour.
      gap = config.xDist;
      perpOffset = config.zShift;
    } else {
      // Rotation-aware: derive the center-to-center gap from per-category footprints,
      // and align centers on the perpendicular axis (corner pairs have zShift 0).
      gap =
        halfExtentAlong(draggedCat, qD, axis) +
        halfExtentAlong(targetCat, qT, axis);
      perpOffset = 0;
    }

    const snapPos: [number, number, number] = [
      targetPos[0],
      targetPos[1],
      targetPos[2],
    ];
    snapPos[axis === "x" ? 0 : 2] =
      targetPos[axis === "x" ? 0 : 2] + sign * gap;
    snapPos[perpAxis === "x" ? 0 : 2] =
      targetPos[perpAxis === "x" ? 0 : 2] + perpOffset;

    onDragUpdate(draggedId, snapPos);
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
