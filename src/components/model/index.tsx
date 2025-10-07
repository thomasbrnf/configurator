import { useGLTF, useTexture } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import type {
  MathProps,
  ReactProps,
  EventHandlers,
  InstanceProps,
} from "@react-three/fiber";
import type {
  Mutable,
  Overwrite,
} from "@react-three/fiber/dist/declarations/src/core/utils";
import type { JSX } from "react/jsx-runtime";
import * as THREE from "three";
import { useMaterial } from "../../context/MaterialContext";

export function Model(
  props: JSX.IntrinsicAttributes &
    Mutable<
      Overwrite<
        Partial<
          Overwrite<
            THREE.Group<THREE.Object3DEventMap>,
            MathProps<THREE.Group<THREE.Object3DEventMap>> &
              ReactProps<THREE.Group<THREE.Object3DEventMap>> &
              Partial<EventHandlers>
          >
        >,
        Omit<
          InstanceProps<
            THREE.Group<THREE.Object3DEventMap>,
            typeof THREE.Group
          >,
          "object"
        >
      >
    > & { objectId?: string },
) {
  const { nodes, materials } = useGLTF("/models/sofa3.glb");
  const { 
    getObjectMaterial, 
    selectedObjectId, 
    uvScale, 
    normalScale,
    metalness,
    roughness
  } = useMaterial();
  
  const objectId = props.objectId || "sofa-1";
  const objectMaterial = getObjectMaterial(objectId);
  const isSelected = selectedObjectId === objectId;

  const [diffuseMap, normalMap] = useTexture([
    objectMaterial?.diffuse || "/materials/the smallest granit/Granit_01_new_3.jpg",
    objectMaterial?.normal || "/materials/the smallest granit/Granit_normal_map_5.jpg",
  ]);

  const customMaterial = useMemo(() => {
    const diffuse = diffuseMap.clone();
    const normal = normalMap.clone();

    diffuse.wrapS = diffuse.wrapT = THREE.RepeatWrapping;
    normal.wrapS = normal.wrapT = THREE.RepeatWrapping;

    // Set UV scale
    diffuse.repeat.set(uvScale, uvScale);
    normal.repeat.set(uvScale, uvScale);

    // Enable anisotropic filtering
    diffuse.anisotropy = 16;
    normal.anisotropy = 16;

    // Set proper color space
    diffuse.colorSpace = THREE.SRGBColorSpace;

    // Generate mipmaps
    diffuse.generateMipmaps = true;
    normal.generateMipmaps = true;

    diffuse.needsUpdate = true;
    normal.needsUpdate = true;

    // Extract AO map from original material if it exists
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
  }, [diffuseMap, normalMap, uvScale, normalScale, metalness, roughness, materials]);

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

  // Update normal scale when it changes
  useEffect(() => {
    if (customMaterial.normalScale) {
      customMaterial.normalScale.set(normalScale, normalScale);
      customMaterial.needsUpdate = true;
    }
  }, [normalScale, customMaterial]);

  // Update metalness and roughness when they change
  useEffect(() => {
    customMaterial.metalness = metalness;
    customMaterial.roughness = roughness;
    customMaterial.needsUpdate = true;
  }, [metalness, roughness, customMaterial]);

  return (
    <group {...props} dispose={null} userData={{ objectId }}>
      <group
        position={[0, 0, -0.003]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={0.001}
      >
        <group
          position={[1116.11, 503.853, 139.7]}
          rotation={[-0.027, 0, 1.065]}
          scale={[0.963, 0.963, 0.973]}
        >
          <mesh
            castShadow
            receiveShadow
            geometry={(nodes.label_1 as THREE.Mesh).geometry}
            material={materials['tag (sleeve)_FRONT_2260 2']}
            position={[-1129.229, -511.043, -196.998]}
            rotation={[-1.404, 0.883, -0.038]}
            scale={6}
          />
          <mesh
            castShadow
            receiveShadow
            geometry={(nodes.label as THREE.Mesh).geometry}
            material={materials['tag (sleeve)_FRONT_2260 3']}
            position={[96.873, -13.628, 14.509]}
            rotation={[-1.404, 0.883, -0.038]}
            scale={6}
          />
        </group>
        <mesh
          castShadow
          receiveShadow
          geometry={(nodes.bottom_cube as THREE.Mesh).geometry}
          material={materials['Material.001']}
          position={[0.017, -19.875, -127.851]}
          scale={[1004.683, 374.246, 1.092]}
        />
        <group
          position={[0.017, -2.612, 0]}
          rotation={[Math.PI / 2, 0, 0]}
          scale={1000}
        >
          <group position={[0, 0.44, 0]} scale={0.001}>
            <mesh
              castShadow
              receiveShadow
              geometry={(nodes.Mesh as THREE.Mesh).geometry}
              material={customMaterial}
              position={[0, -440.496, 0]}
            />
            {isSelected && (
              <mesh
                geometry={(nodes.Mesh as THREE.Mesh).geometry}
                position={[0, -440.496, 0]}
                scale={1.02}
              >
                <meshBasicMaterial 
                  color="#06402b" 
                  side={THREE.BackSide}
                  transparent={true}
                  opacity={0.8}
                />
              </mesh>
            )}
          </group>
          <group position={[0, 0.44, 0]} scale={0.001}>
            <mesh
              castShadow
              receiveShadow
              geometry={(nodes.Mesh015 as THREE.Mesh).geometry}
              material={materials['Material #34 1']}
              position={[-3696.063, -440.496, 706.194]}
            />
          </group>
        </group>
      </group>
    </group>
  );
}

useGLTF.preload("/sofa3.glb");
