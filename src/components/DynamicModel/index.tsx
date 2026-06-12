import { useGLTF, useTexture } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import {
  useMaterial,
  availableMaterials,
  lowResUrl,
} from "../../context/MaterialContext";
import {
  availableModules,
  availableCompleteSets,
  useConfigurator,
} from "../../context/ConfiguratorContext";
import { useLoaderStore } from "../../store/loaderStore";
import { extractBaseModuleId } from "../../utils/moduleId";

const BASE = import.meta.env.BASE_URL;

// ── Selection outline ───────────────────────────────────────────────────────
// A solid, opaque outline for the selected module. Rendered as an inside-out
// hull (BackSide) INFLATED ALONG VERTEX NORMALS — not scaled — so the outline
// keeps a uniform thickness and never shifts relative to the model's pivot
// (scaling a clone pushes off-pivot parts like the legs out of place). The
// object itself occludes the shell, leaving only a clean rim visible.
const SELECTION_OUTLINE_COLOR = "#7E7870";
const SELECTION_OUTLINE_THICKNESS = 0.007; // outline thickness, in model units

const outlineVertexShader = /* glsl */ `
  uniform float uThickness;
  void main() {
    // Push each vertex out along its own normal → uniform, pivot-independent shell.
    vec3 inflated = position + normal * uThickness;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(inflated, 1.0);
  }
`;

const outlineFragmentShader = /* glsl */ `
  uniform vec3 uColor;
  void main() {
    gl_FragColor = vec4(uColor, 1.0);
  }
`;

function createOutlineMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(SELECTION_OUTLINE_COLOR) },
      uThickness: { value: SELECTION_OUTLINE_THICKNESS },
    },
    vertexShader: outlineVertexShader,
    fragmentShader: outlineFragmentShader,
    side: THREE.BackSide,
    toneMapped: false,
  });
}

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
  const { registerObjectSize } = useConfigurator();
  const {
    selectedObjectId,
    getObjectMaterial,
    getObjectPbr,
    addObject,
    objects,
  } = useMaterial();

  const isSelected = selectedObjectId === objectId;

  const baseModuleId = extractBaseModuleId(objectId);

  // Try to find module definition using base ID first, then full ID
  const moduleDefinition =
    availableModules.find((m) => m.id === baseModuleId) ||
    availableModules.find((m) => m.id === objectId);
  const completeSetDefinition =
    availableCompleteSets.find((s) => s.id === baseModuleId) ||
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
      showLoader("Ładowanie...");

      addObject({
        id: objectId,
        name: modelDefinition?.displayName || objectId,
        material: objectMaterial || availableMaterials.cremona[0],
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
    lowResUrl(objectMaterial?.diffuse || availableMaterials.cremona[0].diffuse),
    lowResUrl(objectMaterial?.normal || availableMaterials.cremona[0].normal),
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

  // ── Per-object PBR resolution ───────────────────────────────────────────
  // Each module reads ITS OWN stored surface tuning, seeded from its material's
  // family defaults and persisted per object. This is what lets two modules
  // with different fabrics keep their own uvScale / normal / sheen etc. —
  // selecting or tuning one no longer touches the look of the others. The Leva
  // panel writes only to the currently selected object's stored PBR (see Scene).
  const pbr = getObjectPbr(objectId);

  const effectiveUvScale = modelDefinition?.uvScale ?? pbr.uvScale;

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
    diffuse.minFilter = THREE.LinearMipmapLinearFilter; // trilinear
    diffuse.magFilter = THREE.LinearFilter;
    normal.minFilter = THREE.LinearMipmapLinearFilter;
    normal.magFilter = THREE.LinearFilter;
    diffuse.needsUpdate = true;
    normal.needsUpdate = true;

    const srcFabric = (materials["Sofa_Fabric"] ??
      Object.entries(materials).find(
        ([name]) => name.toLowerCase() === "sofa_fabric",
      )?.[1]) as THREE.MeshStandardMaterial | undefined;
    const mat = new THREE.MeshPhysicalMaterial({
      map: diffuse,
      normalMap: normal,
      normalScale: new THREE.Vector2(pbr.normalScale, pbr.normalScale),
      aoMap: srcFabric?.aoMap ?? null,
      aoMapIntensity: srcFabric?.aoMap ? pbr.aoMapIntensity : 0,
      roughness: pbr.roughness,
      metalness: pbr.metalness,
      sheen: pbr.sheen,
      sheenRoughness: pbr.sheenRoughness,
      sheenColor: new THREE.Color(1, 1, 1),
      envMapIntensity: pbr.envMapIntensity,
    });

    return mat;
  }, [
    diffuseMap,
    normalMap,
    effectiveUvScale,
    pbr.normalScale,
    pbr.metalness,
    pbr.roughness,
    pbr.sheen,
    pbr.sheenRoughness,
    pbr.envMapIntensity,
    pbr.aoMapIntensity,
    materials,
  ]);

  useEffect(() => {
    if (fabricMaterial.map) {
      fabricMaterial.map.repeat.set(effectiveUvScale, effectiveUvScale);
      fabricMaterial.map.needsUpdate = true;
    }
    if (fabricMaterial.normalMap) {
      fabricMaterial.normalMap.repeat.set(effectiveUvScale, effectiveUvScale);
      fabricMaterial.normalMap.needsUpdate = true;
    }
  }, [effectiveUvScale, fabricMaterial]);

  useEffect(() => {
    fabricMaterial.normalScale?.set(pbr.normalScale, pbr.normalScale);
    fabricMaterial.needsUpdate = true;
  }, [pbr.normalScale, fabricMaterial]);

  useEffect(() => {
    const m = fabricMaterial as THREE.MeshPhysicalMaterial;
    m.metalness = pbr.metalness;
    m.roughness = pbr.roughness;
    m.sheen = pbr.sheen;
    m.sheenRoughness = pbr.sheenRoughness;
    m.envMapIntensity = pbr.envMapIntensity;
    if (m.aoMap) m.aoMapIntensity = pbr.aoMapIntensity;
    m.needsUpdate = true;
  }, [
    pbr.metalness,
    pbr.roughness,
    pbr.sheen,
    pbr.sheenRoughness,
    pbr.envMapIntensity,
    pbr.aoMapIntensity,
    fabricMaterial,
  ]);

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
            (child.material as THREE.MeshStandardMaterial)?.name ?? "";
        }

        if (child.userData.originalMatName.toLowerCase() === "sofa_fabric") {
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

  // Selection outline: one shared shader material + a pre-built hull clone that
  // all wear it. Built once per model geometry, shown only while selected.
  const outlineMaterial = useMemo(() => createOutlineMaterial(), []);
  const outlineHull = useMemo(() => {
    const hull = clonedObject.clone();
    hull.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = outlineMaterial;
        child.castShadow = false;
        child.receiveShadow = false;
        child.userData.isSelectionOutline = true;
      }
    });
    return hull;
  }, [clonedObject, outlineMaterial]);

  // Register this module's real bounding-box size. Used both for duplicateObject
  // offsets and for the collision-footprint debug overlay / sizing.
  //
  // Measured in the clone's OWN local frame (not world space): we fold each
  // mesh's geometry box through its transform relative to clonedObject, so the
  // parent group's 90° rotation never leaks into the numbers. That keeps the
  // size rotation-independent — a session-restored, already-rotated module
  // reports the same intrinsic [x, y, z] as a freshly spawned one. The
  // selection-outline clone is skipped so it can't inflate the box.
  useEffect(() => {
    clonedObject.updateWorldMatrix(true, true);
    const inv = clonedObject.matrixWorld.clone().invert();
    const box = new THREE.Box3();
    const childBox = new THREE.Box3();
    const toLocal = new THREE.Matrix4();
    clonedObject.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh || !mesh.geometry || mesh.userData.isSelectionOutline)
        return;
      if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
      childBox.copy(mesh.geometry.boundingBox!);
      toLocal.multiplyMatrices(inv, mesh.matrixWorld);
      childBox.applyMatrix4(toLocal);
      box.union(childBox);
    });
    const size = new THREE.Vector3();
    box.getSize(size);
    // Centre of the local bounding box. For most modules this is ~0 (geometry
    // centred on the origin), but complete sets pivot at one end, so the centre
    // is offset — captured here so footprints/overlays can sit on the real mesh.
    const center = new THREE.Vector3();
    box.getCenter(center);
    if (size.x > 0) {
      registerObjectSize(
        baseModuleId,
        [size.x, size.y, size.z],
        [center.x, center.y, center.z],
      );
    }
  }, [clonedObject, baseModuleId, registerObjectSize]);

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
      {isSelected && <primitive object={outlineHull} />}
    </group>
  );
}

// Models are NOT preloaded — each GLB is large and is loaded on demand the
// first time its module/set is rendered (useGLTF inside the component). This
// keeps the initial page load light; only the selected model is fetched.

// Warm the material-texture cache so fabric switches are instant with no
// flicker — but do it AFTER the initial paint, during browser idle time.
// Running it eagerly at module load fires ~90 MB of texture requests that
// saturate the connection pool and starve the first model + texture the user
// actually needs to see, making the page feel very slow to appear.
function warmMaterialTextures() {
  Object.values(availableMaterials)
    .flat()
    .forEach(({ diffuse, normal }) => {
      // Warm the same 1K maps the model actually uses, not the 2K originals.
      useTexture.preload([lowResUrl(diffuse), lowResUrl(normal)]);
    });
}

if (typeof window !== "undefined") {
  const ric = (window as Window & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  }).requestIdleCallback;
  if (ric) {
    ric(warmMaterialTextures, { timeout: 5000 });
  } else {
    window.setTimeout(warmMaterialTextures, 3000);
  }
}
