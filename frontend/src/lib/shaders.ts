/**
 * shaders.ts — Preserved shader post-processing pipeline from gods-eye-view.
 * Provides Retro CRT, Night-Vision Surveillance, FLIR Thermal, and Sharpen shaders.
 */

export const SHARPEN_SHADER = /* glsl */ `
  uniform sampler2D colorTexture;
  uniform vec2 colorTextureDimensions;
  uniform float amount;
  in vec2 v_textureCoordinates;

  void main() {
    vec2 step = 1.0 / colorTextureDimensions;
    vec4 center = texture(colorTexture, v_textureCoordinates);
    vec4 top    = texture(colorTexture, v_textureCoordinates + vec2(0.0, step.y));
    vec4 bottom = texture(colorTexture, v_textureCoordinates - vec2(0.0, step.y));
    vec4 left   = texture(colorTexture, v_textureCoordinates - vec2(step.x, 0.0));
    vec4 right  = texture(colorTexture, v_textureCoordinates + vec2(step.x, 0.0));

    vec4 edge = 4.0 * center - top - bottom - left - right;
    out_FragColor = clamp(center + edge * amount, 0.0, 1.0);
  }
`;

export const SURVEILLANCE_SHADER = /* glsl */ `
  uniform sampler2D colorTexture;
  uniform vec2 colorTextureDimensions;
  uniform float intensity;
  uniform float time;
  in vec2 v_textureCoordinates;

  float hash(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }

  void main() {
    vec2 uv = v_textureCoordinates;
    vec4 original = texture(colorTexture, uv);
    float luma = dot(original.rgb, vec3(0.299, 0.587, 0.114));
    
    // P43 Green phosphor response
    vec3 phosphor = vec3(0.16, 1.0, 0.22);
    vec3 nvgColor = phosphor * (luma * 1.5);

    // Subtle scanlines
    float scanline = sin(uv.y * colorTextureDimensions.y * 1.5 + time * 3.0) * 0.5 + 0.5;
    nvgColor *= 1.0 - scanline * 0.12;

    // Scintillation noise
    float noise = (hash(uv * colorTextureDimensions + vec2(time * 150.0)) - 0.5) * 0.08;
    nvgColor += phosphor * noise;

    // Vignette
    vec2 centered = uv * 2.0 - 1.0;
    float vig = 1.0 - dot(centered, centered) * 0.35;
    nvgColor *= clamp(vig, 0.0, 1.0);

    out_FragColor = vec4(mix(original.rgb, nvgColor, intensity), 1.0);
  }
`;

export const RETRO_CRT_SHADER = /* glsl */ `
  uniform sampler2D colorTexture;
  uniform vec2 colorTextureDimensions;
  uniform float intensity;
  uniform float time;
  in vec2 v_textureCoordinates;

  void main() {
    vec2 uv = v_textureCoordinates;
    vec2 centered = uv - 0.5;
    
    // Chromatic aberration
    float ca = length(centered) * 0.006 * intensity;
    float r = texture(colorTexture, uv + centered * ca).r;
    float g = texture(colorTexture, uv).g;
    float b = texture(colorTexture, uv - centered * ca).b;
    vec3 color = vec3(r, g, b);

    // Scanlines
    float scanline = sin(uv.y * colorTextureDimensions.y * 1.2) * 0.5 + 0.5;
    color *= 1.0 - scanline * 0.15 * intensity;

    // Amber/phosphor warmth
    color = mix(color, color * vec3(1.1, 1.0, 0.8), 0.3 * intensity);

    out_FragColor = vec4(mix(texture(colorTexture, uv).rgb, color, intensity), 1.0);
  }
`;

export function setupPostProcessingStages(Cesium: any, viewer: any) {
  if (!viewer?.scene?.postProcessStages) return null;

  try {
    // 1. Sharpen Stage
    const sharpenStage = new Cesium.PostProcessStage({
      name: 'godsEyeSharpen',
      fragmentShader: SHARPEN_SHADER,
      uniforms: { amount: 0.8 },
    });
    viewer.scene.postProcessStages.add(sharpenStage);

    // 2. Tactical Surveillance Stage
    const surveillanceStage = new Cesium.PostProcessStage({
      name: 'godsEyeSurveillance',
      fragmentShader: SURVEILLANCE_SHADER,
      uniforms: {
        intensity: 0.0,
        time: 0.0,
      },
    });
    viewer.scene.postProcessStages.add(surveillanceStage);

    // 3. Retro CRT Stage
    const retroStage = new Cesium.PostProcessStage({
      name: 'godsEyeRetro',
      fragmentShader: RETRO_CRT_SHADER,
      uniforms: {
        intensity: 0.0,
        time: 0.0,
      },
    });
    viewer.scene.postProcessStages.add(retroStage);

    let animationFrameId: number;
    const startTime = performance.now();
    const animateShaders = (now: number) => {
      const elapsed = (now - startTime) / 1000;
      if (surveillanceStage && surveillanceStage.enabled) {
        surveillanceStage.uniforms.time = elapsed;
      }
      if (retroStage && retroStage.enabled) {
        retroStage.uniforms.time = elapsed;
      }
      animationFrameId = requestAnimationFrame(animateShaders);
    };
    animationFrameId = requestAnimationFrame(animateShaders);

    return {
      setMode: (mode: 'normal' | 'surveillance' | 'retro') => {
        surveillanceStage.enabled = mode === 'surveillance';
        surveillanceStage.uniforms.intensity = mode === 'surveillance' ? 1.0 : 0.0;

        retroStage.enabled = mode === 'retro';
        retroStage.uniforms.intensity = mode === 'retro' ? 1.0 : 0.0;

        viewer.scene.requestRender();
      },
      destroy: () => {
        cancelAnimationFrame(animationFrameId);
      },
    };
  } catch (err) {
    console.warn('Post-processing shader setup encountered an error:', err);
    return null;
  }
}
