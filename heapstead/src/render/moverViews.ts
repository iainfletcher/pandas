import {
  Group, Mesh, BoxGeometry, CylinderGeometry, MeshLambertMaterial,
  Vector3, Quaternion, Matrix4, type Material,
} from 'three';
import type { MoverSnapshot, MoverKind } from '../sim/mover.ts';
import type { Vec3 } from '../sim/vec.ts';
import { FACING_YAW } from '../sim/vec.ts';
import { MACHINE } from './palette.ts';
import { RENDER } from './renderConfig.ts';
import { BlockPool } from './blockViews.ts';

/**
 * The machines, and the signature motions that identify them (SPEC §11).
 *
 * Everything in this file is cosmetic. None of it changes where a block ends
 * up — that is decided in `src/sim` and arrives here as a snapshot. A view may
 * lag, swing, bob or squash freely, because the sim already knows the answer.
 */

const mat = (colour: number): Material => new MeshLambertMaterial({ color: colour });

const box = (w: number, h: number, d: number, colour: number, x = 0, y = 0, z = 0): Mesh => {
  const mesh = new Mesh(new BoxGeometry(w, h, d), mat(colour));
  mesh.position.set(x, y, z);
  return mesh;
};

const TAU = Math.PI * 2;

export interface FrameContext {
  /** Seconds since the previous rendered frame. */
  readonly dt: number;
  /** Seconds since the scene started, for free-running cycles. */
  readonly time: number;
  readonly blocks: BlockPool;
}

export abstract class MoverView {
  readonly group = new Group();
  protected previousState = '';

  abstract update(snapshot: MoverSnapshot, ctx: FrameContext): void;

  protected stateChangedTo(state: string): boolean {
    const changed = this.previousState !== state;
    this.previousState = state;
    return changed;
  }

  /** Place a loose block mesh, for blocks this mover is holding. */
  protected placeCarried(snapshot: MoverSnapshot, ctx: FrameContext): void {
    for (const held of snapshot.carried) {
      const mesh = ctx.blocks.acquire(held.id, held.type);
      mesh.position.set(held.pos.x, held.pos.y, held.pos.z);
      mesh.rotation.set(0, 0, 0);
      mesh.scale.setScalar(1);
    }
  }
}

/* ------------------------------------------------------------------ digger */

/** A short-lived dust puff (SPEC §11.4). */
interface Puff { mesh: Mesh; age: number; vx: number; vy: number; vz: number }

export class DiggerView extends MoverView {
  private readonly chassis = new Group();
  private readonly arm = new Group();
  private readonly puffs: Puff[] = [];
  private readonly puffGroup = new Group();

  constructor() {
    super();
    this.chassis.add(box(1.0, 0.34, 1.2, MACHINE.diggerTrim, 0, 0.17, 0));
    this.chassis.add(box(0.82, 0.46, 0.86, MACHINE.diggerBody, -0.05, 0.6, 0));
    this.chassis.add(box(0.5, 0.34, 0.5, MACHINE.diggerTrim, -0.1, 0.98, 0));
    // The arm reaches forward along +X, which is what the facing yaw orients.
    this.arm.position.set(0.35, 0.62, 0);
    this.arm.add(box(0.78, 0.18, 0.18, MACHINE.diggerArm, 0.34, 0, 0));
    this.arm.add(box(0.4, 0.36, 0.5, MACHINE.diggerBucket, 0.76, -0.1, 0));
    this.chassis.add(this.arm);
    this.group.add(this.chassis);
    this.group.add(this.puffGroup);
  }

  override update(snapshot: MoverSnapshot, ctx: FrameContext): void {
    this.group.position.set(snapshot.pos.x, snapshot.pos.y, snapshot.pos.z);
    this.group.rotation.y = FACING_YAW[snapshot.facing];

    const cfg = RENDER.motion.digger;
    if (snapshot.state === 'digging') {
      // Rock back and forth against the work face.
      const phase = snapshot.stateProgress * TAU * cfg.rocksPerDig;
      this.chassis.rotation.z = Math.sin(phase) * cfg.rockRadians;
      this.arm.rotation.z = -Math.sin(phase) * cfg.rockRadians * 1.6;
    } else {
      this.chassis.rotation.z *= 0.86;
      this.arm.rotation.z *= 0.86;
    }

    // The stroke that frees the block is the one that puffs.
    if (this.stateChangedTo(snapshot.state) && snapshot.state === 'travelToSink') {
      this.spawnPuffs(ctx);
    }
    this.updatePuffs(ctx);
    this.placeCarried(snapshot, ctx);
  }

  private spawnPuffs(ctx: FrameContext): void {
    const cfg = RENDER.motion.digger;
    for (let i = 0; i < cfg.puffCount; i++) {
      const mesh = box(1, 1, 1, MACHINE.puff);
      mesh.scale.setScalar(cfg.puffStartScale);
      mesh.position.set(0.9, 0.3, 0);
      // Deterministic-enough spread; this is decoration, not simulation.
      const angle = (i / cfg.puffCount) * TAU + ctx.time;
      this.puffs.push({
        mesh,
        age: 0,
        vx: Math.cos(angle) * cfg.puffSpread,
        vy: cfg.puffRise,
        vz: Math.sin(angle) * cfg.puffSpread,
      });
      this.puffGroup.add(mesh);
    }
  }

  private updatePuffs(ctx: FrameContext): void {
    const cfg = RENDER.motion.digger;
    for (let i = this.puffs.length - 1; i >= 0; i--) {
      const puff = this.puffs[i];
      if (puff === undefined) continue;
      puff.age += ctx.dt;
      const t = puff.age / cfg.puffLifetime;
      if (t >= 1) {
        this.puffGroup.remove(puff.mesh);
        this.puffs.splice(i, 1);
        continue;
      }
      puff.mesh.position.x += puff.vx * ctx.dt;
      puff.mesh.position.y += puff.vy * ctx.dt * (1 - t);
      puff.mesh.position.z += puff.vz * ctx.dt;
      puff.mesh.scale.setScalar(cfg.puffStartScale + (cfg.puffEndScale - cfg.puffStartScale) * t);
      const material = puff.mesh.material as MeshLambertMaterial;
      material.transparent = true;
      material.opacity = 0.55 * (1 - t);
    }
  }
}

/* ------------------------------------------------------------------- chute */

export class ChuteView extends MoverView {
  private built = false;

  override update(snapshot: MoverSnapshot, ctx: FrameContext): void {
    if (!this.built) this.build(snapshot.path ?? []);

    // Blocks tumble as they travel, and bounce off the trough walls (§11.2).
    // Both are offsets around the deterministic path position the sim gives.
    const cfg = RENDER.motion.chute;
    for (const held of snapshot.carried) {
      const mesh = ctx.blocks.acquire(held.id, held.type);
      const bounce = Math.sin(ctx.time * cfg.bounceRate + held.id) * cfg.bounceAmplitude;
      mesh.position.set(held.pos.x, held.pos.y, held.pos.z + bounce);
      mesh.rotation.x = ctx.time * cfg.tumbleRate + held.id;
      mesh.rotation.z = ctx.time * cfg.tumbleRate * 0.6 + held.id;
      mesh.scale.setScalar(1);
    }
  }

  /** The trough itself: one stretched box per path segment, plus side walls. */
  private build(path: readonly Vec3[]): void {
    this.built = true;
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1] as Vec3;
      const b = path[i] as Vec3;
      const from = new Vector3(a.x, a.y, a.z);
      const to = new Vector3(b.x, b.y, b.z);
      const length = from.distanceTo(to);
      if (length < 1e-6) continue;

      const segment = new Group();
      segment.position.copy(from.clone().lerp(to, 0.5));

      /*
       * Build an explicit basis rather than rotating +Y onto the run with
       * `setFromUnitVectors`, which leaves the roll about the run undefined —
       * the trough came out twisted at every bend, reading as a dark wedge
       * rather than a channel. Here: local +Y follows the run, local +X is
       * horizontal across it, and local +Z is the trough's "up".
       */
      const forward = to.clone().sub(from).normalize();
      const worldUp = new Vector3(0, 1, 0);

      // World up, projected perpendicular to the run: the trough's own "up".
      let up = worldUp.clone().addScaledVector(forward, -forward.dot(worldUp));
      if (up.lengthSq() < 1e-8) up = new Vector3(1, 0, 0); // a vertical drop
      up.normalize();
      // x = y × z keeps the basis right-handed. Getting this the other way
      // round makes `makeBasis` a reflection, and a quaternion read out of a
      // reflection is nonsense — the trough collapses into slivers.
      const across = new Vector3().crossVectors(forward, up).normalize();
      segment.quaternion.setFromRotationMatrix(new Matrix4().makeBasis(across, forward, up));

      /*
       * Floor, then a wall down each side. Chunky on purpose: the first
       * version used 0.14-thick boards, which is what a real chute would be
       * and which vanished into the cliff face at any distance. A machine the
       * player cannot pick out is not legible (SPEC §2).
       */
      segment.add(box(1.5, length, 0.3, MACHINE.chuteTrough, 0, 0, -0.55));
      segment.add(box(0.26, length, 1.0, MACHINE.chuteTrough, -0.74, 0, -0.1));
      segment.add(box(0.26, length, 1.0, MACHINE.chuteTrough, 0.74, 0, -0.1));
      // A short brace under the lower end, so the run reads as built rather
      // than floating. Deliberately not a leg down to the ground: the ground
      // height is not known here, and sizing one from a world Y produced
      // twelve-cell spikes shooting out of the cliff.
      segment.add(box(0.34, 0.34, 0.9, MACHINE.chuteLeg, 0, -length / 2 + 0.25, -1.0));
      this.group.add(segment);
    }
  }
}

/* ------------------------------------------------------------------ barrow */

export class BarrowView extends MoverView {
  private readonly chassis = new Group();
  private readonly tray = new Group();
  private readonly wheel: Mesh;
  private travelled = 0;
  private last: Vector3 | null = null;

  constructor() {
    super();
    const cfg = RENDER.motion.barrow;
    this.chassis.add(box(0.78, 0.14, 0.5, MACHINE.barrowBody, 0, 0.3, 0));
    // Handles trailing behind.
    this.chassis.add(box(0.5, 0.09, 0.09, MACHINE.barrowBody, -0.6, 0.46, -0.18));
    this.chassis.add(box(0.5, 0.09, 0.09, MACHINE.barrowBody, -0.6, 0.46, 0.18));

    // The tray pivots about the axle, which is what makes the tip read as a dump.
    this.tray.position.set(0.18, 0.38, 0);
    this.tray.add(box(0.62, 0.1, 0.62, MACHINE.barrowTray, 0, 0, 0));
    this.tray.add(box(0.1, 0.34, 0.62, MACHINE.barrowTray, -0.31, 0.17, 0));
    this.tray.add(box(0.62, 0.34, 0.1, MACHINE.barrowTray, 0, 0.17, -0.31));
    this.tray.add(box(0.62, 0.34, 0.1, MACHINE.barrowTray, 0, 0.17, 0.31));
    this.chassis.add(this.tray);

    this.wheel = new Mesh(
      new CylinderGeometry(cfg.wheelRadius, cfg.wheelRadius, 0.12, 12),
      mat(MACHINE.wheel),
    );
    this.wheel.rotation.x = Math.PI / 2;
    this.wheel.position.set(0.42, cfg.wheelRadius, 0);
    this.chassis.add(this.wheel);
    this.group.add(this.chassis);
  }

  override update(snapshot: MoverSnapshot, ctx: FrameContext): void {
    const cfg = RENDER.motion.barrow;
    const here = new Vector3(snapshot.pos.x, snapshot.pos.y, snapshot.pos.z);
    if (this.last !== null) this.travelled += this.last.distanceTo(here);
    this.last = here.clone();

    this.group.position.copy(here);
    this.group.rotation.y = FACING_YAW[snapshot.facing];

    // Bob while rolling: driven by distance travelled, not by a timer, so a
    // stopped barrow sits still instead of idling like a boat (§11.3).
    const moving = Math.hypot(snapshot.velocity.x, snapshot.velocity.z) > 1e-4;
    const bob = moving ? Math.sin(this.travelled * cfg.bobPerCell * TAU) * cfg.bobAmplitude : 0;
    this.chassis.position.y = bob;
    this.chassis.rotation.z = bob * 0.8;
    this.wheel.rotation.y = -this.travelled / cfg.wheelRadius;

    // The tip.
    const tip = snapshot.state === 'tipping' ? snapshot.stateProgress : 0;
    this.tray.rotation.z = -tip * cfg.tipRadians;

    this.placeCarried(snapshot, ctx);
  }
}

/* ------------------------------------------------------------------- crane */

export class CraneView extends MoverView {
  private readonly jib = new Group();
  private readonly cable: Mesh;
  private readonly hookMesh: Mesh;
  /** Swing angles about the two horizontal axes, and their rates. */
  private swingX = 0;
  private swingZ = 0;
  private rateX = 0;
  private rateZ = 0;

  constructor() {
    super();
    this.group.add(box(1.3, 0.3, 1.3, MACHINE.craneMast, 0, 0.15, 0));
    this.group.add(box(0.34, RENDER.motion.crane.mastHeight, 0.34, MACHINE.craneMast, 0, RENDER.motion.crane.mastHeight / 2, 0));
    this.group.add(this.jib);
    this.cable = box(0.06, 1, 0.06, MACHINE.cable);
    this.hookMesh = box(0.26, 0.2, 0.26, MACHINE.craneJib);
    this.group.add(this.cable);
    this.group.add(this.hookMesh);
  }

  override update(snapshot: MoverSnapshot, ctx: FrameContext): void {
    const cfg = RENDER.motion.crane;
    const base = snapshot.pos;
    const hook = snapshot.parts['hook'] ?? base;
    const top = snapshot.parts['top'] ?? base;
    this.group.position.set(base.x, base.y, base.z);

    // The jib reaches from the mast out to above the hook.
    const reach = Math.hypot(hook.x - base.x, hook.z - base.z);
    this.jib.position.set((hook.x - base.x) / 2, top.y - base.y, (hook.z - base.z) / 2);
    this.jib.rotation.y = -Math.atan2(hook.z - base.z, hook.x - base.x);
    this.jib.clear();
    this.jib.add(box(Math.max(reach, 0.4), 0.2, 0.24, MACHINE.craneJib));

    /*
     * The pendulum (SPEC §11.1).
     *
     * A damped spring pulled toward an angle proportional to how fast the
     * hook is moving: the load lags into a swing when the crane sets off,
     * overshoots when it stops, and settles. Driving from velocity rather
     * than from acceleration keeps it stable when frame times jitter, which
     * a second-difference would not.
     */
    const targetZ = clamp(-snapshot.velocity.x * cfg.swingDrive, cfg.maxSwingRadians);
    const targetX = clamp(snapshot.velocity.z * cfg.swingDrive, cfg.maxSwingRadians);
    const dt = Math.min(ctx.dt, 1 / 30);
    this.rateZ += (cfg.swingStiffness * (targetZ - this.swingZ) - cfg.swingDamping * this.rateZ) * dt;
    this.rateX += (cfg.swingStiffness * (targetX - this.swingX) - cfg.swingDamping * this.rateX) * dt;
    this.swingZ += this.rateZ * dt;
    this.swingX += this.rateX * dt;

    // Hang the load from the swing angle, so at rest it sits exactly where
    // the sim says the hook is — no jump when the block is released.
    const anchorY = top.y;
    const length = Math.max(anchorY - hook.y, 0.25);
    const localX = hook.x - base.x + Math.sin(this.swingZ) * length;
    const localZ = hook.z - base.z + Math.sin(this.swingX) * length;
    const localY = anchorY - base.y - Math.cos(this.swingZ) * Math.cos(this.swingX) * length;

    this.hookMesh.position.set(localX, localY, localZ);
    // Stretch the cable between the jib tip and the hook.
    const anchor = new Vector3(hook.x - base.x, anchorY - base.y, hook.z - base.z);
    const hookLocal = new Vector3(localX, localY, localZ);
    const span = hookLocal.clone().sub(anchor);
    this.cable.position.copy(anchor.clone().add(span.clone().multiplyScalar(0.5)));
    this.cable.scale.set(1, Math.max(span.length(), 0.01), 1);
    this.cable.quaternion.copy(
      new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), span.clone().normalize()),
    );

    // The block rides the hook, swing and all.
    for (const held of snapshot.carried) {
      const mesh = ctx.blocks.acquire(held.id, held.type);
      mesh.position.set(base.x + localX, base.y + localY - 0.6, base.z + localZ);
      mesh.rotation.set(0, this.swingZ * 0.5, 0);
      mesh.scale.setScalar(1);
    }
  }
}

const clamp = (value: number, limit: number): number => Math.max(-limit, Math.min(limit, value));

export const makeView = (kind: MoverKind): MoverView => {
  switch (kind) {
    case 'digger': return new DiggerView();
    case 'chute': return new ChuteView();
    case 'barrow': return new BarrowView();
    case 'crane': return new CraneView();
  }
};
