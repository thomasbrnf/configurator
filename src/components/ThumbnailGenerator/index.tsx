import React, { useEffect, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { availableCompleteSets } from "../../context/ConfiguratorContext";

async function renderThumbnail(modelPath: string): Promise<string> {
  const SIZE = 512;

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    preserveDrawingBuffer: true,
  });
  renderer.setSize(SIZE, SIZE);
  renderer.setPixelRatio(1);
  renderer.toneMapping = THREE.CineonToneMapping;
  renderer.toneMappingExposure = 0.9;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf0f0f0);

  // 3-point lighting for a clean product shot
  scene.add(new THREE.AmbientLight(0xffffff, 1.0));
  const key = new THREE.DirectionalLight(0xffffff, 3.0);
  key.position.set(4, 6, 4);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, 1.0);
  fill.position.set(-3, 2, -2);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffffff, 0.6);
  rim.position.set(0, 4, -5);
  scene.add(rim);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.01, 1000);

  const loader = new GLTFLoader();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gltf = await new Promise<any>((resolve, reject) =>
    loader.load(modelPath, resolve, undefined, reject),
  );

  const model = gltf.scene;
  scene.add(model);

  // Center on X/Z, sit flush on ground
  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  model.position.set(-center.x, -box.min.y, -center.z);

  const maxDim = Math.max(size.x, size.y, size.z);
  const dist = maxDim * 1.9;
  const lookAtY = size.y * 0.45;

  // Straight front view — centered, no rotation
  camera.position.set(0, lookAtY + dist * 0.3, dist);
  camera.lookAt(0, lookAtY, 0);

  renderer.render(scene, camera);
  const url = renderer.domElement.toDataURL("image/png");
  renderer.dispose();
  return url;
}

interface Result {
  name: string;
  url: string;
  filename: string;
}

const ThumbnailGenerator: React.FC = () => {
  const [results, setResults] = useState<Result[]>([]);
  const [status, setStatus] = useState("Starting…");
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const out: Result[] = [];
      for (const set of availableCompleteSets) {
        if (cancelled) return;
        setStatus(`Rendering ${set.name}…`);
        try {
          const url = await renderThumbnail(set.modelPath);
          const filename = `${set.name}.png`;
          out.push({ name: set.name, url, filename });
          setResults([...out]);
          // Auto-download
          const a = document.createElement("a");
          a.href = url;
          a.download = filename;
          a.click();
        } catch (e) {
          console.error(`Failed to render thumbnail for ${set.name}:`, e);
        }
      }
      if (!cancelled) {
        setStatus("Done — all files downloaded to your Downloads folder.");
        setDone(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-white z-[9999] flex flex-col items-center justify-center gap-10 p-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-black mb-1">
          Thumbnail Generator
        </h1>
        <p
          className={`text-sm ${done ? "text-[#06402b] font-semibold" : "text-gray-500"}`}
        >
          {status}
        </p>
      </div>

      <div className="flex gap-8 flex-wrap justify-center">
        {availableCompleteSets.map((set) => {
          const result = results.find((r) => r.name === set.name);
          return (
            <div key={set.id} className="flex flex-col items-center gap-3">
              <div className="w-48 h-48 rounded-xl border-2 border-gray-200 overflow-hidden bg-gray-100 flex items-center justify-center">
                {result ? (
                  <img
                    src={result.url}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <svg
                      className="w-8 h-8 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8z"
                      />
                    </svg>
                    <span className="text-xs">{set.name}</span>
                  </div>
                )}
              </div>

              {result && (
                <a
                  href={result.url}
                  download={result.filename}
                  className="px-5 py-2 bg-[#06402b] text-white text-sm font-semibold rounded-lg hover:bg-[#06402b]/85 active:scale-95 transition-all"
                >
                  Download {result.filename}
                </a>
              )}
              {!result && (
                <span className="text-xs text-gray-400 py-2">
                  {set.name}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {done && (
        <p className="text-xs text-gray-400 text-center max-w-md">
          Save downloaded files to{" "}
          <code className="bg-gray-100 px-1 rounded">
            public/models/thumbnails/
          </code>{" "}
          — the configurator will pick them up automatically.
        </p>
      )}
    </div>
  );
};

export default ThumbnailGenerator;
