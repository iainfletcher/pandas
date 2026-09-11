import { Mesh, SphereGeometry, ShaderMaterial, BackSide, Color, SRGBColorSpace } from 'three';
import { SCENE } from './palette.ts';

/**
 * A gradient sky dome.
 *
 * A flat background colour makes the horizon a hard seam where the world stops
 * and the void begins. Three stops — warm at the horizon, neutral through the
 * middle, cool at the zenith — read as air, and give the fog something to
 * dissolve into instead of a wall of the same colour as itself.
 *
 * Written as a tiny shader rather than a texture so it costs nothing to load
 * and retunes from the palette.
 */
export const makeSky = (radius: number): Mesh => {
  const material = new ShaderMaterial({
    side: BackSide,
    depthWrite: false,
    // The dome is the backdrop; fogging it would wash the gradient flat.
    fog: false,
    uniforms: {
      horizon: { value: new Color().setHex(SCENE.skyHorizon, SRGBColorSpace) },
      middle: { value: new Color().setHex(SCENE.skyMid, SRGBColorSpace) },
      zenith: { value: new Color().setHex(SCENE.skyZenith, SRGBColorSpace) },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDirection;
      void main() {
        vDirection = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 horizon;
      uniform vec3 middle;
      uniform vec3 zenith;
      varying vec3 vDirection;
      void main() {
        float h = clamp(vDirection.y * 0.5 + 0.5, 0.0, 1.0);
        // Two smooth steps rather than one, so the warm band sits just above
        // the horizon instead of smearing all the way up.
        vec3 lower = mix(horizon, middle, smoothstep(0.42, 0.54, h));
        vec3 colour = mix(lower, zenith, smoothstep(0.50, 0.74, h));
        gl_FragColor = vec4(colour, 1.0);
      }
    `,
  });

  const sky = new Mesh(new SphereGeometry(radius, 24, 16), material);
  sky.frustumCulled = false;
  sky.renderOrder = -1;
  return sky;
};
