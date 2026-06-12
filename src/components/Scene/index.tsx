import {
  ContactShadows,
  Environment,
  OrbitControls,
  Line,
  Edges,
} from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useControls, folder, Leva, button } from "leva";
import { DynamicModel } from "../DynamicModel";
import ControlsInfo from "../ControlsInfo";
import * as THREE from "three";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  createContext,
  useContext,
  useMemo,
} from "react";
import { useMaterial, setPbrDefault, exportPbrDefaults } from "../../context/MaterialContext";

function saveSession(key: string, value: unknown) {
  try { sessionStorage.setItem(key, JSON.stringify(value)); } catch {}
}

import {
  useConfigurator,
  getModuleCategory,
  getModuleSnappingConfig,
} from "../../context/ConfiguratorContext";
import { halfExtentAlong } from "../../data/snapDistances";
import {
  worldOffsetXZ,
  worldHalfExtent,
  quadrantFromRotationY,
  snapFaceDirs,
} from "../../utils/footprint";
import { extractBaseModuleId } from "../../utils/moduleId";
import { useLanguage } from "../../context/LanguageContext";
import { useLoaderStore } from "../../store/loaderStore";
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

// Camera fly-to easing — smooth nonlinear acceleration then deceleration.
const CAMERA_FLY_DURATION = 900; // ms
const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

// Auto Center Camera Component
function AutoCenterCamera({
  orbitControlsRef,
  objectPositions,
  sceneObjects,
  enabled = true,
  isDragging = false,
  recenterTrigger = 0,
  manualRecenterTrigger = 0,
}: {
  orbitControlsRef: React.MutableRefObject<any>;
  objectPositions: Map<string, [number, number, number]>;
  sceneObjects: { instanceId: string }[];
  enabled?: boolean;
  isDragging?: boolean;
  recenterTrigger?: number;
  manualRecenterTrigger?: number;
}) {
  const { camera, scene } = useThree();
  const desiredTargetRef = useRef(new THREE.Vector3(0, 0.2, 0));
  const currentTargetRef = useRef(new THREE.Vector3(0, 0.2, 0));
  // Desired camera world position — null means "no animation in progress"
  const desiredCameraRef = useRef<THREE.Vector3 | null>(null);
  // Active eased fly-to. Captures the start camera/target so each frame can
  // interpolate deterministically along easeInOutCubic; null when idle.
  const tweenRef = useRef<{
    startPos: THREE.Vector3;
    endPos: THREE.Vector3;
    startTarget: THREE.Vector3;
    endTarget: THREE.Vector3;
    startTime: number;
  } | null>(null);
  const initializedRef = useRef(false);
  const userHasInteractedRef = useRef(false);
  const previousSceneCountRef = useRef(0);

  // Compute world-space bounding box of every DynamicModel group in the scene
  const computeBounds = useCallback((): THREE.Box3 => {
    scene.updateMatrixWorld(true);
    const box = new THREE.Box3();
    scene.traverse((obj) => {
      if (obj instanceof THREE.Group && obj.userData.objectId) {
        const objBox = new THREE.Box3().setFromObject(obj);
        if (!objBox.isEmpty()) box.union(objBox);
      }
    });
    return box;
  }, [scene]);

  // Derive ideal target and camera position from actual model bounds.
  // zoomFactor < 1 brings the camera closer; default 1 = normal spawn distance.
  const cameraFromBounds = useCallback((bounds: THREE.Box3, zoomFactor = 1.0) => {
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    bounds.getCenter(center);
    bounds.getSize(size);
    const footprint = Math.sqrt(size.x * size.x + size.z * size.z);
    const back = Math.max(footprint * 0.9 * zoomFactor, 1.4 * zoomFactor);
    const height = Math.max(footprint * 0.45 * zoomFactor, 1.0 * zoomFactor);
    return {
      target: new THREE.Vector3(center.x, Math.max(center.y, 0.2), center.z),
      cameraPos: new THREE.Vector3(center.x, center.y + height, center.z + back),
    };
  }, []);

  // Mirror the isDragging prop into a ref so effects can read it without
  // listing it as a dependency (otherwise drag-end re-fires those effects).
  const isDraggingRef = useRef(isDragging);
  useEffect(() => { isDraggingRef.current = isDragging; }, [isDragging]);

  // When the user starts dragging an object, immediately cancel any in-flight
  // camera animation so it won't resume and snap the view once drag ends.
  useEffect(() => {
    if (isDragging) {
      desiredCameraRef.current = null;
      tweenRef.current = null;
      userHasInteractedRef.current = true;
    }
  }, [isDragging]);

  // Track manual camera interaction so auto-center stops after user touches orbit
  useEffect(() => {
    const controls = orbitControlsRef.current;
    if (!controls) return;
    const handleStart = () => {
      userHasInteractedRef.current = true;
      // Grabbing the camera mid-flight cancels the eased fly-to immediately.
      desiredCameraRef.current = null;
      tweenRef.current = null;
    };
    controls.addEventListener("start", handleStart);
    return () => controls.removeEventListener("start", handleStart);
  }, [orbitControlsRef]);

  // Manual recenter button / refresh — resets interaction flag and fully
  // repositions. Retries across frames until model bounds are available, since
  // on a page refresh the GLB models load asynchronously after this fires.
  // isDragging is intentionally read via ref so drag-end does not re-fire this.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (recenterTrigger === 0 || sceneObjects.length === 0 || isDraggingRef.current) return;
    userHasInteractedRef.current = false;
    let raf = 0;
    let attempts = 0;
    const tryRecenter = () => {
      const bounds = computeBounds();
      if (bounds.isEmpty()) {
        if (attempts++ < 600) raf = requestAnimationFrame(tryRecenter);
        return;
      }
      const { target, cameraPos } = cameraFromBounds(bounds);
      desiredTargetRef.current.copy(target);
      // Do NOT copy to currentTargetRef — let useFrame lerp from wherever it is.
      desiredCameraRef.current = cameraPos.clone();
    };
    raf = requestAnimationFrame(tryRecenter);
    return () => cancelAnimationFrame(raf);
  }, [recenterTrigger, sceneObjects, computeBounds, cameraFromBounds]);

  // Manual recenter button — same logic, smooth travel.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (manualRecenterTrigger === 0 || sceneObjects.length === 0 || isDraggingRef.current) return;
    userHasInteractedRef.current = false;
    let raf = 0;
    let attempts = 0;
    const tryRecenter = () => {
      const bounds = computeBounds();
      if (bounds.isEmpty()) {
        if (attempts++ < 600) raf = requestAnimationFrame(tryRecenter);
        return;
      }
      const { target, cameraPos } = cameraFromBounds(bounds);
      desiredTargetRef.current.copy(target);
      // Do NOT copy to currentTargetRef — let useFrame lerp from wherever it is.
      desiredCameraRef.current = cameraPos.clone();
    };
    raf = requestAnimationFrame(tryRecenter);
    return () => cancelAnimationFrame(raf);
  }, [manualRecenterTrigger, sceneObjects, computeBounds, cameraFromBounds]);

  // Auto-center when scene changes (objects added / removed)
  useEffect(() => {
    if (!enabled || isDragging) return;
    const sceneChanged = previousSceneCountRef.current !== sceneObjects.length;

    if (sceneObjects.length === 0) {
      desiredTargetRef.current.set(0, 0.2, 0);
      initializedRef.current = false;
      previousSceneCountRef.current = 0;
      userHasInteractedRef.current = false;
      return;
    }

    if (!sceneChanged && userHasInteractedRef.current) return;

    previousSceneCountRef.current = sceneObjects.length;
    userHasInteractedRef.current = false;

    const raf = requestAnimationFrame(() => {
      const bounds = computeBounds();
      if (bounds.isEmpty()) return;
      const { target, cameraPos } = cameraFromBounds(bounds);
      desiredTargetRef.current.copy(target);
      if (!initializedRef.current || sceneChanged) {
        // Let the fly-to ease the target from wherever it is rather than
        // snapping it; the useFrame tween animates camera + target together.
        desiredCameraRef.current = cameraPos.clone();
        initializedRef.current = true;
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [sceneObjects, objectPositions, enabled, isDragging, computeBounds, cameraFromBounds]);

  // Smooth lerp every frame — drives orbit target and camera position.
  // A pending recenter (desiredCameraRef set) animates to completion even when
  // continuous auto-follow is disabled, so the recenter button / refresh works.
  useFrame(() => {
    const controls = orbitControlsRef.current;
    if (!controls || isDragging) return;

    // Eased fly-to: while a destination camera position is pending, animate the
    // camera AND the orbit target together along an easeInOutCubic time curve so
    // the view glides from its current spot to the model instead of snapping.
    if (desiredCameraRef.current) {
      const dest = desiredCameraRef.current;
      // (Re)start the tween on a new destination, or if it changed mid-flight
      // (e.g. recenter pressed again) — capture the live start pose each time.
      if (!tweenRef.current || !tweenRef.current.endPos.equals(dest)) {
        tweenRef.current = {
          startPos: camera.position.clone(),
          endPos: dest.clone(),
          startTarget: controls.target.clone(),
          endTarget: desiredTargetRef.current.clone(),
          startTime: performance.now(),
        };
      }
      const tw = tweenRef.current;
      const t = Math.min(
        (performance.now() - tw.startTime) / CAMERA_FLY_DURATION,
        1,
      );
      const e = easeInOutCubic(t);
      camera.position.lerpVectors(tw.startPos, tw.endPos, e);
      currentTargetRef.current.lerpVectors(tw.startTarget, tw.endTarget, e);
      controls.target.copy(currentTargetRef.current);
      controls.update();
      if (t >= 1) {
        camera.position.copy(tw.endPos);
        currentTargetRef.current.copy(tw.endTarget);
        desiredCameraRef.current = null;
        tweenRef.current = null;
      }
      return;
    }

    if (userHasInteractedRef.current || !enabled) return;

    // Continuous soft target-follow while auto-centring is on and no explicit
    // fly is in progress — keeps the view centred as objects move/resize.
    if (currentTargetRef.current.distanceTo(desiredTargetRef.current) > 0.005) {
      currentTargetRef.current.lerp(desiredTargetRef.current, 0.1);
      controls.target.copy(currentTargetRef.current);
      controls.update();
    }
  });

  return null;
}

// Decompose a model group into the MINIMUM number of axis-aligned collision
// boxes needed to represent its XZ footprint without interior seams.
//
// Two bugs in naive multi-box approaches:
//   1. Strided vertex sampling misses extremal vertices → overall AABB too small
//      → thin unprotected strips at model edges where camera slips through.
//   2. Multiple boxes with shared interior faces → push-out algorithm exits when
//      exit==0 (camera exactly on seam face) → camera slips through mid-model.
//
// Fix: use exact geometry.boundingBox (transformed to world space) for the
// overall AABB; then use sampled vertices only to detect which of the four XZ
// quadrants are occupied; then return the MINIMUM box cover:
//   • 4 occupied  → 1 box  (full AABB, identical to original behaviour)
//   • 3 occupied  → 2 boxes (L-shape: one full-width strip + one remainder)
//   • 2 adjacent  → 1 box  (merged territory)
//   • 2 diagonal  → 2 boxes (disconnected regions)
//   • 1 occupied  → 1 box
// This eliminates all interior seams for the straight-sofa and L-shape cases.
function decomposeGroupBoxes(group: THREE.Group, padding: number): THREE.Box3[] {
  // ── Step 1: exact overall AABB from cached geometry bounding boxes ──────────
  // geometry.boundingBox is in local mesh space; applyMatrix4(matrixWorld) maps
  // it to world space. For 90° Y-rotations (the only rotations used here) this
  // gives the exact world AABB with no overestimation.
  const overall = new THREE.Box3();
  const childBox = new THREE.Box3();
  group.traverse((child) => {
    if (!(child instanceof THREE.Mesh) || child.userData.isSelectionOutline)
      return;
    child.updateWorldMatrix(true, false);
    if (!child.geometry.boundingBox) child.geometry.computeBoundingBox();
    childBox.copy(child.geometry.boundingBox!).applyMatrix4(child.matrixWorld);
    overall.union(childBox);
  });
  if (overall.isEmpty()) return [];

  const { min: mn, max: mx } = overall;
  const midX = (mn.x + mx.x) / 2;
  const midZ = (mn.z + mx.z) / 2;

  // ── Step 2: quadrant occupancy via sampled vertices ─────────────────────────
  // Q0 = (−x,−z)  Q1 = (−x,+z)  Q2 = (+x,−z)  Q3 = (+x,+z)
  const occ = [false, false, false, false];
  const wp = new THREE.Vector3();
  group.traverse((child) => {
    if (!(child instanceof THREE.Mesh) || child.userData.isSelectionOutline)
      return;
    const pos = child.geometry.attributes.position;
    if (!pos) return;
    child.updateWorldMatrix(true, false);
    for (let i = 0; i < pos.count; i++) {
      wp.fromBufferAttribute(pos, i).applyMatrix4(child.matrixWorld);
      occ[(wp.x >= midX ? 2 : 0) + (wp.z >= midZ ? 1 : 0)] = true;
    }
  });

  const count = occ.filter(Boolean).length;
  if (count === 0) return [];

  // ── Step 3: minimum box cover ───────────────────────────────────────────────
  // Helper: full territory box for one quadrant.
  const qBox = (qi: number): THREE.Box3 =>
    new THREE.Box3(
      new THREE.Vector3(qi >= 2 ? midX : mn.x, mn.y, qi % 2 === 1 ? midZ : mn.z),
      new THREE.Vector3(qi >= 2 ? mx.x : midX, mx.y, qi % 2 === 1 ? mx.z : midZ),
    );

  const pad = (b: THREE.Box3) => b.expandByScalar(padding);

  // 4 occupied → single box (no interior seams at all).
  if (count === 4) return [pad(overall.clone())];

  // 1 occupied → single quadrant box.
  if (count === 1) return [pad(qBox(occ.indexOf(true)))];

  // 2 occupied → merge if adjacent (share a face), else keep separate.
  if (count === 2) {
    const [a, b] = occ.flatMap((v, i) => (v ? [i] : []));
    const adjacent =
      (a + b === 1 && a < 2) ||   // Q0+Q1: same x-half
      (a + b === 5 && a >= 2) ||  // Q2+Q3: same x-half
      Math.abs(a - b) === 2;      // Q0+Q2 or Q1+Q3: same z-half
    if (adjacent) return [pad(qBox(a).union(qBox(b)))];
    return [pad(qBox(a)), pad(qBox(b))];
  }

  // 3 occupied (L-shape) → 2 non-overlapping rectangles: one full-width strip
  // covering the two occupied quadrants that share a Z-half, plus one piece for
  // the remaining single occupied quadrant. Single shared face → no seam gap.
  if (count === 3) {
    const empty = occ.indexOf(false);
    switch (empty) {
      case 3: // Q3 empty (+x+z) → full-bottom strip + left-top piece
        return [
          pad(new THREE.Box3(new THREE.Vector3(mn.x, mn.y, mn.z), new THREE.Vector3(mx.x, mx.y, midZ))),
          pad(new THREE.Box3(new THREE.Vector3(mn.x, mn.y, midZ), new THREE.Vector3(midX, mx.y, mx.z))),
        ];
      case 2: // Q2 empty (+x−z) → full-top strip + left-bottom piece
        return [
          pad(new THREE.Box3(new THREE.Vector3(mn.x, mn.y, midZ), new THREE.Vector3(mx.x, mx.y, mx.z))),
          pad(new THREE.Box3(new THREE.Vector3(mn.x, mn.y, mn.z), new THREE.Vector3(midX, mx.y, midZ))),
        ];
      case 1: // Q1 empty (−x+z) → full-bottom strip + right-top piece
        return [
          pad(new THREE.Box3(new THREE.Vector3(mn.x, mn.y, mn.z), new THREE.Vector3(mx.x, mx.y, midZ))),
          pad(new THREE.Box3(new THREE.Vector3(midX, mn.y, midZ), new THREE.Vector3(mx.x, mx.y, mx.z))),
        ];
      case 0: // Q0 empty (−x−z) → full-top strip + right-bottom piece
        return [
          pad(new THREE.Box3(new THREE.Vector3(mn.x, mn.y, midZ), new THREE.Vector3(mx.x, mx.y, mx.z))),
          pad(new THREE.Box3(new THREE.Vector3(midX, mn.y, mn.z), new THREE.Vector3(mx.x, mx.y, midZ))),
        ];
    }
  }

  return [pad(overall.clone())];
}

// Camera Collision Constraint - prevents the camera from entering the model
// while leaving pan/rotate/zoom otherwise untouched. Maintains a bounding
// sphere around every model in the scene and, on each OrbitControls "change",
// pushes the camera back out to the sphere surface if it has moved inside.
function CameraCollisionConstraint({
  orbitControlsRef,
  sceneObjects,
  objectPositions,
  objectRotations,
}: {
  orbitControlsRef: React.MutableRefObject<any>;
  sceneObjects: { instanceId: string }[];
  objectPositions: Map<string, [number, number, number]>;
  objectRotations: Map<string, [number, number, number]>;
}) {
  const { camera, scene } = useThree();
  // One collision AABB per model. Empty means "nothing to collide with yet".
  // Boxes hug the furniture far tighter than a bounding sphere, so the camera
  // can approach flat faces naturally instead of being shoved out early — and
  // overlapping boxes don't trap the camera the way overlapping spheres do.
  const boxesRef = useRef<THREE.Box3[]>([]);

  // Recompute one collision box per model whenever the scene changes — not just
  // on add/remove, but also when an object is moved or rotated, so each box
  // travels with its model. setFromObject gives the true world AABB, so this is
  // correct even for off-centre set origins. GLB models load asynchronously, so
  // retry across frames until at least one group has bounds.
  useEffect(() => {
    if (sceneObjects.length === 0) {
      boxesRef.current = [];
      return;
    }
    let raf = 0;
    let attempts = 0;
    const compute = () => {
      scene.updateMatrixWorld(true);
      const boxes: THREE.Box3[] = [];
      scene.traverse((obj) => {
        if (!(obj instanceof THREE.Group) || !obj.userData.objectId) return;
        const groupBoxes = decomposeGroupBoxes(obj, CAMERA_BOX_PADDING);
        for (const b of groupBoxes) boxes.push(b);
      });
      if (boxes.length === 0) {
        if (attempts++ < 600) raf = requestAnimationFrame(compute);
        return;
      }
      boxesRef.current = boxes;
    };
    raf = requestAnimationFrame(compute);
    return () => cancelAnimationFrame(raf);
  }, [sceneObjects, objectPositions, objectRotations, scene]);

  // Push the camera back out of any model it has entered. The camera can sit
  // inside several overlapping boxes at once, so iterate: each pass finds the
  // box it's deepest inside and slides it out the nearest HORIZONTAL face,
  // repeating until clear (or a cap). Horizontal only — never shove the camera
  // up over the top or down through the floor.
  useEffect(() => {
    const controls = orbitControlsRef.current;
    if (!controls) return;

    // Re-entrancy guard: controls.update() at the end synchronously re-dispatches
    // the "change" event, re-entering this handler. If update() leaves the camera
    // inside a box (overlaps it can't escape in one shot, or update() repositioning
    // it back), the correction would recurse without bound and blow the stack
    // ("Maximum call stack size exceeded"). The guard lets the first correction run
    // and applies update() once; the re-entrant change is ignored.
    let correcting = false;
    const handleChange = () => {
      if (correcting) return;
      const boxes = boxesRef.current;
      if (boxes.length === 0) return;

      const cam = camera.position;
      let corrected = false;
      for (let pass = 0; pass < 8; pass++) {
        // Find the box the camera is deepest inside this pass (largest distance
        // to its nearest horizontal face), then push out through that face.
        let worstDepth = 0;
        let worstAxis: "x" | "z" = "x";
        let worstTarget = 0;
        for (const box of boxes) {
          if (!box.containsPoint(cam)) continue;
          // Distance to exit through each of the four vertical faces; the
          // nearest (smallest) is how far this box would push the camera.
          let exit = cam.x - box.min.x;
          let axis: "x" | "z" = "x";
          let target = box.min.x;
          if (box.max.x - cam.x < exit) {
            exit = box.max.x - cam.x;
            target = box.max.x;
            axis = "x";
          }
          if (cam.z - box.min.z < exit) {
            exit = cam.z - box.min.z;
            target = box.min.z;
            axis = "z";
          }
          if (box.max.z - cam.z < exit) {
            exit = box.max.z - cam.z;
            target = box.max.z;
            axis = "z";
          }
          if (exit > worstDepth) {
            worstDepth = exit;
            worstAxis = axis;
            worstTarget = target;
          }
        }
        if (worstDepth === 0) break; // outside every box
        if (worstAxis === "x") cam.x = worstTarget;
        else cam.z = worstTarget;
        corrected = true;
      }

      // Re-sync controls so the corrected position sticks without jitter. This
      // re-dispatches "change", but the guard above swallows the re-entrant call,
      // so a single change event can correct at most once — no infinite loop.
      if (corrected) {
        correcting = true;
        controls.update();
        correcting = false;
      }
    };

    controls.addEventListener("change", handleChange);
    return () => controls.removeEventListener("change", handleChange);
  }, [orbitControlsRef, camera]);

  return null;
}

// Breathing room added to each side of a model's camera-collision box (metres).
const CAMERA_BOX_PADDING = 0.1;

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
  const {
    objectPositions,
    objectRotations,
    objectBoundingSizes,
    objectBoundingOffsets,
    connectModules,
    disconnectModule,
    getModuleNeighbors,
  } = useConfigurator();

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
    objectRotations,
    objectBoundingSizes,
    objectBoundingOffsets,
    onDragUpdate,
    onSnapPreview,
    onDragStateChange,
    onConnect: connectModules,
    onDisconnect: disconnectModule,
    getNeighbors: getModuleNeighbors,
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

// Debug overlay: draws each module's collision footprint as a translucent,
// axis-aligned box.
//
// When the model's real bounding box has been measured (objectBoundingSizes,
// registered by DynamicModel from the actual geometry) we draw THAT — true
// width / depth / height, no hand-tuning. The X/Z extents are swapped for the
// 90° rotation quadrant so the box stays axis-aligned with the world like the
// collision test does. We fall back to the per-category MODULE_DIMENSIONS table
// (with a token height) only until the measurement lands on first load.
const FALLBACK_BOX_HEIGHT = 0.7;

// Per-face colours in three.js BoxGeometry group order: +X, -X, +Y, -Y, +Z, -Z.
const COLLISION_FACE_COLORS = [
  "#ff3b30", // +X  right   (red)
  "#34c759", // -X  left    (green)
  "#0a84ff", // +Y  top     (blue)
  "#ffd60a", // -Y  bottom  (yellow)
  "#ff2d95", // +Z  front   (magenta)
  "#00e5ff", // -Z  back    (cyan)
] as const;

function CollisionDebugBox({
  position,
  rotationY,
  category,
  measuredSize,
  offset,
  opacity,
}: {
  position: [number, number, number];
  rotationY: number;
  category: ReturnType<typeof getModuleCategory>;
  measuredSize?: [number, number, number];
  offset?: [number, number, number];
  opacity: number;
}) {
  // Same quadrant math the snap hook uses: round Y rotation to 0/90/180/270°.
  const quadrant = ((Math.round(rotationY / (Math.PI / 2)) % 4) + 4) % 4;
  const isOdd = quadrant % 2 !== 0;

  let width: number;
  let depth: number;
  let height: number;
  if (measuredSize) {
    // Real geometry. Odd quadrants put local depth along world-X and vice versa.
    width = isOdd ? measuredSize[2] : measuredSize[0];
    depth = isOdd ? measuredSize[0] : measuredSize[2];
    height = measuredSize[1];
  } else {
    width = halfExtentAlong(category, quadrant, "x") * 2;
    depth = halfExtentAlong(category, quadrant, "z") * 2;
    height = FALLBACK_BOX_HEIGHT;
  }

  // Shift to the true footprint centre for off-centre origins (complete sets).
  const [wox, woz] = offset ? worldOffsetXZ(offset, quadrant) : [0, 0];

  return (
    // Box is axis-aligned and sits on the ground (centre lifted by half height).
    <group position={[position[0] + wox, height / 2, position[2] + woz]}>
      <mesh>
        <boxGeometry args={[width, height, depth]} />
        {/* One material per BoxGeometry face group, in three.js's fixed order.
            The box never rotates with the model, so each colour is a fixed
            WORLD direction — use these to orient yourself while fine-tuning:
              +X red   = world right      -X green  = world left
              +Y blue  = top              -Y yellow = bottom (on the floor)
              +Z magenta = world front    -Z cyan   = world back            */}
        {COLLISION_FACE_COLORS.map((color, i) => (
          <meshBasicMaterial
            key={i}
            attach={`material-${i}`}
            color={color}
            transparent
            opacity={opacity}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        ))}
        <Edges color="#ffffff" />
      </mesh>
    </group>
  );
}

// Debug overlay: draws the camera-collision boxes for a module — one padded
// AABB per mesh child, mirroring exactly what CameraCollisionConstraint builds
// at runtime. This shows the true per-mesh breakdown so L-shaped / multi-part
// sets display tight boxes around each arm rather than one large envelope.
function CameraBoxDebug({
  instanceId,
  opacity,
}: {
  instanceId: string;
  opacity: number;
}) {
  const { scene } = useThree();
  const [boxes, setBoxes] = useState<THREE.Box3[]>([]);

  useEffect(() => {
    scene.updateMatrixWorld(true);
    const collected: THREE.Box3[] = [];
    scene.traverse((obj) => {
      if (
        !(obj instanceof THREE.Group) ||
        obj.userData.objectId !== instanceId
      )
        return;
      const groupBoxes = decomposeGroupBoxes(obj, CAMERA_BOX_PADDING);
      for (const b of groupBoxes) collected.push(b);
    });
    setBoxes(collected);
  }, [scene, instanceId]);

  return (
    <>
      {boxes.map((box, i) => {
        const size = new THREE.Vector3();
        box.getSize(size);
        const center = new THREE.Vector3();
        box.getCenter(center);
        return (
          <mesh key={i} position={[center.x, center.y, center.z]}>
            <boxGeometry args={[size.x, size.y, size.z]} />
            <meshBasicMaterial
              color="#ff9500"
              wireframe
              transparent
              opacity={opacity}
              depthWrite={false}
            />
          </mesh>
        );
      })}
    </>
  );
}

// Component to render all objects in the scene
// Evenly-spaced hues around the colour wheel — each mesh in the scene gets its
// own tint so you can immediately see how the GLB is split into mesh parts.
const MESH_DEBUG_PALETTE = [
  "#e74c3c", "#e67e22", "#f1c40f", "#2ecc71",
  "#1abc9c", "#3498db", "#9b59b6", "#e91e63",
  "#00bcd4", "#8bc34a", "#ff5722", "#607d8b",
];

// Debug overlay: renders each mesh in the scene as a coloured transparent hull
// so you can see exactly how the GLB is split into parts. Useful for diagnosing
// why camera collision boxes cover (or miss) certain areas.
function MeshColorDebug({ opacity }: { opacity: number }) {
  const { scene } = useThree();
  type MeshEntry = { uuid: string; color: string; geometry: THREE.BufferGeometry; matrix: THREE.Matrix4 };
  const [meshes, setMeshes] = useState<MeshEntry[]>([]);

  useEffect(() => {
    scene.updateMatrixWorld(true);
    const collected: MeshEntry[] = [];
    let colorIdx = 0;
    scene.traverse((obj) => {
      if (!(obj instanceof THREE.Group) || !obj.userData.objectId) return;
      obj.traverse((child) => {
        if (
          !(child instanceof THREE.Mesh) ||
          child.userData.isSelectionOutline
        )
          return;
        collected.push({
          uuid: child.uuid,
          color: MESH_DEBUG_PALETTE[colorIdx++ % MESH_DEBUG_PALETTE.length],
          geometry: child.geometry,
          matrix: child.matrixWorld.clone(),
        });
      });
    });
    setMeshes(collected);
  }, [scene]);

  return (
    <>
      {meshes.map(({ uuid, color, geometry, matrix }) => (
        <mesh key={uuid} matrixAutoUpdate={false} matrix={matrix}>
          <primitive object={geometry} attach="geometry" />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={opacity}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </>
  );
}

// Debug overlay: renders a semi-transparent coloured quad on each face of a
// module that accepts a snap connection, so you can see exactly which sides are
// active and how they change when the module is rotated.
// Green  = snappable side face (left / right)
// Cyan   = snappable front face
const SNAP_FACE_COLOR: Record<string, string> = {
  side: "#00e676",
  front: "#00e5ff",
};

function SnapFaceDebug({
  instanceId,
  opacity,
}: {
  instanceId: string;
  opacity: number;
}) {
  const {
    objectPositions,
    objectRotations,
    objectBoundingSizes,
    objectBoundingOffsets,
  } = useConfigurator();

  const pos = objectPositions.get(instanceId) ?? [0, 0, 0];
  const ry = objectRotations.get(instanceId)?.[1] ?? 0;
  const baseId = extractBaseModuleId(instanceId);
  const size = objectBoundingSizes.get(baseId);
  const off = objectBoundingOffsets.get(baseId);
  const quadrant = quadrantFromRotationY(ry);
  const snapping = getModuleSnappingConfig(instanceId);
  const dirs = snapFaceDirs(snapping, quadrant);

  // Footprint centre in world XZ (origin + rotation-aware offset).
  const [offX, offZ] = off ? worldOffsetXZ(off, quadrant) : [0, 0];
  const cx = pos[0] + offX;
  const cz = pos[2] + offZ;
  const height = size ? size[1] : 1.0;
  const cy = height / 2;

  return (
    <>
      {dirs.map(([dx, dz], i) => {
        // Half-extents of this module's footprint along each world axis.
        const halfX = worldHalfExtent(size, getModuleCategory(instanceId), quadrant, "x");
        const halfZ = worldHalfExtent(size, getModuleCategory(instanceId), quadrant, "z");

        // Face centre: step from footprint centre to the face along [dx, dz].
        const faceCx = cx + dx * halfX;
        const faceCz = cz + dz * halfZ;

        // Face dimensions: a face perpendicular to X has width=halfZ*2, and vice versa.
        const faceW = dx !== 0 ? halfZ * 2 : halfX * 2;
        const faceH = height;

        // Rotate the quad so it faces outward along [dx, dz].
        const angle = Math.atan2(dx, dz); // Y rotation that aligns local +Z with [dx,dz]

        // Colour: front-face dirs are always world ±X or ±Z aligned with the
        // module's front (local +Z) — distinguish by checking if this is the
        // "front" direction for the module's snapping config.
        const isFront =
          snapping === "front" ||
          (snapping === "left-front" && i === 1) ||
          (snapping === "right-front" && i === 1);
        const color = SNAP_FACE_COLOR[isFront ? "front" : "side"];

        return (
          <mesh
            key={i}
            position={[faceCx, cy, faceCz]}
            rotation={[0, angle, 0]}
          >
            <planeGeometry args={[faceW, faceH]} />
            <meshBasicMaterial
              color={color}
              transparent
              opacity={opacity}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
        );
      })}
    </>
  );
}

function DebugInfoPanel() {
  const { sceneObjects, objectRotations, objectPositions } = useConfigurator();
  const [open, setOpen] = useState(false);

  const rows = sceneObjects.map((inst) => {
    const pos = objectPositions.get(inst.instanceId) ?? [0, 0, 0];
    const rot = objectRotations.get(inst.instanceId) ?? [0, 0, 0];
    const ry = rot[1];
    const deg = ((ry * 180) / Math.PI).toFixed(1);
    const quad = quadrantFromRotationY(ry);
    const snapping = getModuleSnappingConfig(inst.instanceId);
    return { id: inst.instanceId, pos, deg, quad, snapping };
  });

  const copyText = rows
    .map(
      (r) =>
        `${r.id} | rot=${r.deg}° q${r.quad} | snap=${r.snapping} | pos=[${r.pos.map((v) => v.toFixed(3)).join(", ")}]`,
    )
    .join("\n");

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          position: "fixed",
          bottom: 8,
          left: 8,
          zIndex: 9999,
          background: "#1a1a2e",
          color: "#e0e0e0",
          border: "1px solid #444",
          borderRadius: 4,
          padding: "4px 10px",
          fontSize: 11,
          fontFamily: "monospace",
          cursor: "pointer",
          opacity: 0.85,
        }}
      >
        {open ? "▼ debug" : "▶ debug"}
      </button>

      {open && (
        <div
          style={{
            position: "fixed",
            bottom: 36,
            left: 8,
            zIndex: 9998,
            background: "rgba(15,15,25,0.95)",
            color: "#e0e0e0",
            border: "1px solid #444",
            borderRadius: 6,
            padding: "10px 14px",
            fontFamily: "monospace",
            fontSize: 11,
            maxHeight: "60vh",
            overflowY: "auto",
            minWidth: 520,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontWeight: "bold", color: "#aaa" }}>Scene objects ({rows.length})</span>
            <button
              onClick={() => navigator.clipboard.writeText(copyText)}
              style={{ background: "#333", border: "1px solid #555", color: "#ccc", borderRadius: 3, padding: "2px 8px", fontSize: 10, cursor: "pointer" }}
            >
              copy
            </button>
          </div>
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr style={{ color: "#888", borderBottom: "1px solid #333" }}>
                <th style={{ textAlign: "left", padding: "2px 8px 4px 0" }}>instance ID</th>
                <th style={{ textAlign: "center", padding: "2px 6px" }}>rot Y</th>
                <th style={{ textAlign: "center", padding: "2px 6px" }}>q</th>
                <th style={{ textAlign: "center", padding: "2px 6px" }}>snap</th>
                <th style={{ textAlign: "left", padding: "2px 0 2px 6px" }}>position</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={r.id}
                  style={{ borderBottom: "1px solid #222", background: i % 2 ? "rgba(255,255,255,0.03)" : "transparent" }}
                >
                  <td style={{ padding: "3px 8px 3px 0", color: "#b3d9ff", whiteSpace: "nowrap" }}>{r.id}</td>
                  <td style={{ textAlign: "center", padding: "3px 6px", color: "#ffd77a" }}>{r.deg}°</td>
                  <td style={{ textAlign: "center", padding: "3px 6px", color: "#c8f" }}>{r.quad}</td>
                  <td style={{ textAlign: "center", padding: "3px 6px", color: "#7dffb3" }}>{r.snapping}</td>
                  <td style={{ padding: "3px 0 3px 6px", color: "#aaa", whiteSpace: "nowrap" }}>
                    [{r.pos.map((v) => v.toFixed(3)).join(", ")}]
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function SceneObjects({
  snapPreview,
  showCollisionBoxes,
  collisionBoxOpacity,
  showCameraBoxes,
  cameraBoxOpacity,
  showMeshColors,
  meshColorsOpacity,
  showSnapFaces,
  snapFacesOpacity,
}: {
  snapPreview: {
    fromId: string;
    toId: string;
    fromPos: [number, number, number];
    toPos: [number, number, number];
  } | null;
  showCollisionBoxes: boolean;
  collisionBoxOpacity: number;
  showCameraBoxes: boolean;
  cameraBoxOpacity: number;
  showMeshColors: boolean;
  meshColorsOpacity: number;
  showSnapFaces: boolean;
  snapFacesOpacity: number;
}) {
  const {
    sceneObjects,
    objectRotations,
    objectPositions,
    objectBoundingSizes,
    objectBoundingOffsets,
  } = useConfigurator();

  return (
    <>
      {sceneObjects.map((inst, index) => {
        const position = objectPositions.get(inst.instanceId) || [
          index * 1.9,
          0,
          0,
        ];
        const rotation = objectRotations.get(inst.instanceId) || [0, 0, 0];
        return (
          <group key={inst.instanceId}>
            <DynamicModel
              objectId={inst.instanceId}
              position={position as [number, number, number]}
              rotation={rotation as [number, number, number]}
            />
            {showCollisionBoxes && (
              <CollisionDebugBox
                position={position as [number, number, number]}
                rotationY={rotation[1]}
                category={getModuleCategory(inst.instanceId)}
                measuredSize={objectBoundingSizes.get(
                  extractBaseModuleId(inst.instanceId),
                )}
                offset={objectBoundingOffsets.get(
                  extractBaseModuleId(inst.instanceId),
                )}
                opacity={collisionBoxOpacity}
              />
            )}
            {showCameraBoxes && (
              <CameraBoxDebug
                instanceId={inst.instanceId}
                opacity={cameraBoxOpacity}
              />
            )}
            {showSnapFaces && (
              <SnapFaceDebug
                instanceId={inst.instanceId}
                opacity={snapFacesOpacity}
              />
            )}
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

      {showMeshColors && <MeshColorDebug opacity={meshColorsOpacity} />}
    </>
  );
}

const Scene = () => {
  const {
    selectedObjectId,
    currentMaterial,
    getObjectMaterial,
    getObjectPbr,
    setObjectPbr,
  } = useMaterial();
  const {
    sceneObjects,
    rotationControlId,
    setRotationControlId,
    setObjectPosition,
    objectPositions,
    objectRotations,
  } = useConfigurator();
  const { t } = useLanguage();

  const [isDraggingObject, setIsDraggingObject] = useState(false);
  const [recenterTrigger, setRecenterTrigger] = useState(0);
  const [manualRecenterTrigger, setManualRecenterTrigger] = useState(0);
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

  // When new objects are spawned, briefly show the spinner to mask the initial
  // camera-recenter snap. We trigger showLoader for one frame then immediately
  // call hideLoader so the spinner's built-in 400 ms fade-out covers the start
  // of the camera animation without showing a long blocking overlay.
  const spawnSpinnerRafRef = useRef<number>(0);
  useEffect(() => {
    if (sceneObjects.length <= previousSceneObjectsLength.current) return;
    const { showLoader, hideLoader } = useLoaderStore.getState();
    showLoader("");
    cancelAnimationFrame(spawnSpinnerRafRef.current);
    spawnSpinnerRafRef.current = requestAnimationFrame(() => {
      hideLoader();
    });
  }, [sceneObjects.length]);

  const handleRecenter = () => {
    setManualRecenterTrigger((prev) => prev + 1);
  };

  // On refresh, recenter once when session-restored objects appear
  const hasRecenteredOnMountRef = useRef(false);
  useEffect(() => {
    if (!hasRecenteredOnMountRef.current && sceneObjects.length > 0) {
      hasRecenteredOnMountRef.current = true;
      setRecenterTrigger((prev) => prev + 1);
    }
  }, [sceneObjects]);

  const handleDragUpdate = (
    instanceId: string,
    position: [number, number, number],
  ) => {
    setObjectPosition(instanceId, position);
  };

  const handleDragStateChange = (isDragging: boolean) => {
    setIsDraggingObject(isDragging);
  };

  // Ref that always holds the latest values needed by Leva button callbacks,
  // which close over the mount-time scope and would otherwise see stale state.
  const pbrActionRef = useRef<{
    selectedObjectId: string | null;
    getObjectMaterial: typeof getObjectMaterial;
    getObjectPbr: typeof getObjectPbr;
  }>({ selectedObjectId: null, getObjectMaterial, getObjectPbr });

  useEffect(() => {
    pbrActionRef.current = { selectedObjectId, getObjectMaterial, getObjectPbr };
  });

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
        sheen: { value: 0.04, min: 0, max: 1, step: 0.01 },
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
          value: 0.53,
          min: 0,
          max: 2,
          step: 0.01,
          label: "AO Intensity",
        },
        // ─── PBR default management (DEV only) ───────────────────────
        setShadeDefault: button(() => {
          const { selectedObjectId: id, getObjectMaterial: getMat, getObjectPbr: getPbr } =
            pbrActionRef.current;
          if (!id) return;
          const mat = getMat(id);
          if (!mat) return;
          setPbrDefault(mat.name, getPbr(id));
          console.info(`[PBR] Set default for "${mat.name}"`);
        }),
        exportPbrJson: button(() => {
          exportPbrDefaults();
        }),
      },
      { collapsed: true },
    ),
  }));

  // Leva tuning writes ONLY to the currently selected object's stored PBR, so
  // moving a slider never touches any other module. With nothing selected the
  // panel is inert.
  //
  // IMPORTANT: this effect intentionally depends on the matControls values
  // ONLY — never on selectedObjectId. When the selection changes, the load
  // effect below sets the sliders to the new object's values; on that same
  // commit the sliders still briefly hold the PREVIOUS object's values. If we
  // also re-ran this writer on selectedObjectId, it would fire first and write
  // those stale previous-object values into the newly selected object, making
  // its uvScale flicker before settling. By keying only on slider movement we
  // write only on real user edits, targeting whatever object is selected at
  // that moment.
  useEffect(() => {
    if (!selectedObjectId) return;
    setObjectPbr(selectedObjectId, {
      uvScale: matControls.uvScale,
      normalScale: matControls.normalStrength,
      metalness: matControls.metalness,
      roughness: matControls.roughness,
      sheen: matControls.sheen,
      sheenRoughness: matControls.sheenRoughness,
      envMapIntensity: matControls.envMapIntensity,
      aoMapIntensity: matControls.aoMapIntensity,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Load the selected object's stored PBR into the sliders when the selection
  // changes, or when its material changes (which re-seeds its defaults). This
  // is what makes the panel reflect the object you're actually looking at.
  useEffect(() => {
    if (!selectedObjectId) return;
    const p = getObjectPbr(selectedObjectId);
    setMatControls({
      uvScale: p.uvScale,
      normalStrength: p.normalScale,
      metalness: p.metalness,
      roughness: p.roughness,
      sheen: p.sheen,
      sheenRoughness: p.sheenRoughness,
      envMapIntensity: p.envMapIntensity,
      aoMapIntensity: p.aoMapIntensity,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedObjectId, currentMaterial]);

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

  const debugControls = useControls(
    "Debug",
    {
      showCollisionBoxes: { value: false, label: "Collision Boxes" },
      collisionBoxOpacity: {
        value: 0.35,
        min: 0,
        max: 1,
        step: 0.01,
        label: "Box Opacity",
      },
      showCameraBoxes: { value: false, label: "Camera Boxes" },
      cameraBoxOpacity: {
        value: 0.3,
        min: 0,
        max: 1,
        step: 0.01,
        label: "Camera Box Opacity",
      },
      showMeshColors: { value: false, label: "Mesh Colors" },
      meshColorsOpacity: {
        value: 0.5,
        min: 0,
        max: 1,
        step: 0.01,
        label: "Mesh Color Opacity",
      },
      showSnapFaces: { value: false, label: "Snap Faces" },
      snapFacesOpacity: {
        value: 0.6,
        min: 0,
        max: 1,
        step: 0.01,
        label: "Snap Face Opacity",
      },
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
          <>
            <Leva
              collapsed={true}
              oneLineLabels={true}
            />
            <DebugInfoPanel />
          </>
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
          <CameraCollisionConstraint
            orbitControlsRef={orbitControlsRef}
            sceneObjects={sceneObjects}
            objectPositions={objectPositions}
            objectRotations={objectRotations}
          />
          <AutoCenterCamera
            orbitControlsRef={orbitControlsRef}
            objectPositions={objectPositions}
            sceneObjects={sceneObjects}
            enabled={rotationControlId === null && !isAutoCenterEnabled}
            isDragging={isDraggingObject}
            recenterTrigger={recenterTrigger}
            manualRecenterTrigger={manualRecenterTrigger}
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
            onEnd={() => {
              const controls = orbitControlsRef.current;
              if (!controls) return;
              saveSession("camera_state", {
                position: {
                  x: controls.object.position.x,
                  y: controls.object.position.y,
                  z: controls.object.position.z,
                },
                target: {
                  x: controls.target.x,
                  y: controls.target.y,
                  z: controls.target.z,
                },
              });
            }}
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

          <SceneObjects
            snapPreview={snapPreview}
            showCollisionBoxes={debugControls.showCollisionBoxes}
            collisionBoxOpacity={debugControls.collisionBoxOpacity}
            showCameraBoxes={debugControls.showCameraBoxes}
            cameraBoxOpacity={debugControls.cameraBoxOpacity}
            showMeshColors={debugControls.showMeshColors}
            meshColorsOpacity={debugControls.meshColorsOpacity}
            showSnapFaces={debugControls.showSnapFaces}
            snapFacesOpacity={debugControls.snapFacesOpacity}
          />

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
              files={`${import.meta.env.BASE_URL}hdri/empty_warehouse_01_1k.hdr`}
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
