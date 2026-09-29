// Every tunable constant for the Bloxity (Legion) SDK integration lives
// here — systems/bloxity.js reads this. No SDK constant belongs in a
// component. Ported from Age-every-click's data/bloxity.js, which targets
// the same shared Bloxity base rig.

// Slug this game is registered under on bloxity.io.
export const GAME_SLUG = 'stone-skipping'

// Explicit dev-mode escape hatch (set via .env / .env.local, see
// .env.example) — forces the Bloxity SDK (sdk.bloxity.io) and avatar CDN
// (static.bloxity.io) to be treated as unavailable no matter what actually
// loads, so local dev never depends on those hosts being reachable. Off by
// default: a plain `npm run dev` still tries the real SDK/CDN, same as
// production, and only falls back on an actual failure.
export const DEV_MODE = import.meta.env.VITE_DEV_MODE === 'true'

// SDK setting keys this game listens for. Registering a listener is what
// makes the control appear in the portal's settings menu, so every key here
// has something behind it (see systems/bloxity.js's applySetting and
// components/Hud.jsx for the ones read straight from settingsState).
export const SETTINGS = {
  master_volume: { def: '80', type: 'number', min: 0, max: 100 },
  music_volume: { def: '80', type: 'number', min: 0, max: 100 },
  graphics_quality: { def: 'High', type: 'enum', values: ['Low', 'Medium', 'High', 'Ultra'] },
  show_fps: { def: 'false', type: 'bool' },
  camera_sensitivity: { def: '1', type: 'number', min: 0.1, max: 5 },
  enable_chat: { def: 'true', type: 'bool' },
  fullscreen: { def: 'false', type: 'bool' },
  background_transparency: { def: '0.9', type: 'number', min: 0.2, max: 1 },
}

// The base rig, measured from the shipped player.glb: origin at the feet,
// 6.4 units tall at bind pose (the same shared Bloxity rig Age-every-click
// and its sibling templates measured this from). systems/avatarLoader.js's
// applyProportions and systems/defaultCharacter.js's buildDefaultCharacter
// use this to convert the rig's native units into the game's metres —
// without it the avatar renders ~3.5x too big next to the capsule
// (player.dims.height is 1.8m).
export const RIG_HEIGHT = 6.4

// Bind-pose values of the rig nodes the SDK proportions drive.
export const RIG = {
  armOffsetX: 2, // ArmL_Offset.x, mirrored for ArmR_Offset
  legOffsetX: 0.6, // LegL_Offset.x, mirrored
  neckOffsetY: 0.6, // Neck_Offset.y
}

// getProportions() ranges, straight from the SDK spec. Values arrive from a
// remote portal (and, for other players, over the network), so everything is
// clamped before it reaches the scene graph.
export const PROPORTIONS = {
  height: { def: 1, min: 0.5, max: 1.6 },
  shoulderWidth: { def: 1, min: 0.5, max: 1.5 },
  armLength: { def: 1, min: 0.05, max: 3 },
  legOffsetX: { def: 1, min: -0.7, max: 5 },
  torsoScaleX: { def: 1, min: 0.3, max: 2 },
  neckHeight: { def: 1, min: 0.94, max: 1.2 },
  headScale: { def: 1, min: 0.3, max: 2.6 },
}

// --- Locomotion: the walk cycle -----------------------------------------
// The shared Bloxity base rig is R6-style: single-segment limbs
// (ArmL1/ArmR1/LegL1/LegR1) and a two-node spine, no forearm/shin/foot bone
// to key — a cycle that fits it is a four-bone contralateral swing plus a
// body bob. Numbers ported from Age-every-click, which targets this exact
// same rig and already tuned these against it.
export const GAIT = {
  runClip: /run|sprint|jog|walk/i,
  idleClip: /idle|stand/i,
  strideHz: 2.6,
  legSwing: 0.9,
  armSwing: 0.55,
  lean: 0.12,
  bob: 0.06,
  swingAxis: 'x',
  blendHz: 8,

  swayAxis: 'z',
  idleSwayHz: 1.6,
  idleArmSway: 0.07,
  idleArmSwayAmp: 0.03,
  idleSpineSway: 0.02,
  idleBob: 0.03,

  airborneLegL: -0.55,
  airborneLegR: 0.3,
  airborneArm: -2.1,
  airborneLean: -0.1,
}

export function clamp(n, min, max) {
  return n < min ? min : n > max ? max : n
}

// Coerce one raw SDK string against its SETTINGS entry.
export function coerceSetting(key, raw) {
  const spec = SETTINGS[key]
  if (!spec) return raw
  const value = raw === '' || raw == null ? spec.def : raw
  if (spec.type === 'bool') return value === 'true'
  if (spec.type === 'enum') return spec.values.includes(value) ? value : spec.def
  const n = Number(value)
  return clamp(Number.isFinite(n) ? n : Number(spec.def), spec.min, spec.max)
}
