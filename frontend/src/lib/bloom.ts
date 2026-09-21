/**
 * bloom.ts — Preserved from gods-eye-view
 * Normalizes Cesium post-processing bloom intensity.
 */

export const BLOOM_SCALE_VERSION = 2;
export const BLOOM_INTENSITY_MAX = 200;
export const BLOOM_INTENSITY_DEFAULT = 40;

export function clampBloomIntensity(value: number): number {
  const num = Number(value);
  if (!Number.isFinite(num)) return BLOOM_INTENSITY_DEFAULT;
  return Math.max(0, Math.min(BLOOM_INTENSITY_MAX, Math.round(num)));
}

export function bloomStrengthFromIntensity(value: number): number {
  return clampBloomIntensity(value) / BLOOM_INTENSITY_MAX;
}

export function configureCesiumBloom(viewer: any, intensity: number = BLOOM_INTENSITY_DEFAULT) {
  if (!viewer?.scene?.postProcessStages?.bloom) return;
  const bloomStage = viewer.scene.postProcessStages.bloom;
  bloomStage.enabled = true;
  
  const rawStrength = bloomStrengthFromIntensity(intensity);
  const strength = rawStrength <= 0.06 ? 0.0 : (rawStrength - 0.06) / 0.94;
  const eased = strength * strength * (3.0 - 2.0 * strength);

  bloomStage.uniforms.contrast = 255.0 - eased * 168.0;
  bloomStage.uniforms.brightness = -0.5 + eased * 0.36;
  bloomStage.uniforms.sigma = 0.28 + eased * 6.3;
  bloomStage.uniforms.delta = 0.2 + eased * 2.25;
  bloomStage.uniforms.stepSize = 1.0 + eased * 1.25;
}
