// Production-tuned defaults extracted from Leva debug controls.
// When Leva is disabled in production these values are used directly.

export const sceneDefaults = {
  camera: {
    enableManualCamera: false,
    positionX: 1.7,
    positionY: 27.8,
    positionZ: 9.1,
    fov: 60,
    targetX: -2.2,
    targetY: -3.3,
    targetZ: -6,
  },
  toneMapping: {
    toneMapping: "CineonToneMapping" as const,
    exposure: 0.4,
  },
  material: {
    uvScale: 2.4,
    normalScale: 1.60,
    metalness: 0.45,
    roughness: 0.87,
  },
  lighting: {
    ambientIntensity: 0.8,
    directionalIntensity: 0.8,
    directionalX: -0.1,
    directionalY: 1.1,
    directionalZ: -1.6,
  },
  shadows: {
    shadowOpacity: 0.42,
    shadowScale: 0.1,
    shadowBlur: 0.1,
    shadowFar: 21,
    shadowsWidth: 512,
    shadowsHeight: 512,
  },
  environment: {
    preset: "warehouse" as const,
    background: false,
    blur: 0.17,
    environmentIntensity: 1.6,
    rotationY: 0.18,
  },
} as const;
