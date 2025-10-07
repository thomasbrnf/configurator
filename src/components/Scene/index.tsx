import { ContactShadows, Environment, OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useControls, Leva } from "leva";
import { Model } from "../model";
import { DynamicModel } from "../DynamicModel";
import * as THREE from "three";
import { useEffect, useRef, useState } from "react";
import { useMaterial } from "../../context/MaterialContext";
import { useConfigurator } from "../../context/ConfiguratorContext";


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
      positionX: { value: 0, min: -50, max: 50, step: 0.1 },
      positionY: { value: 3, min: 0.1, max: 50, step: 0.1 },
      positionZ: { value: 2, min: -50, max: 50, step: 0.1 },
      fov: { value: 60, min: 10, max: 120, step: 1 },
      targetX: { value: 0, min: -10, max: 10, step: 0.1 },
      targetY: { value: 0, min: -10, max: 10, step: 0.1 },
      targetZ: { value: 0, min: -10, max: 10, step: 0.1 },
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
        value: "ACESFilmicToneMapping",
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
      exposure: { value: 1, min: 0.1, max: 3, step: 0.1 },
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

// Click Handler Component with Raycaster
function ClickHandler() {
  const { camera, scene, gl } = useThree();
  const { selectedObjectId, setSelectedObjectId } = useMaterial();
  const raycaster = useRef(new THREE.Raycaster());
  const mouse = useRef(new THREE.Vector2());
  const [isRotating, setIsRotating] = useState(false);
  const mouseDownRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    function handleMouseDown(event: MouseEvent) {
      mouseDownRef.current = { x: event.clientX, y: event.clientY };
      setIsRotating(false);
    }

    function handleMouseMove(event: MouseEvent) {
      if (mouseDownRef.current) {
        const deltaX = Math.abs(event.clientX - mouseDownRef.current.x);
        const deltaY = Math.abs(event.clientY - mouseDownRef.current.y);
        
        // If mouse moved more than 5 pixels, consider it a drag/rotation
        if (deltaX > 5 || deltaY > 5) {
          setIsRotating(true);
        }
      }
    }

    function handleMouseUp(event: MouseEvent) {
      // Only process click if we weren't rotating
      if (!isRotating && mouseDownRef.current) {
        // Calculate mouse position in normalized device coordinates
        const rect = gl.domElement.getBoundingClientRect();
        mouse.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        // Update the picking ray with the camera and mouse position
        raycaster.current.setFromCamera(mouse.current, camera);

        // Calculate objects intersecting the picking ray
        const intersects = raycaster.current.intersectObjects(scene.children, true);

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
            // Toggle selection - if already selected, deselect it
            if (selectedObjectId === objectId) {
              setSelectedObjectId(null);
            } else {
              setSelectedObjectId(objectId);
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
      
      mouseDownRef.current = null;
      setIsRotating(false);
    }

    const canvas = gl.domElement;
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
    };
  }, [camera, scene, gl, selectedObjectId, setSelectedObjectId, isRotating]);

  return null;
}

// Component to render all objects in the scene
function SceneObjects() {
  const { sceneObjects } = useConfigurator();

  // If no objects are configured, show the default sofa
  if (sceneObjects.length === 0) {
    return <Model />;
  }

  // Render configured objects with proper positioning
  return (
    <>
      {sceneObjects.map((objectId, index) => (
        <DynamicModel
          key={`${objectId}-${index}`}
          objectId={objectId}
          position={[index * 3, 0, 0]} // Spread objects out horizontally
        />
      ))}
    </>
  );
}

const Scene = () => {
  const { setUvScale, setNormalScale, setMetalness, setRoughness } = useMaterial();

  // Material controls
  useControls(
    "Material",
    {
      uvScale: {
        value: 20,
        min: 0.1,
        max: 20,
        step: 0.1,
        onChange: (value) => setUvScale(value),
      },
      normalScale: {
        value: 0.2,
        min: 0,
        max: 2,
        step: 0.05,
        onChange: (value) => setNormalScale(value),
      },
      metalness: {
        value: 0.15,
        min: 0,
        max: 1,
        step: 0.01,
        onChange: (value) => setMetalness(value),
      },
      roughness: {
        value: 0.85,
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
      ambientIntensity: { value: 1.2, min: 0, max: 10, step: 0.1 },
      directionalIntensity: { value: 0.8, min: 0, max: 5, step: 0.1 },
      directionalX: { value: -0.5, min: -5, max: 5, step: 0.1 },
      directionalY: { value: 1, min: -5, max: 5, step: 0.1 },
      directionalZ: { value: 2, min: -5, max: 5, step: 0.1 },
    },
    { collapsed: true },
  );

  const shadowControls = useControls(
    "Shadows",
    {
      shadowOpacity: { value: 0.5, min: 0, max: 1, step: 0.01 },
      shadowScale: { value: 10, min: 1, max: 50, step: 1 },
      shadowBlur: { value: 1, min: 0, max: 10, step: 0.1 },
      shadowFar: { value: 10, min: 1, max: 50, step: 1 },
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
      blur: { value: 0, min: 0, max: 1, step: 0.01 },
      environmentIntensity: { value: 1, min: 0, max: 5, step: 0.1 },
      rotationY: { value: 0, min: -Math.PI, max: Math.PI, step: 0.01 },
    },
    { collapsed: true },
  );

  return (
    <div style={{ width: "100vw", height: "100vh" , cursor: 'grab'  }}>
      <Leva collapsed={true} oneLineLabels={true} titleBar={{position: {x: 420 , y: 0}}} />
      <Canvas
        camera={{ position: [0, 2, 2], fov: 60 }}
        shadows
        style={{ width: "100%", height: "100%" }}
      >
        <CameraController />
        <ToneMappingController />
        <ClickHandler />

        <OrbitControls
          enableZoom={true}
          enablePan={false}
          enableRotate={true}
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
        />

        <ambientLight intensity={lightControls.ambientIntensity} />
        <directionalLight
          position={[
            lightControls.directionalX,
            lightControls.directionalY,
            lightControls.directionalZ,
          ]}
          intensity={lightControls.directionalIntensity}
          castShadow
        />

        {/* Render dynamic models based on configurator state */}
        <SceneObjects />

        <ContactShadows
          opacity={shadowControls.shadowOpacity}
          scale={shadowControls.shadowScale}
          blur={shadowControls.shadowBlur}
          far={shadowControls.shadowFar}
          resolution={256}
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
    </div>
  );
};

export default Scene;
