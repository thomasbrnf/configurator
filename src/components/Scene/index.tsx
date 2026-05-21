import {
  ContactShadows,
  Environment,
  OrbitControls,
  Line,
} from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useControls, folder, Leva } from "leva";
import { DynamicModel } from "../DynamicModel";
import ControlsInfo from "../ControlsInfo";
import * as THREE from "three";
import {
  useEffect,
  useRef,
  useState,
  createContext,
  useContext,
  useMemo,
} from "react";
import {
  useMaterial,
  MATERIAL_PBR_DEFAULTS,
  getMaterialFamily,
} from "../../context/MaterialContext";
import { useConfigurator } from "../../context/ConfiguratorContext";
import { useLanguage } from "../../context/LanguageContext";
import { useObjectSelection } from "../../hooks/useObjectSelection";
import { useDragAndSnap } from "../../hooks/useDragAndSnap";

interface SceneContextType {
  handleRecenter: () => void;
  isAutoCenterEnabled: boolean;
  setIsAutoCenterEnabled: (enabled: boolean) => void;
}

const SceneContext = createContext<SceneContextType | null>(null);

export const useScene = () => {
  const context = useContext(SceneContext);
  if (!context) {
    throw new Error("useScene must be used within SceneProvider");
  }
  return context;
};

// Internal component that uses the scene context
function SceneControls() {
  const { handleRecenter, isAutoCenterEnabled, setIsAutoCenterEnabled } =
    useScene();

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
  objectPositions: Map<string, [number, number, number]>;
  sceneObjects: { instanceId: string }[];
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
      let minX = Infinity,
        maxX = -Infinity;
      let minZ = Infinity,
        maxZ = -Infinity;

      sceneObjects.forEach((inst, index) => {
        const position = objectPositions.get(inst.instanceId) || [
          index * 1.4,
          0,
          0,
        ];
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
        centerZ + cameraBack,
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

    controls.addEventListener("start", handleStart);

    return () => {
      controls.removeEventListener("start", handleStart);
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

    sceneObjects.forEach((inst, index) => {
      const position = objectPositions.get(inst.instanceId) || [
        index * 3,
        0,
        0,
      ];
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

// Thin coordinator — delegates to useObjectSelection and useDragAndSnap hooks
function ClickHandler({
  sceneObjects,
  onDragUpdate,
  onDragStateChange,
  onSnapPreview,
}: {
  sceneObjects: { instanceId: string }[];
  onDragUpdate: (
    instanceId: string,
    position: [number, number, number],
  ) => void;
  onDragStateChange: (isDragging: boolean) => void;
  onSnapPreview: (
    snapInfo: {
      fromId: string;
      toId: string;
      fromPos: [number, number, number];
      toPos: [number, number, number];
    } | null,
  ) => void;
}) {
  const { gl, scene } = useThree();
  const { selectedObjectId, setSelectedObjectId } = useMaterial();
  const { objectPositions } = useConfigurator();

  const isRotatingRef = useRef(false);
  const mouseDownRef = useRef<{ x: number; y: number } | null>(null);

  const { handleClick, getRaycasterIntersects, resolveObjectId } =
    useObjectSelection({
      onSelect: (objectId) => {
        setSelectedObjectId(objectId);
      },
      onDeselect: () => setSelectedObjectId(null),
    });

  const drag = useDragAndSnap({
    sceneObjects,
    objectPositions,
    onDragUpdate,
    onSnapPreview,
    onDragStateChange,
  });

  useEffect(() => {
    const canvas = gl.domElement;

    function onMouseDown(event: MouseEvent) {
      if (event.button === 2) return;
      mouseDownRef.current = { x: event.clientX, y: event.clientY };
      isRotatingRef.current = false;

      if (selectedObjectId) {
        const rect = canvas.getBoundingClientRect();
        const intersects = getRaycasterIntersects(event, rect);
        const objectId = resolveObjectId(intersects);
        if (objectId === selectedObjectId) {
          drag.startDrag(objectId, intersects, rect, event);
        }
      }
    }

    function onMouseMove(event: MouseEvent) {
      if (!mouseDownRef.current) return;
      const dx = Math.abs(event.clientX - mouseDownRef.current.x);
      const dy = Math.abs(event.clientY - mouseDownRef.current.y);
      if (dx <= 5 && dy <= 5) return;

      if (drag.draggedInstanceId !== null) {
        drag.updateDrag(event, canvas.getBoundingClientRect());
      } else {
        isRotatingRef.current = true;
      }
    }

    function onMouseUp(event: MouseEvent) {
      if (!isRotatingRef.current && !drag.isDragging && mouseDownRef.current) {
        handleClick(event, canvas.getBoundingClientRect(), selectedObjectId);
      }
      drag.endDrag();
      mouseDownRef.current = null;
      isRotatingRef.current = false;
    }

    function onContextMenuNative(event: MouseEvent) {
      event.preventDefault();
    }

    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseup", onMouseUp);
    canvas.addEventListener("contextmenu", onContextMenuNative);
    return () => {
      canvas.removeEventListener("mousedown", onMouseDown);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mouseup", onMouseUp);
      canvas.removeEventListener("contextmenu", onContextMenuNative);
    };
  }, [
    gl,
    scene,
    selectedObjectId,
    setSelectedObjectId,
    drag,
    handleClick,
    getRaycasterIntersects,
    resolveObjectId,
  ]);

  return null;
}

// Camera animation component for rotation mode
function RotationModeCamera() {
  const { camera } = useThree();
  const { rotationControlId, objectPositions } = useConfigurator();
  const savedCameraPosition = useRef<THREE.Vector3 | null>(null);

  useFrame(() => {
    if (rotationControlId !== null && camera) {
      if (!savedCameraPosition.current) {
        savedCameraPosition.current = camera.position.clone();
      }

      const objPos = objectPositions.get(rotationControlId) || [0, 0, 0];
      const targetPosition = new THREE.Vector3(objPos[0], 0, objPos[2]);
      const topViewPosition = new THREE.Vector3(objPos[0], 5, objPos[2]);

      // Smoothly animate camera to top view
      camera.position.lerp(topViewPosition, 0.1);
      camera.lookAt(targetPosition);
    } else if (savedCameraPosition.current) {
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
  toPos,
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
      fromPos[2] + dirZ * objectWidth,
    ];

    // For target object: edge closest to dragged object
    const toEdgePos: [number, number, number] = [
      toPos[0] - dirX * objectWidth,
      toPos[1] + 0.3,
      toPos[2] - dirZ * objectWidth,
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
          <meshBasicMaterial color="#757575" />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.02, 32]} />
          <meshBasicMaterial color="#757575" />
        </mesh>
      </group>

      {/* Green circle with magnet icon at target object edge */}
      <group position={toEdge}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.02, 0.03, 32]} />
          <meshBasicMaterial color="#757575" />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.02, 32]} />
          <meshBasicMaterial color="#757575" />
        </mesh>
      </group>
    </group>
  );
}

// Component to render all objects in the scene
function SceneObjects({
  snapPreview,
}: {
  snapPreview: {
    fromId: string;
    toId: string;
    fromPos: [number, number, number];
    toPos: [number, number, number];
  } | null;
}) {
  const { sceneObjects, objectRotations, objectPositions } = useConfigurator();

  return (
    <>
      {sceneObjects.map((inst, index) => {
        const position = objectPositions.get(inst.instanceId) || [
          index * 1.9,
          0,
          0,
        ];
        return (
          <group key={inst.instanceId}>
            <DynamicModel
              objectId={inst.instanceId}
              position={position as [number, number, number]}
              rotation={objectRotations.get(inst.instanceId) || [0, 0, 0]}
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
  const {
    setUvScale,
    setNormalScale,
    setMetalness,
    setRoughness,
    setSheen,
    setSheenRoughness,
    setEnvMapIntensity,
    setAoMapIntensity,
    selectedObjectId,
    currentMaterial,
  } = useMaterial();
  const {
    sceneObjects,
    rotationControlId,
    setRotationControlId,
    setObjectPosition,
    objectPositions,
  } = useConfigurator();
  const { t } = useLanguage();

  const [isDraggingObject, setIsDraggingObject] = useState(false);
  const [recenterTrigger, setRecenterTrigger] = useState(0);
  const [isAutoCenterEnabled, setIsAutoCenterEnabled] = useState(true);
  const [snapPreview, setSnapPreview] = useState<{
    fromId: string;
    toId: string;
    fromPos: [number, number, number];
    toPos: [number, number, number];
  } | null>(null);
  const orbitControlsRef = useRef<any>(null);
  const previousSceneObjectsLength = useRef(sceneObjects.length);

  // Track scene object count changes
  useEffect(() => {
    previousSceneObjectsLength.current = sceneObjects.length;
  }, [sceneObjects]);

  const handleRecenter = () => {
    setRecenterTrigger((prev) => prev + 1);
  };

  const handleDragUpdate = (
    instanceId: string,
    position: [number, number, number],
  ) => {
    setObjectPosition(instanceId, position);
  };

  const handleDragStateChange = (isDragging: boolean) => {
    setIsDraggingObject(isDragging);
  };

  const currentFamily = getMaterialFamily(currentMaterial.name) ?? "amaral";

  const [matControls, setMatControls] = useControls(() => ({
    Material: folder(
      {
        uvScale: { value: 15.4, min: 0.1, max: 25, step: 0.1 },
        normalStrength: {
          value: 1.15,
          min: 0,
          max: 2,
          step: 0.05,
          label: "Normal Strength",
        },
        metalness: { value: 0.0, min: 0, max: 1, step: 0.01 },
        roughness: { value: 0.87, min: 0, max: 1, step: 0.01 },
        sheen: { value: 0.6, min: 0, max: 1, step: 0.01 },
        sheenRoughness: {
          value: 0.8,
          min: 0,
          max: 1,
          step: 0.01,
          label: "Sheen Roughness",
        },
        envMapIntensity: {
          value: 0.15,
          min: 0,
          max: 2,
          step: 0.01,
          label: "Env Map",
        },
        aoMapIntensity: {
          value: 0.7,
          min: 0,
          max: 2,
          step: 0.01,
          label: "AO Intensity",
        },
      },
      { collapsed: false },
    ),
  }));

  // Push slider values into MaterialContext whenever the user moves a slider
  useEffect(() => {
    setUvScale(matControls.uvScale);
    setNormalScale(matControls.normalStrength);
    setMetalness(matControls.metalness);
    setRoughness(matControls.roughness);
    setSheen(matControls.sheen);
    setSheenRoughness(matControls.sheenRoughness);
    setEnvMapIntensity(matControls.envMapIntensity);
    setAoMapIntensity(matControls.aoMapIntensity);
  }, [
    matControls.uvScale,
    matControls.normalStrength,
    matControls.metalness,
    matControls.roughness,
    matControls.sheen,
    matControls.sheenRoughness,
    matControls.envMapIntensity,
    matControls.aoMapIntensity,
  ]);

  // Reset sliders to per-family defaults when the material family changes,
  // but not on deselect (selectedObjectId null causes currentMaterial to fall
  // back to the amaral default, which would incorrectly clobber the sliders).
  useEffect(() => {
    if (!selectedObjectId) return;
    const d = MATERIAL_PBR_DEFAULTS[currentFamily];
    setMatControls({
      uvScale: d.uvScale,
      normalStrength: d.normalScale,
      roughness: d.roughness,
      sheen: d.sheen,
      sheenRoughness: d.sheenRoughness,
      envMapIntensity: d.envMapIntensity,
    });
  }, [currentFamily, selectedObjectId]);

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
    <SceneContext.Provider
      value={{ handleRecenter, isAutoCenterEnabled, setIsAutoCenterEnabled }}
    >
      <div style={{ width: "100vw", height: "100vh", cursor: "grab" }}>
        {rotationControlId !== null && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-[200]">
            <button
              onClick={() => setRotationControlId(null)}
              className="px-6 py-3 bg-[#454343] text-white font-['Lato',sans-serif] font-light text-[15px] uppercase hover:bg-[#333] active:scale-[0.98] transition-all duration-200 cursor-pointer drop-shadow-[0px_1px_2.5px_rgba(0,0,0,0.3)] flex items-center gap-2"
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

        {import.meta.env.DEV && (
          <Leva
            hidden
            collapsed={true}
            oneLineLabels={true}
            titleBar={{ position: { x: -390, y: 16 } }}
          />
        )}
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
            enabled={rotationControlId === null && !isAutoCenterEnabled}
            isDragging={isDraggingObject}
            recenterTrigger={recenterTrigger}
          />
          <ClickHandler
            sceneObjects={sceneObjects}
            onDragUpdate={handleDragUpdate}
            onDragStateChange={handleDragStateChange}
            onSnapPreview={setSnapPreview}
          />

          <OrbitControls
            ref={orbitControlsRef}
            enableZoom={rotationControlId === null && !isDraggingObject}
            enablePan={true}
            enableRotate={rotationControlId === null && !isDraggingObject}
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
            enabled={rotationControlId === null}
            makeDefault
          />

          <ambientLight
            intensity={lightControls.ambientIntensity}
            color="#ffffff"
          />
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
