import { useGLTF, useTexture } from "@react-three/drei";
import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { useMaterial } from "../../context/MaterialContext";
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

  const effectiveUvScale = modelDefinition?.uvScale ?? uvScale;

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

  const defaultPreserveMeshNames = ['table_top', 'lamp_and_usb', 'legs', 'Sofa_top', 'Sofa_lamp', 'Sofa_mattress', 'Sofa_Bed_Metal', 'Sofa_technical_fabric'];
  const preserveMeshNames = modelDefinition?.preserveMeshNames ?? defaultPreserveMeshNames;

  const applyMaterials = (object: THREE.Object3D) => {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh && !child.userData.isSelectionOutline) {
        const shouldPreserve = preserveMeshNames.some((name: string) => child.name.includes(name));
        if (shouldPreserve) {
          child.castShadow = true;
          child.receiveShadow = true;
          return;
        }

        const originalMat = child.material as THREE.MeshStandardMaterial;
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

// Keep the original sofa preload for backwards compatibility
useGLTF.preload(`${BASE}models/sofa3.glb`);
