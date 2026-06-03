import { useGLTF, useTexture } from "@react-three/drei";
import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { useMaterial } from "../../context/MaterialContext";
import {
  availableModules,
  availableCompleteSets,
} from "../../context/ConfiguratorContext";
import { availableMaterials } from "../../context/MaterialContext";
import { useLoaderStore } from "../../store/loaderStore";

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

  const modelPath = modelDefinition?.modelPath || `${BASE}models/Denver.glb`;

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
          diffuse: `${BASE}materials/the smallest granit/Granit_07_new_3.jpg`,
          normal: `${BASE}materials/the smallest granit/Granit_normal_map_5.jpg`,
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
      `${BASE}materials/the smallest granit/Granit_01_new_3.jpg`,
    objectMaterial?.normal ||
      `${BASE}materials/the smallest granit/Granit_normal_map_5.jpg`,
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

  const effectiveUvScale = modelPath.endsWith("models/preston.glb") ? 11.1 : uvScale;

  const customMaterials = useMemo(() => {
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

    const fabricMaterial = materials["Sofa_fabric"] as THREE.MeshStandardMaterial;
    const aoMap = fabricMaterial?.aoMap || null;

    const woodTopMaterial = materials["Sofa_Wood_top"] as THREE.MeshStandardMaterial;
    const woodAoMap = woodTopMaterial?.aoMap || null;

    const diffuseWood = diffuse.clone();
    const normalWood = normal.clone();

    const base = new THREE.MeshStandardMaterial({
      map: diffuse,
      normalMap: normal,
      normalScale: new THREE.Vector2(normalScale, normalScale),
      aoMap: aoMap,
      aoMapIntensity: aoMap ? 1 : 0,
      roughness: roughness,
      metalness: metalness,
      envMapIntensity: 0.5,
    });

    const woodTop = new THREE.MeshStandardMaterial({
      map: diffuseWood,
      normalMap: normalWood,
      normalScale: new THREE.Vector2(normalScale, normalScale),
      aoMap: woodAoMap,
      aoMapIntensity: woodAoMap ? 1 : 0,
      roughness: roughness,
      metalness: metalness,
      envMapIntensity: 0.5,
    });

    return { base, woodTop };
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
    for (const mat of [customMaterials.base, customMaterials.woodTop]) {
      if (mat.map) {
        mat.map.repeat.set(effectiveUvScale, effectiveUvScale);
        mat.map.needsUpdate = true;
      }
      if (mat.normalMap) {
        mat.normalMap.repeat.set(effectiveUvScale, effectiveUvScale);
        mat.normalMap.needsUpdate = true;
      }
    }
  }, [effectiveUvScale, customMaterials]);

  useEffect(() => {
    for (const mat of [customMaterials.base, customMaterials.woodTop]) {
      if (mat.normalScale) {
        mat.normalScale.set(normalScale, normalScale);
        mat.needsUpdate = true;
      }
    }
  }, [normalScale, customMaterials]);

  useEffect(() => {
    for (const mat of [customMaterials.base, customMaterials.woodTop]) {
      mat.metalness = metalness;
      mat.roughness = roughness;
      mat.needsUpdate = true;
    }
  }, [metalness, roughness, customMaterials]);

  const applyMaterials = (object: THREE.Object3D) => {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh && !child.userData.isSelectionOutline) {
        // Skip applying custom material to sofa_legs - keep original material
        const shadowKeywords = ['table_top', 'lamp_and_usb', 'legs', 'Sofa_top', 'Sofa_lamp', 'Sofa_mattress', 'Sofa_Bed_Metal', 'Sofa_technical_fabric'];
        const shouldShadow = shadowKeywords.some(part => child.name.includes(part));
        if (shouldShadow) {
          child.castShadow = true;
          child.receiveShadow = true;
          return;
        }

        // Use woodTop material (with its AO map) for Sofa_Wood_top meshes
        const originalMat = child.material as THREE.MeshStandardMaterial;

        // Wizar: keep "Material #52.002" as-is (e.g. metal legs/frame)
        if (modelPath.endsWith("models/Wizar.glb") && originalMat?.name === "Material #52.002") {
          child.castShadow = true;
          child.receiveShadow = true;
          return;
        }

        // Denver: keep "Material #52" as-is (e.g. metal legs/frame)
        if (modelPath.endsWith("models/Denver.glb") && originalMat?.name === "Material #52") {
          child.castShadow = true;
          child.receiveShadow = true;
          return;
        }

        // Preston: keep "Material #52.001" as-is (e.g. metal legs/frame)
        if (modelPath.endsWith("models/preston.glb") && originalMat?.name === "Material #52.001") {
          child.castShadow = true;
          child.receiveShadow = true;
          return;
        }

        const isWoodTop = originalMat?.name === "Sofa_Wood_top";
        child.material = isWoodTop ? customMaterials.woodTop : customMaterials.base;
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

// Pre-fetch every material texture into the browser's HTTP cache AND
// drei's Suspense cache so fabric switches are instant with no flicker.
// Native Image elements force the browser to fully download + decode each
// file now; when THREE.js requests the same URL later it is served from
// memory without any network round-trip.
Object.values(availableMaterials)
  .flat()
  .forEach(({ diffuse, normal }) => {
    useTexture.preload([diffuse, normal]);
    [diffuse, normal].forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  });

