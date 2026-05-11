import { useRef } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { getModuleSnappingConfig, getModuleCategory } from "../context/ConfiguratorContext";
import { getSnapConfig } from "../data/snapDistances";

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
  onDragUpdate: (instanceId: string, position: [number, number, number]) => void;
  onSnapPreview: (preview: SnapPreview | null) => void;
  onDragStateChange: (isDragging: boolean) => void;
  SNAP_DISTANCE?: number;
}

export function useDragAndSnap({
  sceneObjects,
  objectPositions,
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

  function startDrag(instanceId: string, intersects: THREE.Intersection[], canvasRect: DOMRect, event: MouseEvent) {
    draggedInstanceIdRef.current = instanceId;

    mouse.current.x = ((event.clientX - canvasRect.left) / canvasRect.width) * 2 - 1;
    mouse.current.y = -((event.clientY - canvasRect.top) / canvasRect.height) * 2 + 1;
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

  function updateDrag(event: MouseEvent, canvasRect: DOMRect) {
    if (draggedInstanceIdRef.current === null) return;

    if (!isDraggingRef.current) {
      isDraggingRef.current = true;
      onDragStateChange(true);
    }

    mouse.current.x = ((event.clientX - canvasRect.left) / canvasRect.width) * 2 - 1;
    mouse.current.y = -((event.clientY - canvasRect.top) / canvasRect.height) * 2 + 1;
    raycaster.current.setFromCamera(mouse.current, camera);

    const intersectionPoint = new THREE.Vector3();
    if (!raycaster.current.ray.intersectPlane(dragPlane.current, intersectionPoint)) return;
    intersectionPoint.add(dragOffset.current);

    const draggedId = draggedInstanceIdRef.current;
    const draggedSnapping = getModuleSnappingConfig(draggedId);

    let closestId: string | null = null;
    let closestDistance = SNAP_DISTANCE;

    if (draggedSnapping !== "none") {
      sceneObjects.forEach((inst, index) => {
        if (inst.instanceId === draggedId) return;
        if (getModuleSnappingConfig(inst.instanceId) === "none") return;

        const targetPos = objectPositions.get(inst.instanceId) || [index * 1.4, 0, 0];
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
        fromPos: [intersectionPoint.x, intersectionPoint.y, intersectionPoint.z],
        toPos: targetPos as [number, number, number],
      });
    } else {
      onSnapPreview(null);
    }

    onDragUpdate(draggedId, [intersectionPoint.x, intersectionPoint.y, intersectionPoint.z]);
  }

  function commitSnap(): boolean {
    const draggedId = draggedInstanceIdRef.current;
    const targetId = snapTargetIdRef.current;
    if (!isDraggingRef.current || !draggedId || !targetId) return false;

    const draggedSnapping = getModuleSnappingConfig(draggedId);
    const targetSnapping = getModuleSnappingConfig(targetId);
    const draggedIsSet = draggedId.startsWith("sofa-");
    const targetIsSet = targetId.startsWith("sofa-");

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
    const config = getSnapConfig(draggedCat, targetCat);

    let snapPos: [number, number, number] | null = null;

    if (absX > absZ) {
      // Left-right snapping
      const isRight = dx > 0;
      const draggedSide = isRight ? "left" : "right";
      const targetSide = isRight ? "right" : "left";
      const canDragged = draggedSnapping === "both" || draggedSnapping === draggedSide;
      const canTarget = targetSnapping === "both" || targetSnapping === targetSide;
      if (canDragged && canTarget) {
        snapPos = [
          targetPos[0] + (dx > 0 ? config.xDist : -config.xDist),
          targetPos[1],
          targetPos[2] + config.zShift,
        ];
      }
    } else {
      // Front-back snapping
      const isBack = dz > 0;
      const draggedSide = isBack ? "left" : "right";
      const targetSide = isBack ? "right" : "left";
      const canDragged = draggedSnapping === "both" || draggedSnapping === draggedSide;
      const canTarget = targetSnapping === "both" || targetSnapping === targetSide;
      if (canDragged && canTarget) {
        snapPos = [
          targetPos[0] + config.zShift,
          targetPos[1],
          targetPos[2] + (dz > 0 ? config.zDist : -config.zDist),
        ];
      }
    }

    if (snapPos) {
      onDragUpdate(draggedId, snapPos);
      return true;
    }
    return false;
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
    get isDragging() { return isDraggingRef.current; },
    get draggedInstanceId() { return draggedInstanceIdRef.current; },
  };
}
