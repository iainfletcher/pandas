import { PerspectiveCamera, Vector3, Spherical } from 'three';
import { RENDER } from './renderConfig.ts';

/**
 * Orbit, pan and zoom around a focus point (SPEC §10, §13).
 *
 * Written by hand rather than pulled from three's examples so the damping and
 * clamps are ours to tune, and so the control scheme is one short readable
 * file rather than a dependency with its own opinions.
 */
export class OrbitCamera {
  readonly camera: PerspectiveCamera;
  private readonly target: Vector3;
  private readonly spherical = new Spherical();
  private readonly desired = new Spherical();
  private readonly desiredTarget: Vector3;
  private dragging: 'orbit' | 'pan' | null = null;
  private lastX = 0;
  private lastY = 0;

  constructor(aspect: number, focus: Vector3) {
    const cfg = RENDER.camera;
    this.camera = new PerspectiveCamera(cfg.fov, aspect, cfg.near, cfg.far);
    this.target = focus.clone();
    this.desiredTarget = focus.clone();
    this.spherical.set(cfg.start.distance, Math.PI / 2 - cfg.start.elevation, cfg.start.azimuth);
    this.desired.copy(this.spherical);
    this.apply();
  }

  attach(element: HTMLElement): void {
    element.addEventListener('contextmenu', (e) => e.preventDefault());
    element.addEventListener('pointerdown', (e) => {
      this.dragging = e.button === 0 && !e.shiftKey ? 'orbit' : 'pan';
      this.lastX = e.clientX;
      this.lastY = e.clientY;
      element.setPointerCapture(e.pointerId);
    });
    element.addEventListener('pointerup', (e) => {
      this.dragging = null;
      element.releasePointerCapture(e.pointerId);
    });
    element.addEventListener('pointermove', (e) => {
      if (this.dragging === null) return;
      const dx = e.clientX - this.lastX;
      const dy = e.clientY - this.lastY;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
      if (this.dragging === 'orbit') this.orbit(dx, dy);
      else this.pan(dx, dy);
    });
    element.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.zoom(Math.exp(e.deltaY * 0.0012));
    }, { passive: false });
  }

  orbit(dx: number, dy: number): void {
    const cfg = RENDER.camera;
    this.desired.theta -= dx * 0.006;
    this.desired.phi = clamp(
      this.desired.phi + dy * 0.006,
      Math.PI / 2 - cfg.maxElevation,
      Math.PI / 2 - cfg.minElevation,
    );
  }

  pan(dx: number, dy: number): void {
    // Pan in the camera's own plane, scaled by distance so it feels the same
    // whether zoomed right in or right out.
    const scale = this.spherical.radius * 0.0016;
    const right = new Vector3().setFromMatrixColumn(this.camera.matrix, 0);
    const up = new Vector3().setFromMatrixColumn(this.camera.matrix, 1);
    this.desiredTarget.addScaledVector(right, -dx * scale);
    this.desiredTarget.addScaledVector(up, dy * scale);
  }

  zoom(factor: number): void {
    const cfg = RENDER.camera;
    this.desired.radius = clamp(this.desired.radius * factor, cfg.minDistance, cfg.maxDistance);
  }

  update(): void {
    const k = RENDER.camera.damping;
    this.spherical.radius += (this.desired.radius - this.spherical.radius) * k;
    this.spherical.theta += (this.desired.theta - this.spherical.theta) * k;
    this.spherical.phi += (this.desired.phi - this.spherical.phi) * k;
    this.target.lerp(this.desiredTarget, k);
    this.apply();
  }

  /** Frame the scene from an exact pose. Used by the screenshot harness. */
  set(distance: number, azimuth: number, elevation: number, target?: Vector3): void {
    const cfg = RENDER.camera;
    this.desired.radius = clamp(distance, cfg.minDistance, cfg.maxDistance);
    this.desired.theta = azimuth;
    this.desired.phi = clamp(
      Math.PI / 2 - elevation,
      Math.PI / 2 - cfg.maxElevation,
      Math.PI / 2 - cfg.minElevation,
    );
    if (target !== undefined) this.desiredTarget.copy(target);
    this.settle();
  }

  /** Jump straight to the desired pose, for screenshots that must not catch a lerp. */
  settle(): void {
    this.spherical.copy(this.desired);
    this.target.copy(this.desiredTarget);
    this.apply();
  }

  setAspect(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  private apply(): void {
    const offset = new Vector3().setFromSpherical(this.spherical);
    this.camera.position.copy(this.target.clone().add(offset));
    this.camera.lookAt(this.target);
    this.camera.updateMatrixWorld();
  }
}

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));
