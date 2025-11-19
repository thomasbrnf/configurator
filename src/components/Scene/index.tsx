import { ContactShadows, Environment, OrbitControls, Line } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useControls, Leva } from "leva";
import { DynamicModel } from "../DynamicModel";
import { ContextMenu } from "../ContextMenu";
import ControlsInfo from "../ControlsInfo";
import * as THREE from "three";
import { useEffect, useRef, useState, createContext, useContext, useMemo } from "react";
import { useMaterial } from "../../context/MaterialContext";
import { useConfigurator, getModuleSnappingConfig } from "../../context/ConfiguratorContext";
import { useLanguage } from "../../context/LanguageContext";


interface SceneContextType {
  handleRecenter: () => void;
  isAutoCenterEnabled: boolean;
  setIsAutoCenterEnabled: (enabled: boolean) => void;
}

const SceneContext = createContext<SceneContextType | null>(null);

export const useScene = () => {
  const context = useContext(SceneContext);
  if (!context) {
    throw new Error('useScene must be used within SceneProvider');
  }
  return context;
};

// Internal component that uses the scene context
function SceneControls() {
  const { handleRecenter, isAutoCenterEnabled, setIsAutoCenterEnabled } = useScene();
  
  return (
    <ControlsInfo 
      onRecenter={handleRecenter} 
      isAutoCenterEnabled={isAutoCenterEnabled}
      onToggleAutoCenter={setIsAutoCenterEnabled}
    />
  );
}

function CameraController() {
  const { camera } = useThree();

  const {
    enableManualCamera,
    positionX,
    positionY,
    positionZ,
    fov,
    targetX,
    targetY,
    targetZ,
  } = useControls(
    "Camera",
    {
      enableManualCamera: { value: false },
      positionX: { value: 1.7, min: -50, max: 50, step: 0.1 },
      positionY: { value: 27.8, min: 0.1, max: 50, step: 0.1 },
      positionZ: { value: 9.1, min: -50, max: 50, step: 0.1 },
      fov: { value: 60, min: 10, max: 120, step: 1 },
      targetX: { value: -2.2, min: -10, max: 10, step: 0.1 },
      targetY: { value: -3.3, min: -10, max: 10, step: 0.1 },
      targetZ: { value: -6, min: -10, max: 10, step: 0.1 },
    },
    { collapsed: true },
  );

  useFrame(() => {
    if (camera && camera instanceof THREE.PerspectiveCamera) {
      camera.fov = fov;
      camera.updateProjectionMatrix();

      if (enableManualCamera) {
        camera.position.set(positionX, positionY, positionZ);
        camera.lookAt(targetX, targetY, targetZ);
      }
    }
  });

  return null;
}

// Tone Mapping Controller Component
function ToneMappingController() {
  const { gl } = useThree();

  const { toneMapping, exposure } = useControls(
    "Tone Mapping",
    {
      toneMapping: {
        value: "CineonToneMapping",
        options: {
          "No Tone Mapping": "NoToneMapping",
          Linear: "LinearToneMapping",
          Reinhard: "ReinhardToneMapping",
          Cineon: "CineonToneMapping",
          "ACES Filmic": "ACESFilmicToneMapping",
          AgX: "AgXToneMapping",
          Neutral: "NeutralToneMapping",
        },
      },
      exposure: { value: 0.4, min: 0.1, max: 3, step: 0.1 },
    },
    { collapsed: true },
  );

  useEffect(() => {
    // Map string values to THREE.js constants
    const toneMappingMap: { [key: string]: number } = {
      NoToneMapping: THREE.NoToneMapping,
      LinearToneMapping: THREE.LinearToneMapping,
      ReinhardToneMapping: THREE.ReinhardToneMapping,
      CineonToneMapping: THREE.CineonToneMapping,
      ACESFilmicToneMapping: THREE.ACESFilmicToneMapping,
      AgXToneMapping:
        (THREE as any).AgXToneMapping || THREE.ACESFilmicToneMapping,
      NeutralToneMapping:
        (THREE as any).NeutralToneMapping || THREE.ACESFilmicToneMapping,
    };

    gl.toneMapping =
      (toneMappingMap[toneMapping] as THREE.ToneMapping) ||
      THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = exposure;
  }, [gl, toneMapping, exposure]);

  return null;
}

// Auto Center Camera Component
function AutoCenterCamera({ 
  orbitControlsRef,
  objectPositions,
  sceneObjects,
  enabled = true,
  isDragging = false,
  recenterTrigger = 0,
}: { 
  orbitControlsRef: React.MutableRefObject<any>;
  objectPositions: Map<number, [number, number, number]>;
  sceneObjects: string[];
  enabled?: boolean;
  isDragging?: boolean;
  recenterTrigger?: number;
}) {
  const { camera } = useThree();
  const desiredTargetRef = useRef(new THREE.Vector3(0, 0.2, 0));
  const currentTargetRef = useRef(new THREE.Vector3(0, 0.2, 0));
  const initializedRef = useRef(false);
  const userHasInteractedRef = useRef(false);
  const previousSceneCountRef = useRef(0);
  const isRecentering = useRef(false);

  // Handle manual recenter trigger - with camera repositioning
  useEffect(() => {
    // Don't recenter if currently dragging an object
    if (recenterTrigger > 0 && sceneObjects.length > 0 && !isDragging) {
      userHasInteractedRef.current = false;
      currentTargetRef.current.copy(desiredTargetRef.current);
      isRecentering.current = true;
      
      // Calculate bounds of all objects
      let minX = Infinity, maxX = -Infinity;
      let minZ = Infinity, maxZ = -Infinity;
      
      sceneObjects.forEach((_, index) => {
        const position = objectPositions.get(index) || [index * 1.4, 0, 0];
        minX = Math.min(minX, position[0]);
        maxX = Math.max(maxX, position[0]);
        minZ = Math.min(minZ, position[2]);
        maxZ = Math.max(maxZ, position[2]);
      });
      
      const centerX = (minX + maxX) / 2;
      const centerZ = (minZ + maxZ) / 2;
      const sceneWidth = maxX - minX;
      const sceneDepth = maxZ - minZ;
      const sceneSize = Math.max(sceneWidth, sceneDepth);
      
      // Calculate optimal camera distance to see all objects
      // Add padding factor to ensure all objects are visible
      const paddingFactor = 1.5;
      const distance = Math.max(sceneSize * paddingFactor, 3);
      
      // Position camera at an angle from above and behind
      const cameraHeight = distance * 0.6; // Height from ground
      const cameraBack = distance * 0.8; // Distance back from center
      
      // Set the center point where camera should look at
      const centerPoint = new THREE.Vector3(centerX, 0.2, centerZ);
      
      // Update desired target to the center of objects
      desiredTargetRef.current.copy(centerPoint);
      currentTargetRef.current.copy(centerPoint);
      
      // Smooth transition to new camera position
      const targetCameraPos = new THREE.Vector3(
        centerX,
        cameraHeight,
        centerZ + cameraBack
      );
      
      // Animate camera to new position and update orbit controls target
      const animateCamera = () => {
        if (camera && orbitControlsRef.current && isRecentering.current) {
          camera.position.lerp(targetCameraPos, 0.1);
          
          // Also update the orbit controls target to look at the center
          orbitControlsRef.current.target.lerp(centerPoint, 0.1);
          orbitControlsRef.current.update();
          
          // Check if camera is close enough to target position
          if (camera.position.distanceTo(targetCameraPos) < 0.1) {
            isRecentering.current = false;
          }
        }
      };
      
      // Start animation
      const interval = setInterval(() => {
        animateCamera();
        if (!isRecentering.current) {
          clearInterval(interval);
        }
      }, 16); // ~60fps
      
      return () => clearInterval(interval);
    }
  }, [recenterTrigger, sceneObjects, objectPositions, camera]);

  useEffect(() => {
    const controls = orbitControlsRef.current;
    if (!controls) return;

    const handleStart = () => {
      // Mark that user has manually controlled the camera
      userHasInteractedRef.current = true;
    };

    controls.addEventListener('start', handleStart);

    return () => {
      controls.removeEventListener('start', handleStart);
    };
  }, [orbitControlsRef]);

  useEffect(() => {
    if (!enabled || isDragging) return;
    
    // Check if the scene has changed (objects added/removed)
    const sceneChanged = previousSceneCountRef.current !== sceneObjects.length;
    
    if (sceneObjects.length === 0) {
      desiredTargetRef.current.set(0, 0.2, 0);
      initializedRef.current = false;
      previousSceneCountRef.current = 0;
      // Reset user interaction flag when scene is empty
      userHasInteractedRef.current = false;
      return;
    }

    // Only recalculate if scene changed (objects added/removed)
    // Don't recalculate if user has manually interacted and scene hasn't changed
    if (!sceneChanged && userHasInteractedRef.current) {
      return;
    }

    // Calculate the center of all objects
    let totalX = 0;
    let totalY = 0;
    let totalZ = 0;
    let count = 0;

    sceneObjects.forEach((_, index) => {
      const position = objectPositions.get(index) || [index * 3, 0, 0];
      totalX += position[0];
      totalY += position[1];
      totalZ += position[2];
      count++;
    });

    if (count > 0) {
      const centerX = totalX / count;
      const centerY = totalY / count + 0.2; // Add slight offset for better viewing
      const centerZ = totalZ / count;

      desiredTargetRef.current.set(centerX, centerY, centerZ);
      
      // Initialize current target on first calculation or when scene changes
      if (!initializedRef.current || sceneChanged) {
        currentTargetRef.current.copy(desiredTargetRef.current);
        initializedRef.current = true;
        // Reset user interaction flag when scene changes
        userHasInteractedRef.current = false;
      }
      
      previousSceneCountRef.current = sceneObjects.length;
    }
  }, [sceneObjects, objectPositions, enabled, isDragging]);

  // Smooth interpolation using useFrame
  useFrame(() => {
    if (!enabled || !orbitControlsRef.current || isDragging) return;
    
    // Only animate if user hasn't manually interacted
    if (userHasInteractedRef.current) return;
    
    // Smoothly lerp the current target towards the desired target
    currentTargetRef.current.lerp(desiredTargetRef.current, 0.1);
    orbitControlsRef.current.target.copy(currentTargetRef.current);
    orbitControlsRef.current.update();
  });

  return null;
}

// Pan Constraint Component - prevents panning below ground
function PanConstraint({ 
  orbitControlsRef,
}: { 
  orbitControlsRef: React.MutableRefObject<any>;
}) {
  useFrame(() => {
    if (!orbitControlsRef.current) return;
    
    const target = orbitControlsRef.current.target;
    
    // Constrain target Y to not go below 0 (ground level)
    if (target.y < 0) {
      target.y = 0;
      orbitControlsRef.current.update();
    }
  });

  return null;
}

// Click Handler Component with Raycaster
function ClickHandler({
  onContextMenu,
  sceneObjects,
  onDragUpdate,
  onDragStateChange,
  onSnapPreview,
}: {
  onContextMenu: (
    x: number,
    y: number,
    objectId: string,
    index: number,
  ) => void;
  sceneObjects: string[];
  onDragUpdate: (index: number, position: [number, number, number]) => void;
  onDragStateChange: (isDragging: boolean) => void;
  onSnapPreview: (snapInfo: { fromIndex: number; toIndex: number; fromPos: [number, number, number]; toPos: [number, number, number] } | null) => void;
}) {
  const { camera, scene, gl } = useThree();
  const { selectedObjectId, setSelectedObjectId } = useMaterial();
  const { objectPositions } = useConfigurator();
  const raycaster = useRef(new THREE.Raycaster());
  const mouse = useRef(new THREE.Vector2());
  const [isRotating, setIsRotating] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedObjectIndex, setDraggedObjectIndex] = useState<number | null>(null);
  const [snapTargetIndex, setSnapTargetIndex] = useState<number | null>(null);
  const mouseDownRef = useRef<{ x: number; y: number } | null>(null);
  const dragPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
  const dragOffset = useRef(new THREE.Vector3());
  const SNAP_DISTANCE = 1.8; // Distance threshold for snapping

  useEffect(() => {
    function handleMouseDown(event: MouseEvent) {
      // Ignore right clicks
      if (event.button === 2) return;

      mouseDownRef.current = { x: event.clientX, y: event.clientY };
      setIsRotating(false);
      setIsDragging(false);

      if (selectedObjectId) {
        const rect = gl.domElement.getBoundingClientRect();
        mouse.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.current.setFromCamera(mouse.current, camera);
        const intersects = raycaster.current.intersectObjects(
          scene.children,
          true,
        );

        if (intersects.length > 0) {
          let objectId = null;
          for (const intersect of intersects) {
            let obj = intersect.object;
            while (obj && obj.parent) {
              if (obj.userData?.objectId) {
                objectId = obj.userData.objectId;
                break;
              }
              obj = obj.parent;
            }
            if (objectId) break;
          }

          // If clicked on the selected object, prepare for dragging
          if (objectId === selectedObjectId) {
            const index = sceneObjects.findIndex((id) => id === objectId);
            setDraggedObjectIndex(index);

            // Calculate intersection point with drag plane
            const intersectionPoint = new THREE.Vector3();
            raycaster.current.ray.intersectPlane(
              dragPlane.current,
              intersectionPoint,
            );

            // Find the actual object in the scene to get its world position
            let actualObject = intersects[0].object;
            while (actualObject && !actualObject.userData?.objectId) {
              actualObject = actualObject.parent as THREE.Object3D;
            }

            if (actualObject) {
              const worldPosition = new THREE.Vector3();
              actualObject.getWorldPosition(worldPosition);
              dragOffset.current.copy(worldPosition).sub(intersectionPoint);
            }
          }
        }
      }
    }

    function handleContextMenu(event: MouseEvent) {
      // Prevent default right-click menu
      event.preventDefault();
    }

    function handleMouseMove(event: MouseEvent) {
      if (mouseDownRef.current) {
        const deltaX = Math.abs(event.clientX - mouseDownRef.current.x);
        const deltaY = Math.abs(event.clientY - mouseDownRef.current.y);

        // If mouse moved more than 5 pixels
        if (deltaX > 5 || deltaY > 5) {
          // If dragging a selected object, update its position
          if (draggedObjectIndex !== null) {
            if (!isDragging) {
              setIsDragging(true);
              onDragStateChange(true);
            }

            const rect = gl.domElement.getBoundingClientRect();
            mouse.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

            raycaster.current.setFromCamera(mouse.current, camera);

            const intersectionPoint = new THREE.Vector3();
            if (raycaster.current.ray.intersectPlane(dragPlane.current, intersectionPoint)) {
              // Apply the offset to maintain the original click position
              intersectionPoint.add(dragOffset.current);
              
              // Get snapping configuration for dragged object
              const draggedObjectId = sceneObjects[draggedObjectIndex];
              const draggedSnapping = getModuleSnappingConfig(draggedObjectId);
              
              // Check for nearby objects to snap to (only if dragged object can snap)
              let closestIndex: number | null = null;
              let closestDistance = SNAP_DISTANCE;
              
              if (draggedSnapping !== "none") {
                sceneObjects.forEach((objectId, index) => {
                  if (index !== draggedObjectIndex) {
                    const targetSnapping = getModuleSnappingConfig(objectId);
                    
                    // Only consider snapping if target object can also snap
                    if (targetSnapping !== "none") {
                      const targetPos = objectPositions.get(index) || [index * 1.4, 0, 0];
                      const distance = Math.sqrt(
                        Math.pow(intersectionPoint.x - targetPos[0], 2) +
                        Math.pow(intersectionPoint.z - targetPos[2], 2)
                      );
                      
                      if (distance < closestDistance) {
                        closestDistance = distance;
                        closestIndex = index;
                      }
                    }
                  }
                });
              }
              
              // Update snap target and preview
              setSnapTargetIndex(closestIndex);
              if (closestIndex !== null) {
                const targetPos = objectPositions.get(closestIndex) || [closestIndex * 1.4, 0, 0];
                onSnapPreview({
                  fromIndex: draggedObjectIndex,
                  toIndex: closestIndex,
                  fromPos: [intersectionPoint.x, intersectionPoint.y, intersectionPoint.z],
                  toPos: targetPos as [number, number, number],
                });
              } else {
                onSnapPreview(null);
              }
              
              onDragUpdate(draggedObjectIndex, [
                intersectionPoint.x,
                intersectionPoint.y,
                intersectionPoint.z,
              ]);
            }
          } else {
            // Otherwise, it's a camera rotation
            setIsRotating(true);
          }
        }
      }
    }

    function handleMouseUp(event: MouseEvent) {
      // Only process click if we weren't rotating or dragging
      if (!isRotating && !isDragging && mouseDownRef.current) {
        // Calculate mouse position in normalized device coordinates
        const rect = gl.domElement.getBoundingClientRect();
        mouse.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        // Update the picking ray with the camera and mouse position
        raycaster.current.setFromCamera(mouse.current, camera);

        // Calculate objects intersecting the picking ray
        const intersects = raycaster.current.intersectObjects(
          scene.children,
          true,
        );

        if (intersects.length > 0) {
          // Find the first intersected object that has a name or parent with userData.objectId
          let targetObject = null;
          let objectId = null;

          for (const intersect of intersects) {
            let obj = intersect.object;

            // Traverse up the hierarchy to find an object with objectId
            while (obj && obj.parent) {
              if (obj.userData?.objectId) {
                targetObject = obj;
                objectId = obj.userData.objectId;
                break;
              }
              obj = obj.parent;
            }

            if (targetObject) break;
          }

          if (objectId) {
            // If object is already selected, deselect it
            if (selectedObjectId === objectId) {
              setSelectedObjectId(null);
            } else {
              // Select the object and show context menu on the left side
              setSelectedObjectId(objectId);
              const index = sceneObjects.findIndex((id) => id === objectId);
              const leftX = 220; // 220px from left edge (below controls)
              onContextMenu(leftX, event.clientY, objectId, index);
            }
          } else {
            // Clicked on object but no objectId found, deselect current selection
            setSelectedObjectId(null);
          }
        } else {
          // Clicked on empty space, deselect current selection
          setSelectedObjectId(null);
        }
      }

      // Handle snapping on drag release
      if (isDragging && draggedObjectIndex !== null && snapTargetIndex !== null) {
        const draggedObjectId = sceneObjects[draggedObjectIndex];
        const targetObjectId = sceneObjects[snapTargetIndex];
        
        // Get snapping configuration for both objects
        const draggedSnapping = getModuleSnappingConfig(draggedObjectId);
        const targetSnapping = getModuleSnappingConfig(targetObjectId);
        
        // Don't snap if either object has "none" snapping
        if (draggedSnapping === "none" || targetSnapping === "none") {
          mouseDownRef.current = null;
          setIsRotating(false);
          if (isDragging) {
            onDragStateChange(false);
            onSnapPreview(null);
          }
          setIsDragging(false);
          setDraggedObjectIndex(null);
          setSnapTargetIndex(null);
          return;
        }
        
        const draggedPos = objectPositions.get(draggedObjectIndex) || [draggedObjectIndex * 1.4, 0, 0];
        const targetPos = objectPositions.get(snapTargetIndex) || [snapTargetIndex * 1.4, 0, 0];
        
        // Calculate direction from target to dragged object
        const dx = draggedPos[0] - targetPos[0];
        const dz = draggedPos[2] - targetPos[2];
        
        // Determine primary snap axis (which direction has more movement)
        const absX = Math.abs(dx);
        const absZ = Math.abs(dz);
        
        // Determine snap distance based on module names
        const draggedIsLong = draggedObjectId.toLowerCase().includes('long');
        const targetIsLong = targetObjectId.toLowerCase().includes('long');
        
        let snapDistance: number;
        if (draggedIsLong && targetIsLong) {
          // Both modules are "long"
          snapDistance = 1.18;
        } else if (draggedIsLong || targetIsLong) {
          // One module is "long", the other is not
          snapDistance = 1.03;
        } else {
          // Neither module is "long"
          snapDistance = 1.02;
        }
        
       
        let zShift = 0;
        if (draggedIsLong && !targetIsLong) {
          zShift = 0.319;
        } else if (!draggedIsLong && targetIsLong) {
          zShift = -0.319;
        }
        
        let snapPos: [number, number, number] | null = null;
        
        if (absX > absZ) {
          // Snapping left-right
          const isSnappingToRight = dx > 0; // Dragged object is to the RIGHT of target
          
          // Check if dragged object can snap on the side it's approaching from
          // If dragged is to the RIGHT of target, it's using its LEFT side to connect
          // If dragged is to the LEFT of target, it's using its RIGHT side to connect
          const draggedSideUsed = isSnappingToRight ? "left" : "right";
          const targetSideUsed = isSnappingToRight ? "right" : "left";
          
          const canDraggedSnap = draggedSnapping === "both" || draggedSnapping === draggedSideUsed;
          const canTargetSnap = targetSnapping === "both" || targetSnapping === targetSideUsed;
          
          if (canDraggedSnap && canTargetSnap) {
            snapPos = [
              targetPos[0] + (dx > 0 ? snapDistance : -snapDistance), // Position left or right
              targetPos[1], // Same height
              targetPos[2] + zShift  // ALIGNED Z-axis with shift for mixed long/regular modules
            ];
          }
        } else {
          // Snapping front-back
          const isSnappingToBack = dz > 0; // Dragged object is to the BACK of target (positive Z)
          
          // When snapping front-back, we need to determine which side connects
          // This depends on the orientation - for now we'll allow if either object allows both sides
          // or we could map front/back to left/right based on orientation
          const draggedSideUsed = isSnappingToBack ? "left" : "right";
          const targetSideUsed = isSnappingToBack ? "right" : "left";
          
          const canDraggedSnap = draggedSnapping === "both" || draggedSnapping === draggedSideUsed;
          const canTargetSnap = targetSnapping === "both" || targetSnapping === targetSideUsed;
          
          if (canDraggedSnap && canTargetSnap) {
            snapPos = [
              targetPos[0] + zShift,  // ALIGNED X-axis with shift for mixed long/regular modules
              targetPos[1],  // Same height
              targetPos[2] + (dz > 0 ? snapDistance : -snapDistance) // Position front or back
            ];
          }
        }
        
        if (snapPos) {
          onDragUpdate(draggedObjectIndex, snapPos);
        }
      }
      
      mouseDownRef.current = null;
      setIsRotating(false);
      if (isDragging) {
        onDragStateChange(false);
        onSnapPreview(null); // Clear snap preview
      }
      setIsDragging(false);
      setDraggedObjectIndex(null);
      setSnapTargetIndex(null);
    }

    const canvas = gl.domElement;
    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseup", handleMouseUp);
    canvas.addEventListener("contextmenu", handleContextMenu);

    return () => {
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseup", handleMouseUp);
      canvas.removeEventListener("contextmenu", handleContextMenu);
    };
  }, [
    camera,
    scene,
    gl,
    selectedObjectId,
    setSelectedObjectId,
    isRotating,
    isDragging,
    draggedObjectIndex,
    sceneObjects,
    onContextMenu,
    onDragUpdate,
    onDragStateChange,
  ]);

  return null;
}

// Camera animation component for rotation mode
function RotationModeCamera() {
  const { camera } = useThree();
  const { rotationControlIndex } = useConfigurator();
  const savedCameraPosition = useRef<THREE.Vector3 | null>(null);

  useFrame(() => {
    if (rotationControlIndex !== null && camera) {
      // Save original camera position on first activation
      if (!savedCameraPosition.current) {
        savedCameraPosition.current = camera.position.clone();
      }

      // Calculate the position of the object being rotated
      const objectX = rotationControlIndex * 3;
      const targetPosition = new THREE.Vector3(objectX, 0, 0);

      // Position camera directly above the object
      const topViewPosition = new THREE.Vector3(objectX, 5, 0);

      // Smoothly animate camera to top view
      camera.position.lerp(topViewPosition, 0.1);
      camera.lookAt(targetPosition);
    } else if (savedCameraPosition.current) {
      // Restore camera position when exiting rotation mode
      camera.position.lerp(savedCameraPosition.current, 0.1);

      // Check if camera is close enough to saved position
      if (camera.position.distanceTo(savedCameraPosition.current) < 0.1) {
        savedCameraPosition.current = null;
      }
    }
  });

  return null;
}

// Snap Indicator Component - shows visual feedback when objects can snap
function SnapIndicator({ 
  fromPos, 
  toPos 
}: { 
  fromPos: [number, number, number]; 
  toPos: [number, number, number];
}) {
  const { fromEdge, toEdge } = useMemo(() => {
    // Calculate the direction vector from dragged object to target
    const dx = toPos[0] - fromPos[0];
    const dz = toPos[2] - fromPos[2];
    const distance = Math.sqrt(dx * dx + dz * dz);
    
    // Normalize direction
    const dirX = dx / distance;
    const dirZ = dz / distance;
    
    // Approximate object width (adjust based on your models)
    const objectWidth = 0.4;
    
    // Calculate edge positions - where objects will connect
    // For dragged object: edge closest to target
    const fromEdgePos: [number, number, number] = [
      fromPos[0] + dirX * objectWidth,
      fromPos[1] + 0.3,
      fromPos[2] + dirZ * objectWidth
    ];
    
    // For target object: edge closest to dragged object
    const toEdgePos: [number, number, number] = [
      toPos[0] - dirX * objectWidth,
      toPos[1] + 0.3,
      toPos[2] - dirZ * objectWidth
    ];
    
    return { fromEdge: fromEdgePos, toEdge: toEdgePos };
  }, [fromPos, toPos]);
  
  const linePoints = useMemo(() => {
    return [fromEdge, toEdge] as [number, number, number][];
  }, [fromEdge, toEdge]);
  
  return (
    <group>
      {/* Line connecting the two snap points on edges */}
      <Line
        points={linePoints}
        color="#06402b"
        lineWidth={1}
        dashed={true}
        dashSize={0.1}
        gapSize={0.05}
      />
      
      {/* Green circle with magnet icon at dragged object edge */}
      <group position={fromEdge}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.02, 0.03, 32]} />
          <meshBasicMaterial color="#06402b"  />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.02, 32]} />
          <meshBasicMaterial color="#06402b"   />
        </mesh>
      </group>
      
      {/* Green circle with magnet icon at target object edge */}
      <group position={toEdge}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.02, 0.03, 32]} />
          <meshBasicMaterial color="#06402b"  />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.02, 32]} />
          <meshBasicMaterial color="#06402b" />
        </mesh>
      </group>
    </group>
  );
}

// Component to render all objects in the scene
function SceneObjects({ snapPreview }: { snapPreview: { 
  fromIndex: number; 
  toIndex: number; 
  fromPos: [number, number, number]; 
  toPos: [number, number, number];
} | null }) {
  const {
    sceneObjects,
    objectRotations,
    objectPositions,

  } = useConfigurator();

  return (
    <>
      {sceneObjects.map((objectId, index) => {
        const position = objectPositions.get(index) || [index * 1.4, 0, 0];
        return (
          <group key={`${objectId}-${index}`}>
            <DynamicModel
              objectId={objectId}
              position={position as [number, number, number]}
              rotation={objectRotations.get(index) || [0, 0, 0]}
            />
      
          </group>
        );
      })}
      
      {/* Show snap indicator when dragging near another object */}
      {snapPreview && (
        <SnapIndicator 
          fromPos={snapPreview.fromPos} 
          toPos={snapPreview.toPos}
        />
      )}
    </>
  );
}

const Scene = () => {
  const { setUvScale, setNormalScale, setMetalness, setRoughness, selectedObjectId } =
    useMaterial();
  const {
    sceneObjects,
    removeObjectByIndex,
    rotationControlIndex,
    setRotationControlIndex,
    setObjectPosition,
    objectPositions,
  } = useConfigurator();
  const { t } = useLanguage();

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    objectId: string;
    index: number;
  } | null>(null);

  const [isDraggingObject, setIsDraggingObject] = useState(false);
  const [recenterTrigger, setRecenterTrigger] = useState(0);
  const [isAutoCenterEnabled, setIsAutoCenterEnabled] = useState(false);
  const [snapPreview, setSnapPreview] = useState<{ 
    fromIndex: number; 
    toIndex: number; 
    fromPos: [number, number, number]; 
    toPos: [number, number, number];
  } | null>(null);
  const orbitControlsRef = useRef<any>(null);
  const previousSceneObjectsLength = useRef(sceneObjects.length);

  // Close context menu when object is deselected
  useEffect(() => {
    if (selectedObjectId === null && contextMenu !== null) {
      setContextMenu(null);
    }
  }, [selectedObjectId, contextMenu]);

  // Open context menu when a new object is spawned (scene length increases and object is selected)
  useEffect(() => {
    const sceneIncreased = sceneObjects.length > previousSceneObjectsLength.current;
    previousSceneObjectsLength.current = sceneObjects.length;

    if (sceneIncreased && selectedObjectId) {
      // Find the index of the newly selected object
      const index = sceneObjects.findIndex((id) => id === selectedObjectId);
      if (index !== -1) {
        // Position the context menu on the left side of the screen
        const leftX = 220; // 220px from left edge (below controls)
        const centerY = window.innerHeight / 2;
        handleContextMenu(leftX, centerY, selectedObjectId, index);
      }
    }
  }, [sceneObjects, selectedObjectId]);

  const handleRecenter = () => {
    setRecenterTrigger(prev => prev + 1);
  };

  const handleContextMenu = (
    x: number,
    y: number,
    objectId: string,
    index: number,
  ) => {
    setContextMenu({ x, y, objectId, index });
  };

  const handleDelete = () => {
    if (contextMenu) {
      removeObjectByIndex(contextMenu.index);
      setContextMenu(null);
    }
  };

  const handleRotate = () => {
    if (contextMenu) {
      setRotationControlIndex(contextMenu.index);
      setContextMenu(null);
    }
  };

  const handleDragUpdate = (index: number, position: [number, number, number]) => {
    setObjectPosition(index, position);
  };

  const handleDragStateChange = (isDragging: boolean) => {
    setIsDraggingObject(isDragging);
  };

  useControls(
    "Material",
    {
      uvScale: {
        value: 10.5,
        min: 0.1,
        max: 20,
        step: 0.1,
        onChange: (value) => setUvScale(value),
      },
      normalScale: {
        value: 1.60,
        min: 0,
        max: 2,
        step: 0.05,
        onChange: (value) => setNormalScale(value),
      },
      metalness: {
        value: 0.45,
        min: 0,
        max: 1,
        step: 0.01,
        onChange: (value) => setMetalness(value),
      },
      roughness: {
        value: 0.87,
        min: 0,
        max: 1,
        step: 0.01,
        onChange: (value) => setRoughness(value),
      },
    },
    { collapsed: false },
  );

  const lightControls = useControls(
    "Lighting",
    {
      ambientIntensity: { value: 0.8, min: 0, max: 10, step: 0.1 },
      directionalIntensity: { value: 0.8, min: 0, max: 5, step: 0.1 },
      directionalX: { value: -0.1, min: -5, max: 5, step: 0.1 },
      directionalY: { value: 1.1, min: -5, max: 5, step: 0.1 },
      directionalZ: { value: -1.6, min: -5, max: 5, step: 0.1 },
    },
    { collapsed: true },
  );

  const shadowControls = useControls(
    "Shadows",
    {
      shadowOpacity: { value: 0.42, min: 0, max: 1, step: 0.01 },
      shadowScale: { value: 0.1, min: 0.1, max: 50, step: 0.1 },
      shadowBlur: { value: 0.1, min: 0, max: 10, step: 0.1 },
      shadowFar: { value: 21, min: 1, max: 50, step: 1 },
      shadowsWidth: { value: 512, min: 128, max: 2048, step: 128 },
      shadowsHeight: { value: 512, min: 128, max: 2048, step: 128 },
    },
    { collapsed: true },
  );

  const environmentControls = useControls(
    "Environment",
    {
      preset: {
        value: "warehouse",
        options: [
          "apartment",
          "city",
          "dawn",
          "forest",
          "lobby",
          "night",
          "park",
          "studio",
          "sunset",
          "warehouse",
        ],
      },
      background: { value: false },
      blur: { value: 0.17, min: 0, max: 1, step: 0.01 },
      environmentIntensity: { value: 1.6, min: 0, max: 5, step: 0.1 },
      rotationY: { value: 0.18, min: -Math.PI, max: 6.28, step: 0.01 },
    },
    { collapsed: true },
  );

  return (
    <SceneContext.Provider value={{ handleRecenter, isAutoCenterEnabled, setIsAutoCenterEnabled }}>
      <div style={{ width: "100vw", height: "100vh", cursor: "grab" }}>
        {contextMenu && (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            onDelete={handleDelete}
            onRotate={handleRotate}
            onClose={() => setContextMenu(null)}
          />
        )}

        {rotationControlIndex !== null && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-[200]">
          <button
            onClick={() => setRotationControlIndex(null)}
            className="px-6 py-3 bg-[#06402b] text-white font-medium rounded-full hover:bg-[#06402b]/90 active:scale-[0.98] transition-all duration-200 cursor-pointer shadow-lg backdrop-blur-sm flex items-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span>{t.finishRotation}</span>
          </button>
        </div>
      )}

      <Leva
        collapsed={true}
        oneLineLabels={true}
        titleBar={{ position: { x: -390, y: 16 } }}
      />
      <Canvas
        camera={{ position: [0, 2, 2], fov: 60 }}
        shadows
        style={{ width: "100%", height: "100%" }}
        gl={{ 
          antialias: true,
          powerPreference: "high-performance",
        }}
        dpr={[1, 2]}
      >
        <CameraController />
        <ToneMappingController />
        <RotationModeCamera />
        <PanConstraint orbitControlsRef={orbitControlsRef} />
        <AutoCenterCamera 
          orbitControlsRef={orbitControlsRef}
          objectPositions={objectPositions}
          sceneObjects={sceneObjects}
          enabled={rotationControlIndex === null && !isAutoCenterEnabled}
          isDragging={isDraggingObject}
          recenterTrigger={recenterTrigger}
        />
        <ClickHandler
          onContextMenu={handleContextMenu}
          sceneObjects={sceneObjects}
          onDragUpdate={handleDragUpdate}
          onDragStateChange={handleDragStateChange}
          onSnapPreview={setSnapPreview}
        />

        <OrbitControls
          ref={orbitControlsRef}
          enableZoom={rotationControlIndex === null && !isDraggingObject}
          enablePan={true}
          enableRotate={rotationControlIndex === null && !isDraggingObject}
          target={[0, 0.2, 0]}
          minDistance={1}
          maxDistance={50}
          minPolarAngle={0.1}
          maxPolarAngle={Math.PI / 2.1}
          enableDamping={true}
          dampingFactor={0.08}
          rotateSpeed={0.3}
          zoomSpeed={0.3}
          zoomToCursor={false}
          enabled={rotationControlIndex === null}
          makeDefault
        />

        <ambientLight intensity={lightControls.ambientIntensity} color="#ffffff" />
        <directionalLight
          position={[
            lightControls.directionalX,
            lightControls.directionalY,
            lightControls.directionalZ,
          ]}
          intensity={lightControls.directionalIntensity}
          color="#ffffff"
      
        />
        

        <SceneObjects snapPreview={snapPreview} />

          <ContactShadows
            opacity={shadowControls.shadowOpacity}
            scale={shadowControls.shadowScale}
            blur={shadowControls.shadowBlur}
            far={shadowControls.shadowFar}
            resolution={2048}
            width={shadowControls.shadowsWidth}
            height={shadowControls.shadowsHeight}
            color="#000000"
          />



        <group>
          <Environment
            preset={environmentControls.preset as any}
            background={environmentControls.background}
            blur={environmentControls.blur}
            environmentIntensity={environmentControls.environmentIntensity}
            environmentRotation={[0, environmentControls.rotationY, 0]}
          />
        </group>
      </Canvas>
      <SceneControls />
    </div>
    </SceneContext.Provider>
  );
};

export default Scene;
