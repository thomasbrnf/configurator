import { useRef } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";

interface UseObjectSelectionOptions {
  onSelect: (objectId: string) => void;
  onDeselect: () => void;
}

export function useObjectSelection({
  onSelect,
  onDeselect,
}: UseObjectSelectionOptions) {
  const { camera, scene } = useThree();
  const raycaster = useRef(new THREE.Raycaster());
  const mouse = useRef(new THREE.Vector2());

  function resolveObjectId(intersects: THREE.Intersection[]): string | null {
    for (const intersect of intersects) {
      let obj: THREE.Object3D | null = intersect.object;
      while (obj && obj.parent) {
        if (obj.userData?.objectId) return obj.userData.objectId as string;
        obj = obj.parent;
      }
    }
    return null;
  }

  function handleClick(
    event: MouseEvent,
    canvasRect: DOMRect,
    selectedObjectId: string | null,
  ) {
    mouse.current.x =
      ((event.clientX - canvasRect.left) / canvasRect.width) * 2 - 1;
    mouse.current.y =
      -((event.clientY - canvasRect.top) / canvasRect.height) * 2 + 1;

    raycaster.current.setFromCamera(mouse.current, camera);
    const intersects = raycaster.current.intersectObjects(scene.children, true);

    if (intersects.length === 0) {
      onDeselect();
      return;
    }

    const objectId = resolveObjectId(intersects);
    if (!objectId) {
      onDeselect();
      return;
    }

    if (objectId === selectedObjectId) {
      onDeselect();
    } else {
      onSelect(objectId);
    }
  }

  function getRaycasterIntersects(
    event: MouseEvent,
    canvasRect: DOMRect,
  ): THREE.Intersection[] {
    mouse.current.x =
      ((event.clientX - canvasRect.left) / canvasRect.width) * 2 - 1;
    mouse.current.y =
      -((event.clientY - canvasRect.top) / canvasRect.height) * 2 + 1;
    raycaster.current.setFromCamera(mouse.current, camera);
    return raycaster.current.intersectObjects(scene.children, true);
  }

  return { handleClick, getRaycasterIntersects, resolveObjectId };
}
