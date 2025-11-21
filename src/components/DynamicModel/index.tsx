import { useGLTF, useTexture } from "@react-three/drei";
import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { useMaterial } from "../../context/MaterialContext";
import {
  availableModules,
  availableCompleteSets,
} from "../../context/ConfiguratorContext";
import { useLoaderStore } from "../../store/loaderStore";

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

  // Extract base module ID (remove counter, timestamp and random suffix for duplicates)
  // Format is: moduleId-counter-timestamp-randomstring
  // We need to remove the last three segments if they match the pattern
  const extractBaseModuleId = (id: string): string => {
    const parts = id.split('-');
    // If we have at least 4 parts and the last 3 look like counter-timestamp-random
    if (parts.length >= 4) {
      const lastPart = parts[parts.length - 1]; // random string
      const secondLastPart = parts[parts.length - 2]; // timestamp
      const thirdLastPart = parts[parts.length - 3]; // counter
      
      // Check if it matches: counter(digits)-timestamp(13 digits)-random(9 alphanumeric)
      if (/^[a-z0-9]{9}$/.test(lastPart) && 
          /^\d{13}$/.test(secondLastPart) && 
          /^\d+$/.test(thirdLastPart)) {
        return parts.slice(0, -3).join('-');
      }
    }
    
    // Fallback for old format: moduleId-timestamp-randomstring
    if (parts.length >= 3) {
      const lastPart = parts[parts.length - 1];
      const secondLastPart = parts[parts.length - 2];
      if (/^[a-z0-9]{9}$/.test(lastPart) && /^\d{13}$/.test(secondLastPart)) {
        return parts.slice(0, -2).join('-');
      }
    }
    
    return id;
  };
  
  const baseModuleId = extractBaseModuleId(objectId);
  
  // Try to find module definition using base ID first, then full ID
  const moduleDefinition = availableModules.find((m) => m.id === baseModuleId) || 
                           availableModules.find((m) => m.id === objectId);
  const completeSetDefinition = availableCompleteSets.find((s) => s.id === baseModuleId) ||
                                availableCompleteSets.find((s) => s.id === objectId);
  const modelDefinition = moduleDefinition || completeSetDefinition;

  const modelPath = modelDefinition?.modelPath || "/models/sofa3.glb";

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
          name: "Granit 07",
          diffuse: "/materials/the smallest granit/Granit_07_new_3.jpg",
          normal: "/materials/the smallest granit/Granit_normal_map_5.jpg",
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
      "/materials/the smallest granit/Granit_01_new_3.jpg",
    objectMaterial?.normal ||
      "/materials/the smallest granit/Granit_normal_map_5.jpg",
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

  const effectiveUvScale =
    modelPath === "/models/sofa3.glb"
      ? 10.5
      : modelPath === "/models/gala_collezione_KARATO [PODUSZKA].glb"
      ? 0.5
      : uvScale;

  const customMaterial = useMemo(() => {
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

    const originalMaterial = materials[
      "Material #2 1"
    ] as THREE.MeshStandardMaterial;
    const aoMap = originalMaterial?.aoMap || null;

    return new THREE.MeshStandardMaterial({
      map: diffuse,
      normalMap: normal,
      normalScale: new THREE.Vector2(normalScale, normalScale),
      aoMap: aoMap,
      aoMapIntensity: aoMap ? 1.0 : 0,
      roughness: roughness,
      metalness: metalness,
      envMapIntensity: 0.5,
    });
  }, [
    diffuseMap,
    normalMap,
    effectiveUvScale,
    normalScale,
    metalness,
    roughness,
    materials,
  ]);

  useEffect(() => {
    if (customMaterial.map) {
      customMaterial.map.repeat.set(effectiveUvScale, effectiveUvScale);
      customMaterial.map.needsUpdate = true;
    }
    if (customMaterial.normalMap) {
      customMaterial.normalMap.repeat.set(effectiveUvScale, effectiveUvScale);
      customMaterial.normalMap.needsUpdate = true;
    }
  }, [effectiveUvScale, customMaterial]);

  useEffect(() => {
    if (customMaterial.normalScale) {
      customMaterial.normalScale.set(normalScale, normalScale);
      customMaterial.needsUpdate = true;
    }
  }, [normalScale, customMaterial]);

  useEffect(() => {
    customMaterial.metalness = metalness;
    customMaterial.roughness = roughness;
    customMaterial.needsUpdate = true;
  }, [metalness, roughness, customMaterial]);

  const applyMaterials = (object: THREE.Object3D) => {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh && !child.userData.isSelectionOutline) {
        // Skip applying custom material to sofa_legs - keep original material
        if (child.name && child.name.includes('sofa_legs')) {
          child.castShadow = true;
          child.receiveShadow = true;
          return;
        }
        
        child.material = customMaterial;
        child.castShadow = true;
        child.receiveShadow = true;
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

  return (
    <group
      position={position}
      rotation={rotation}
      scale={scale}
      userData={{ objectId }}
      ref={(ref) => {
        if (ref) {
          applyMaterials(ref);
        }
      }}
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

// Keep the original sofa preload for backwards compatibility
useGLTF.preload("/models/sofa3.glb");
