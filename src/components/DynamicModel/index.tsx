import { useGLTF, useTexture } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useMaterial } from "../../context/MaterialContext";
import { availableModules, availableCompleteSets } from "../../context/ConfiguratorContext";

interface DynamicModelProps {
  objectId: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
}

export function DynamicModel({ objectId, position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1] }: DynamicModelProps) {
  const { 
    getObjectMaterial, 
    selectedObjectId, 
    uvScale, 
    normalScale,
    metalness,
    roughness
  } = useMaterial();
  
  const isSelected = selectedObjectId === objectId;

  // Find the model definition
  const moduleDefinition = availableModules.find(m => m.id === objectId);
  const completeSetDefinition = availableCompleteSets.find(s => s.id === objectId);
  const modelDefinition = moduleDefinition || completeSetDefinition;

  // Get the model path, fallback to default sofa if not found
  const modelPath = modelDefinition?.modelPath || "/models/sofa3.glb";
  
  const { nodes } = useGLTF(modelPath);
  const objectMaterial = getObjectMaterial(objectId);

  const [diffuseMap, normalMap] = useTexture([
    objectMaterial?.diffuse || "/materials/the smallest granit/Granit_01_new_3.jpg",
    objectMaterial?.normal || "/materials/the smallest granit/Granit_normal_map_5.jpg",
  ]);

  const customMaterial = useMemo(() => {
    const diffuse = diffuseMap.clone();
    const normal = normalMap.clone();

    diffuse.wrapS = diffuse.wrapT = THREE.RepeatWrapping;
    normal.wrapS = normal.wrapT = THREE.RepeatWrapping;

    diffuse.repeat.set(uvScale, uvScale);
    normal.repeat.set(uvScale, uvScale);

    diffuse.anisotropy = 16;
    normal.anisotropy = 16;
    diffuse.colorSpace = THREE.SRGBColorSpace;
    diffuse.generateMipmaps = true;
    normal.generateMipmaps = true;
    diffuse.needsUpdate = true;
    normal.needsUpdate = true;

    return new THREE.MeshStandardMaterial({
      map: diffuse,
      normalMap: normal,
      normalScale: new THREE.Vector2(normalScale, normalScale),
      roughness: roughness,
      metalness: metalness,
      envMapIntensity: 0.5,
    });
  }, [diffuseMap, normalMap, uvScale, normalScale, metalness, roughness]);

  useEffect(() => {
    if (customMaterial.map) {
      customMaterial.map.repeat.set(uvScale, uvScale);
      customMaterial.map.needsUpdate = true;
    }
    if (customMaterial.normalMap) {
      customMaterial.normalMap.repeat.set(uvScale, uvScale);
      customMaterial.normalMap.needsUpdate = true;
    }
  }, [uvScale, customMaterial]);

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

  // Apply custom materials to all meshes in the model
  const applyMaterials = (object: THREE.Object3D) => {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
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
      <primitive 
        object={mainObject} 
        dispose={null}
      />
      {isSelected && (
        <group scale={[1.02, 1.02, 1.02]}>
          <primitive 
            object={mainObject.clone()}
          />
          <meshBasicMaterial 
            color="#06402b" 
            side={THREE.BackSide}
            transparent={true}
            opacity={0.8}
            attach="material"
          />
        </group>
      )}
    </group>
  );
}

// Preload all available models
availableModules.forEach(module => {
  useGLTF.preload(module.modelPath);
});

availableCompleteSets.forEach(set => {
  useGLTF.preload(set.modelPath);
});

// Keep the original sofa preload for backwards compatibility
useGLTF.preload("/models/sofa3.glb");