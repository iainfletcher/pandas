/**
 * SPEC §12.3 — every parameter that affects how the game *looks and moves*,
 * as opposed to what it does. Nothing here may change where a block ends up.
 *
 * The split from `src/sim/config.ts` is the sim/render split (§12.1): if a
 * number changes the outcome, it belongs in the sim config; if it only changes
 * the impression, it belongs here. Swing damping is here. Chute speed is not.
 */
export const RENDER = {
  camera: {
    fov: 42,
    near: 0.1,
    far: 400,
    /** Starting orbit, in cells, relative to the scene centre. */
    start: { distance: 48, azimuth: -0.78, elevation: 0.52 },
    minDistance: 12,
    maxDistance: 180,
    /** Keep the camera above the horizon so it never looks up through the world. */
    minElevation: 0.08,
    maxElevation: 1.45,
    damping: 0.09,
  },

  /** Per-vertex ambient occlusion (SPEC §10). Index by occlusion level 0..3. */
  ao: {
    levels: [0.63, 0.78, 0.91, 1.0] as const,
  },

  light: {
    /** Tone-mapping exposure. Raise for a brighter, flatter day. */
    exposure: 1.06,
    /** Sky-and-ground ambience. Does most of the work in shadowed areas. */
    hemisphere: 1.42,
    sun: 1.45,
    /** Warm key from the south-west, so the cliff face reads. */
    sunDirection: { x: -0.62, y: 0.95, z: 0.5 },
    /** A dim cool fill from the opposite side keeps shadows from going muddy. */
    fill: 0.22,
    shadowMapSize: 2048,
    /** Nudged off the surface to keep flat-lit voxel faces from self-striping. */
    shadowBias: -0.0006,
    shadowNormalBias: 0.035,
  },

  /** Signature motions (SPEC §11). Amplitudes are deliberately small: calm. */
  motion: {
    crane: {
      /** Pendulum stiffness and damping. Higher damping settles sooner (§11.1). */
      swingStiffness: 34,
      swingDamping: 3.4,
      /** How hard hook movement kicks the swing. */
      swingDrive: 26,
      maxSwingRadians: 0.42,
      cableLength: 1.5,
      /** Mast height above the base; must reach the jib at SIM.crane.restHeight. */
      mastHeight: 3.2,
    },
    chute: {
      /** Radians per second a block tumbles as it travels (§11.2). */
      tumbleRate: 3.1,
      /** How far a block bounces off the chute walls, in cells. */
      bounceAmplitude: 0.16,
      bounceRate: 5.5,
    },
    barrow: {
      /** Bob amplitude in cells, and how many bobs per cell travelled (§11.3). */
      bobAmplitude: 0.055,
      bobPerCell: 3.4,
      /** Radians the tray rotates through on a full tip. */
      tipRadians: 1.15,
      wheelRadius: 0.26,
    },
    digger: {
      /** Rock amplitude in radians and rocks per dig stroke (§11.4). */
      rockRadians: 0.19,
      rocksPerDig: 3,
      puffCount: 5,
      puffLifetime: 0.75,
      puffRise: 0.9,
      puffSpread: 0.34,
      puffStartScale: 0.16,
      puffEndScale: 0.42,
    },
    landing: {
      /** 5% squash on landing (SPEC §11.5). */
      squash: 0.05,
      /** Seconds for the squash and its spring back. */
      duration: 0.24,
    },
  },

  /** Frames the world mesh waits before absorbing a landed block, so the
   *  squash has something to play on. Kept small enough to be invisible. */
  landingMeshDelaySeconds: 0.24,

  /** Fixed-step accumulator (SPEC §8). */
  loop: {
    /** Never run more than this many sim ticks in one frame: no spiral of death. */
    maxTicksPerFrame: 5,
  },
} as const;
