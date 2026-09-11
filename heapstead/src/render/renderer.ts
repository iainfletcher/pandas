import {
  Scene, WebGLRenderer, Mesh, MeshLambertMaterial, Group, Fog, Color,
  HemisphereLight, DirectionalLight, Vector3, FrontSide, PCFSoftShadowMap,
  ACESFilmicToneMapping, SRGBColorSpace,
} from 'three';
import type { Sim, SimSnapshot } from '../sim/sim.ts';
import type { MoverSnapshot, CarriedBlock } from '../sim/mover.ts';
import type { Vec3 } from '../sim/vec.ts';
import { lerp } from '../sim/vec.ts';
import { meshChunk } from './mesher.ts';
import { OrbitCamera } from './camera.ts';
import { SCENE } from './palette.ts';
import { makeSky } from './sky.ts';
import { RENDER } from './renderConfig.ts';
import { makeView, type MoverView, type FrameContext } from './moverViews.ts';
import { BlockPool, squashScale, type Squash } from './blockViews.ts';

/**
 * Scene assembly, chunk mesh management and render interpolation (SPEC §8, §10).
 *
 * The renderer never mutates sim state. It is handed two consecutive
 * snapshots and an alpha, and draws somewhere between them — which is what
 * lets a 10 Hz simulation look smooth at display rate.
 */

const worldMaterial = new MeshLambertMaterial({ vertexColors: true, side: FrontSide });

export class Renderer {
  readonly scene = new Scene();
  readonly orbit: OrbitCamera;
  private readonly renderer: WebGLRenderer;
  private readonly sim: Sim;
  private readonly chunkMeshes = new Map<number, Mesh>();
  private readonly chunkGroup = new Group();
  private readonly moverGroup = new Group();
  private readonly views = new Map<number, MoverView>();
  private readonly blocks = new BlockPool();
  private readonly squashes: Squash[] = [];
  /** Chunks whose re-mesh is deferred while a landing squash plays over them. */
  private readonly deferred = new Set<number>();
  private elapsed = 0;

  constructor(sim: Sim, canvas: HTMLCanvasElement) {
    this.sim = sim;
    this.renderer = new WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = SRGBColorSpace;
    // Filmic rolloff: flat-shaded voxels blow out into white under a strong
    // key without it, and the warm palette survives the curve better than it
    // survives clipping.
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = RENDER.light.exposure;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFSoftShadowMap;

    this.scene.background = new Color().setHex(SCENE.skyHorizon, SRGBColorSpace);
    this.scene.fog = new Fog(new Color().setHex(SCENE.fog, SRGBColorSpace), SCENE.fogNear, SCENE.fogFar);

    const span = Math.max(sim.world.sizeX, sim.world.sizeZ);
    this.scene.add(makeSky(span * 3));

    /*
     * Lighting: a hemisphere for ambience, one shadow-casting key, one cool
     * fill. The hemisphere is what stops shadowed faces going dead grey — it
     * feeds them sky from above and bounced earth from below, which is most of
     * what makes an outdoor scene feel outdoors.
     */
    const light = RENDER.light;
    this.scene.add(new HemisphereLight(
      new Color().setHex(SCENE.hemiSky, SRGBColorSpace),
      new Color().setHex(SCENE.hemiGround, SRGBColorSpace),
      light.hemisphere,
    ));

    const sun = new DirectionalLight(new Color().setHex(SCENE.sunColour, SRGBColorSpace), light.sun);
    sun.position.set(light.sunDirection.x, light.sunDirection.y, light.sunDirection.z)
      .normalize().multiplyScalar(span);
    sun.target.position.set(sim.world.sizeX / 2, 0, sim.world.sizeZ / 2);
    sun.castShadow = true;
    sun.shadow.mapSize.set(light.shadowMapSize, light.shadowMapSize);
    // Fit the shadow frustum to the world: too loose and the map is all
    // texels spent on empty air, too tight and the far end goes unshadowed.
    const extent = span * 0.72;
    sun.shadow.camera.left = -extent;
    sun.shadow.camera.right = extent;
    sun.shadow.camera.top = extent;
    sun.shadow.camera.bottom = -extent;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = span * 3;
    sun.shadow.bias = light.shadowBias;
    sun.shadow.normalBias = light.shadowNormalBias;
    this.scene.add(sun, sun.target);

    const fill = new DirectionalLight(new Color().setHex(SCENE.fillColour, SRGBColorSpace), light.fill);
    fill.position.set(-light.sunDirection.x, 0.45, -light.sunDirection.z).normalize();
    this.scene.add(fill);

    this.scene.add(this.chunkGroup, this.moverGroup, this.blocks.group);

    const focus = new Vector3(sim.world.sizeX * 0.5, 8, sim.world.sizeZ * 0.5);
    this.orbit = new OrbitCamera(canvas.clientWidth / Math.max(canvas.clientHeight, 1), focus);
    this.orbit.attach(canvas);

    for (const mover of sim.movers) {
      const view = makeView(mover.kind);
      this.views.set(mover.id, view);
      this.moverGroup.add(view.group);
    }

    this.resize();
    this.refreshChunks();
  }

  resize(): void {
    const canvas = this.renderer.domElement;
    const width = canvas.clientWidth || window.innerWidth;
    const height = canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(width, height, false);
    this.orbit.setAspect(width / Math.max(height, 1));
  }

  /** Re-mesh chunks the sim has dirtied, except those a squash is playing over. */
  private refreshChunks(): void {
    const pending = [...this.sim.world.drainDirty(), ...this.deferred];
    this.deferred.clear();
    for (const index of pending) {
      if (this.isHeld(index)) { this.deferred.add(index); continue; }
      const existing = this.chunkMeshes.get(index);
      if (existing !== undefined) {
        this.chunkGroup.remove(existing);
        existing.geometry.dispose();
        this.chunkMeshes.delete(index);
      }
      const built = meshChunk(this.sim.world, index);
      if (built === null) continue;
      const mesh = new Mesh(built.geometry, worldMaterial);
      mesh.frustumCulled = true;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.chunkGroup.add(mesh);
      this.chunkMeshes.set(index, mesh);
    }
  }

  private isHeld(chunkIndex: number): boolean {
    return this.squashes.some((s) => s.chunk === chunkIndex);
  }

  /**
   * Draw a frame somewhere between two sim states.
   *
   * @param alpha 0 at `previous`, 1 at `current`.
   */
  render(previous: SimSnapshot, current: SimSnapshot, alpha: number, dt: number): void {
    this.elapsed += dt;
    this.blocks.beginFrame();

    this.collectLandings(current);
    this.refreshChunks();

    const ctx: FrameContext = { dt, time: this.elapsed, blocks: this.blocks };

    const before = new Map(previous.movers.map((m) => [m.id, m]));
    for (const now of current.movers) {
      const view = this.views.get(now.id);
      if (view === undefined) continue;
      view.update(interpolateMover(before.get(now.id), now, alpha), ctx);
    }

    // Blocks in flight.
    const flyingBefore = new Map(previous.flying.map((f) => [f.id, f.pos]));
    for (const flying of current.flying) {
      const mesh = this.blocks.acquire(flying.id, flying.type);
      const from = flyingBefore.get(flying.id) ?? flying.pos;
      const p = lerp(from, flying.pos, alpha);
      mesh.position.set(p.x, p.y, p.z);
      mesh.rotation.x = this.elapsed * 1.4 + flying.id;
      mesh.rotation.z = this.elapsed * 0.9 + flying.id;
      mesh.scale.setScalar(1);
    }

    this.updateSquashes(dt);
    this.blocks.endFrame();

    this.orbit.update();
    this.renderer.render(this.scene, this.orbit.camera);
  }

  /** A block that just landed gets a squash, and its chunk gets held (§11.5). */
  private collectLandings(current: SimSnapshot): void {
    for (const landing of current.landings) {
      const chunk = this.sim.world.chunkIndexOf(landing.cell.x, landing.cell.y, landing.cell.z);
      this.squashes.push({
        id: landing.id,
        type: this.sim.world.getAt(landing.cell),
        x: landing.cell.x + 0.5,
        y: landing.cell.y + 0.5,
        z: landing.cell.z + 0.5,
        chunk,
        age: 0,
      });
    }
  }

  private updateSquashes(dt: number): void {
    const duration = RENDER.motion.landing.duration;
    for (let i = this.squashes.length - 1; i >= 0; i--) {
      const squash = this.squashes[i];
      if (squash === undefined) continue;
      squash.age += dt;
      const t = squash.age / duration;
      if (t >= 1) {
        this.squashes.splice(i, 1);
        // Releasing the hold lets the chunk absorb the block on the next frame.
        this.deferred.add(squash.chunk);
        continue;
      }
      const mesh = this.blocks.acquire(squash.id, squash.type);
      const scale = squashScale(t);
      mesh.scale.set(1 + (1 - scale) * 0.5, scale, 1 + (1 - scale) * 0.5);
      mesh.rotation.set(0, 0, 0);
      // Sit on the cell floor so the squash flattens downward, not inward.
      mesh.position.set(squash.x, squash.y - (1 - scale) * 0.5, squash.z);
    }
  }

  get looseBlockCount(): number { return this.blocks.size; }
  get chunkMeshCount(): number { return this.chunkMeshes.size; }
  get triangleCount(): number { return this.renderer.info.render.triangles; }
}

/** Interpolate the parts of a mover snapshot that are safe to interpolate. */
const interpolateMover = (before: MoverSnapshot | undefined, now: MoverSnapshot, alpha: number): MoverSnapshot => {
  if (before === undefined || before.state !== now.state) return now;

  const parts: Record<string, Vec3> = {};
  for (const [name, value] of Object.entries(now.parts)) {
    const from = before.parts[name];
    parts[name] = from === undefined ? value : lerp(from, value, alpha);
  }

  const carriedBefore = new Map(before.carried.map((c) => [c.id, c.pos]));
  const carried: CarriedBlock[] = now.carried.map((c) => {
    const from = carriedBefore.get(c.id);
    return from === undefined ? c : { ...c, pos: lerp(from, c.pos, alpha) };
  });

  return {
    ...now,
    pos: lerp(before.pos, now.pos, alpha),
    stateProgress: before.stateProgress + (now.stateProgress - before.stateProgress) * alpha,
    parts,
    carried,
  };
};
