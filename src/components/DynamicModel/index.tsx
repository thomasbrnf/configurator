import { useGLTF, useTexture } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useMaterial, availableMaterials } from "../../context/MaterialContext";
import {
  availableModules,
  availableCompleteSets,
} from "../../context/ConfiguratorContext";
import { useLoaderStore } from "../../store/loaderStore";
import { extractBaseModuleId } from "../../utils/moduleId";

const BASE = import.meta.env.BASE_URL;

interface DynamicModelProps {
  objectId: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
}

export function DynamicModel({
  objectId,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
}: DynamicModelProps) {
  const {
    selectedObjectId,
    uvScale,
    normalScale,
    metalness,
    roughness,
    getObjectMaterial,
    addObject,
    objects,
  } = useMaterial();

  const isSelected = selectedObjectId === objectId;

  const baseModuleId = extractBaseModuleId(objectId);

  // Try to find module definition using base ID first, then full ID
  const moduleDefinition = availableModules.find((m) => m.id === baseModuleId) ||
                           availableModules.find((m) => m.id === objectId);
  const completeSetDefinition = availableCompleteSets.find((s) => s.id === baseModuleId) ||
                                availableCompleteSets.find((s) => s.id === objectId);
  const modelDefinition = moduleDefinition || completeSetDefinition;

  const modelPath = modelDefinition?.modelPath || `${BASE}models/sofa3.glb`;

  const { nodes, materials } = useGLTF(modelPath);

  const objectMaterial = getObjectMaterial(objectId);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const objectExists = objects.some((obj) => obj.id === objectId);
    if (!objectExists) {
      const { showLoader } = useLoaderStore.getState();
      showLoader('Ładowanie obiektu...');

      addObject({
        id: objectId,
        name: modelDefinition?.displayName || objectId,
        material: objectMaterial || {
          name: "AMARAL 90",
          diffuse: `${BASE}materials/AMARAL 90  790  10  32/AMARAL 90_BaseColor.jpg`,
          normal: `${BASE}materials/AMARAL 90  790  10  32/90_Normal.jpg`,
        },
      });
    }
  }, [
    objectId,
    modelDefinition?.displayName,
    objects,
    addObject,
    objectMaterial,
  ]);

  const [diffuseMap, normalMap] = useTexture([
    objectMaterial?.diffuse ||
      `${BASE}materials/AMARAL 90  790  10  32/AMARAL 90_BaseColor.jpg`,
    objectMaterial?.normal ||
      `${BASE}materials/AMARAL 90  790  10  32/90_Normal.jpg`,
  ]);

  // Hide loader when textures are loaded
  useEffect(() => {
    if (diffuseMap && normalMap && isLoading) {
      const { hideLoader } = useLoaderStore.getState();
      setTimeout(() => {
        hideLoader();
        setIsLoading(false);
      }, 300); // Small delay to ensure smooth transition
    }
  }, [diffuseMap, normalMap, isLoading]);

  const effectiveUvScale = modelDefinition?.uvScale ?? uvScale;

  // Single PBR material applied only to the Sofa_Fabric mesh
  const fabricMaterial = useMemo(() => {
    const diffuse = diffuseMap.clone();
    const normal = normalMap.clone();

    diffuse.wrapS = diffuse.wrapT = THREE.RepeatWrapping;
    normal.wrapS = normal.wrapT = THREE.RepeatWrapping;
    diffuse.repeat.set(effectiveUvScale, effectiveUvScale);
    normal.repeat.set(effectiveUvScale, effectiveUvScale);
    diffuse.anisotropy = 16;
    normal.anisotropy = 16;
    diffuse.colorSpace = THREE.SRGBColorSpace;
    diffuse.generateMipmaps = true;
    normal.generateMipmaps = true;
    diffuse.needsUpdate = true;
    normal.needsUpdate = true;

   const srcFabric = (
  materials['Sofa_Fabric'] ?? // Quick check for the exact match first
  Object.entries(materials).find(
    ([name]) => name.toLowerCase() === 'sofa_fabric'
  )?.[1]
) as THREE.MeshStandardMaterial | undefined;
    console.warn('Using source fabric material:', srcFabric);
    return new THREE.MeshStandardMaterial({
      map: diffuse,
      normalMap: normal,
      normalScale: new THREE.Vector2(normalScale, normalScale),
      aoMap: srcFabric?.aoMap ?? null,
      aoMapIntensity: srcFabric?.aoMap ? 1 : 0,
      roughness,
      metalness,
      envMapIntensity: 0.5,
    });
  }, [diffuseMap, normalMap, effectiveUvScale, normalScale, metalness, roughness, materials]);

  useEffect(() => {
    if (fabricMaterial.map) { fabricMaterial.map.repeat.set(effectiveUvScale, effectiveUvScale); fabricMaterial.map.needsUpdate = true; }
    if (fabricMaterial.normalMap) { fabricMaterial.normalMap.repeat.set(effectiveUvScale, effectiveUvScale); fabricMaterial.normalMap.needsUpdate = true; }
  }, [effectiveUvScale, fabricMaterial]);

  useEffect(() => {
    fabricMaterial.normalScale?.set(normalScale, normalScale);
    fabricMaterial.needsUpdate = true;
  }, [normalScale, fabricMaterial]);

  useEffect(() => {
    fabricMaterial.metalness = metalness;
    fabricMaterial.roughness = roughness;
    fabricMaterial.needsUpdate = true;
  }, [metalness, roughness, fabricMaterial]);

  // Only Sofa_Fabric receives the user-selected PBR material.
  // Every other mesh keeps its original GLTF material.
  // We cache the original GLTF material name in userData on first traversal —
  // after the first apply, child.material.name becomes "" (our custom material
  // has no name), so reading it live would silently skip all subsequent updates.
  const applyMaterials = (object: THREE.Object3D) => {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh && !child.userData.isSelectionOutline) {
        child.castShadow = true;
        child.receiveShadow = true;

        if (child.userData.originalMatName === undefined) {
          child.userData.originalMatName =
            (child.material as THREE.MeshStandardMaterial)?.name ?? '';
        }

        if (child.userData.originalMatName.toLowerCase() === 'sofa_fabric') {
          child.material = fabricMaterial;
        }
      }
    });
  };

  // Get the first available scene or group from the loaded model
  const mainObject = nodes.Scene || nodes.scene || Object.values(nodes)[0];

  if (!mainObject) {
    console.warn(`No main object found in model: ${modelPath}`);
    return null;
  }

  // Clone the object for each instance to avoid sharing the same scene object
  const clonedObject = useMemo(() => mainObject.clone(), [mainObject]);

  const groupRef = useRef<THREE.Group>(null);

  // Re-apply whenever fabricMaterial is recreated (new texture or PBR change)
  useEffect(() => {
    if (groupRef.current) applyMaterials(groupRef.current);
  }, [fabricMaterial]);

  return (
    <group
      ref={groupRef}
      position={position}
      rotation={rotation}
      scale={scale}
      userData={{ objectId }}
    >
      <primitive object={clonedObject} dispose={null} />
      {isSelected && (
        <primitive
          object={clonedObject.clone()}
          scale={[1.02, 1.02, 1.02]}
          ref={(ref: THREE.Object3D) => {
            if (ref) {
              const selectionMaterial = new THREE.MeshBasicMaterial({
                color: "#06402b",
                side: THREE.BackSide,
                transparent: true,
                opacity: 0.8,
              });

              ref.traverse((child: THREE.Object3D) => {
                if (child instanceof THREE.Mesh) {
                  child.material = selectionMaterial;
                  child.userData.isSelectionOutline = true;
                }
              });
            }
          }}
        />
      )}
    </group>
  );
}

// Preload all available models
availableModules.forEach((module) => {
  useGLTF.preload(module.modelPath);
});

availableCompleteSets.forEach((set) => {
  useGLTF.preload(set.modelPath);
});

// Pre-fetch every material texture into the browser's HTTP cache AND
// drei's Suspense cache so fabric switches are instant with no flicker.
// Native Image elements force the browser to fully download + decode each
// file now; when THREE.js requests the same URL later it is served from
// memory without any network round-trip.
Object.values(availableMaterials).flat().forEach(({ diffuse, normal }) => {
  useTexture.preload([diffuse, normal]);
  [diffuse, normal].forEach(src => {
    const img = new Image();
    img.src = src;
  });
});

