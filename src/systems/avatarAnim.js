// The avatar walk cycle. Framework-free: components/Player.jsx builds one of
// these alongside the built avatar and ticks it each frame.
//
// Two paths, preferring an animation the rig itself ships:
//   1. player.glb ships a clip matching GAIT.runClip -> drive it with an
//      AnimationMixer, cross-faded under an idle clip when present. This
//      rigs to the skeleton exactly because it was authored for it.
//   2. no such clip -> a generated four-bone swing on ArmL1/ArmR1/LegL1/
//      LegR1 plus a Spine1 lean and a body bob. Rotation-only, so it never
//      fights avatarLoader.js's applyProportions(), which owns those nodes'
//      position and scale.
//
// Everything here is null-safe: a missing bone or a total failure just
// leaves the avatar static, the same way a failed load leaves Player on the
// capsule. Ported verbatim from Age-every-click's systems/avatarAnim.js,
// which targets this same shared Bloxity base rig and already tuned GAIT
// against it.
import * as THREE from 'three'
import { GAIT } from '../data/bloxity.js'

// phase offset per limb: legs are half a cycle apart; each arm is
// anti-phase to the leg on its own side (contralateral swing).
const LIMBS = [
  { name: 'LegL1', kind: 'leg', offset: 0 },
  { name: 'LegR1', kind: 'leg', offset: Math.PI },
  { name: 'ArmL1', kind: 'arm', offset: Math.PI },
  { name: 'ArmR1', kind: 'arm', offset: 0 },
]

const AXES = {
  x: new THREE.Vector3(1, 0, 0),
  y: new THREE.Vector3(0, 1, 0),
  z: new THREE.Vector3(0, 0, 1),
}

// Build the gait driver for one freshly loaded avatar. `built` is
// `{ root, nodes, clips }` — see components/Player.jsx. Returns null when
// there is nothing to animate.
export function makeGait(built) {
  if (!built || !built.root) return null

  const gait = {
    built,
    axis: AXES[GAIT.swingAxis] || AXES.x,
    swayAxis: AXES[GAIT.swayAxis] || AXES.z,
    amp: 0, // eased 0..1 locomotion weight
    phase: 0, // radians along the stride
    idleTime: 0, // seconds, only advances while idle (drives the breathing sway)
    q: new THREE.Quaternion(), // scratch
    mixer: null,
    run: null,
    idle: null,
    limbs: [],
    spine: null,
    spineBind: null,
  }

  // --- Path 1: an embedded clip ------------------------------------------
  const run = (built.clips || []).find((c) => GAIT.runClip.test(c.name))
  if (run) {
    gait.mixer = new THREE.AnimationMixer(built.root)
    gait.run = gait.mixer.clipAction(run)
    gait.run.play()
    gait.run.setEffectiveWeight(0)

    const idle = built.clips.find((c) => GAIT.idleClip.test(c.name))
    if (idle) {
      gait.idle = gait.mixer.clipAction(idle)
      gait.idle.play()
    }
    return gait
  }

  // --- Path 2: the generated fallback ------------------------------------
  const nodes = built.nodes || {}
  for (const limb of LIMBS) {
    const bone = nodes[limb.name]
    if (bone) gait.limbs.push({ ...limb, bone, bind: bone.quaternion.clone() })
  }
  const spine = nodes.Spine1
  if (spine) {
    gait.spine = spine
    gait.spineBind = spine.quaternion.clone()
  }
  return gait
}

// speed01: horizontal speed / max move speed. Values outside 0..1 are
// clamped. grounded (default true) gates the airborne pose below.
export function updateGait(gait, dt, speed01, grounded = true) {
  if (!gait || dt <= 0) return

  const target = speed01 < 0 ? 0 : speed01 > 1 ? 1 : speed01
  // Exponential ease so a start or stop does not snap mid-stride.
  gait.amp += (target - gait.amp) * (1 - Math.exp(-GAIT.blendHz * dt))
  // Advance the cycle; keep a little residual cadence so the legs finish the
  // step they are on rather than freezing.
  gait.phase += GAIT.strideHz * 2 * Math.PI * dt * (0.35 + 0.65 * gait.amp)
  if (gait.phase > Math.PI * 2) gait.phase -= Math.PI * 2

  if (gait.mixer) {
    if (gait.run) {
      gait.run.setEffectiveWeight(gait.amp)
      gait.run.timeScale = 0.4 + 0.9 * gait.amp
    }
    if (gait.idle) gait.idle.setEffectiveWeight(1 - gait.amp)
    gait.mixer.update(dt)
    return
  }

  // Airborne (jumping or falling): tuck the legs, throw the arms up. Takes
  // priority over the walk cycle and the idle sway below.
  if (!grounded) {
    for (const limb of gait.limbs) {
      let angle = 0
      if (limb.name === 'LegL1') angle = GAIT.airborneLegL
      else if (limb.name === 'LegR1') angle = GAIT.airborneLegR
      else if (limb.kind === 'arm') angle = GAIT.airborneArm
      gait.q.setFromAxisAngle(gait.axis, angle)
      limb.bone.quaternion.copy(limb.bind).premultiply(gait.q)
    }
    if (gait.spine) {
      gait.q.setFromAxisAngle(AXES.x, GAIT.airborneLean)
      gait.spine.quaternion.copy(gait.spineBind).premultiply(gait.q)
    }
    gait.built.root.position.y = 0
    return
  }

  // Below the ease-out floor: a slow breathing sway instead of a rigid hold.
  if (gait.amp < 0.01) {
    gait.idleTime += dt
    const idle = Math.sin(gait.idleTime * GAIT.idleSwayHz)
    for (const limb of gait.limbs) {
      if (limb.kind !== 'arm') {
        limb.bone.quaternion.copy(limb.bind)
        continue
      }
      const sign = limb.name === 'ArmL1' ? -1 : 1
      gait.q.setFromAxisAngle(gait.swayAxis, sign * (GAIT.idleArmSway + idle * GAIT.idleArmSwayAmp))
      limb.bone.quaternion.copy(limb.bind).premultiply(gait.q)
    }
    if (gait.spine) {
      gait.q.setFromAxisAngle(AXES.x, idle * GAIT.idleSpineSway)
      gait.spine.quaternion.copy(gait.spineBind).premultiply(gait.q)
    }
    gait.built.root.position.y = idle * GAIT.idleBob
    return
  }

  for (const limb of gait.limbs) {
    const swing = (limb.kind === 'arm' ? GAIT.armSwing : GAIT.legSwing) * gait.amp
    gait.q.setFromAxisAngle(gait.axis, Math.sin(gait.phase + limb.offset) * swing)
    // Parent-space swing (premultiply): the *_Offset parents carry position
    // only (identity rotation), so parent space is the character's own
    // frame and X is the forward/back flexion axis regardless of how each
    // mirrored limb bone's local frame is twisted.
    limb.bone.quaternion.copy(limb.bind).premultiply(gait.q)
  }
  if (gait.spine) {
    gait.q.setFromAxisAngle(AXES.x, GAIT.lean * gait.amp)
    gait.spine.quaternion.copy(gait.spineBind).premultiply(gait.q)
  }
  // Body bob: two beats per stride. Only local Y is ours to touch — X/Z/Y
  // world placement belongs to Player's group.
  gait.built.root.position.y = Math.abs(Math.sin(gait.phase)) * GAIT.bob * gait.amp
}

// --- Stone-skip throw loop ------------------------------------------------
// Played while the player is parked on a pool's throwing pad: a sidearm
// skim with the right arm — hold the stone out front-right, wind back with a
// torso twist, whip it flat across the body, follow through, reset. Poses
// are parent-space rotations layered over the bind pose (same frame as the
// walk cycle: X flexes, Y twists/swings horizontally, Z raises sideways).
//   ArmR: `raise` lifts the arm out to the side (character's right is -X),
//         `swing` then sweeps it horizontally (+ forward, - behind).
//   ArmL: same fields, mirrored (swing - is forward for the left arm).
//   spine: `twist` (+ turns the chest left/toward the throw), `lean` (+ fwd).
// `stone` says whether the stone is still in hand at that key.
const THROW_PERIOD = 1.6 // s per full throw
const THROW_KEYS = [
  { t: 0.0, armR: { raise: 0.9, swing: 0.5 }, armL: { raise: 0.35, swing: 0 }, twist: 0, lean: 0.05, stone: true },
  { t: 0.22, armR: { raise: 0.9, swing: 0.5 }, armL: { raise: 0.35, swing: 0 }, twist: 0, lean: 0.05, stone: true },
  { t: 0.5, armR: { raise: 1.0, swing: -1.0 }, armL: { raise: 0.5, swing: -0.6 }, twist: -0.5, lean: 0.12, stone: true },
  { t: 0.62, armR: { raise: 1.25, swing: 0.9 }, armL: { raise: 0.45, swing: 0.35 }, twist: 0.3, lean: 0.25, stone: false },
  { t: 0.8, armR: { raise: 0.8, swing: 1.8 }, armL: { raise: 0.35, swing: 0.5 }, twist: 0.55, lean: 0.2, stone: false },
  { t: 1.0, armR: { raise: 0.9, swing: 0.5 }, armL: { raise: 0.35, swing: 0 }, twist: 0, lean: 0.05, stone: true },
]
const THROW_STANCE = { legL: -0.25, legR: 0.2 } // left foot forward, right back
const THROW_BLEND_HZ = 10
const THROW_BONES = ['ArmR1', 'ArmL1', 'Spine1', 'LegL1', 'LegR1']

const _qa = new THREE.Quaternion()
const _qb = new THREE.Quaternion()
const _target = new THREE.Quaternion()

function lerp(a, b, k) {
  return a + (b - a) * k
}

// Pose at cycle fraction u (0..1), eased between keys.
function samplePose(u) {
  let i = 0
  while (i < THROW_KEYS.length - 2 && u > THROW_KEYS[i + 1].t) i++
  const a = THROW_KEYS[i]
  const b = THROW_KEYS[i + 1]
  const raw = (u - a.t) / (b.t - a.t)
  const k = raw * raw * (3 - 2 * raw) // smoothstep
  return {
    armR: { raise: lerp(a.armR.raise, b.armR.raise, k), swing: lerp(a.armR.swing, b.armR.swing, k) },
    armL: { raise: lerp(a.armL.raise, b.armL.raise, k), swing: lerp(a.armL.swing, b.armL.swing, k) },
    twist: lerp(a.twist, b.twist, k),
    lean: lerp(a.lean, b.lean, k),
    stone: k < 0.5 ? a.stone : b.stone,
  }
}

function ensureThrowRig(gait) {
  if (gait.throwRig) return gait.throwRig
  const nodes = gait.built.nodes || {}
  const rig = { w: 0, t: 0, stone: true, bones: {} }
  for (const name of THROW_BONES) {
    const bone = nodes[name]
    if (bone) rig.bones[name] = { bone, bind: bone.quaternion.clone() }
  }
  gait.throwRig = rig
  return rig
}

// Blend `bone` toward bind * rotation(q) by weight w. Slerping toward an
// absolute target (rather than premultiplying the current value) can't drift
// if nothing else rewrites the bone this frame.
function applyLayer(entry, q, w) {
  if (!entry) return
  _target.copy(entry.bind).premultiply(q)
  entry.bone.quaternion.slerp(_target, w)
}

// Call after updateGait each frame. `active` is true while the player is
// locked on a throwing pad; the loop eases in and out around it.
export function updateThrow(gait, dt, active) {
  if (!gait || dt <= 0) return
  const rig = ensureThrowRig(gait)
  const wasOn = rig.w > 0
  rig.w += ((active ? 1 : 0) - rig.w) * (1 - Math.exp(-THROW_BLEND_HZ * dt))
  if (!active && rig.w < 0.01) {
    rig.w = 0
    rig.t = 0
    rig.stone = true
    // The mixer path may not rewrite these bones, so hand them back to bind.
    if (wasOn && gait.mixer) for (const e of Object.values(rig.bones)) e.bone.quaternion.copy(e.bind)
    return
  }

  rig.t = (rig.t + dt / THROW_PERIOD) % 1
  const p = samplePose(rig.t)
  rig.stone = p.stone
  const w = rig.w
  const b = rig.bones

  // Right arm: raise out to the side (-Z angle moves it toward -X), then
  // swing it horizontally about the vertical.
  _qa.setFromAxisAngle(AXES.z, -p.armR.raise)
  _qb.setFromAxisAngle(AXES.y, p.armR.swing)
  applyLayer(b.ArmR1, _qb.multiply(_qa), w)

  _qa.setFromAxisAngle(AXES.z, p.armL.raise)
  _qb.setFromAxisAngle(AXES.y, p.armL.swing)
  applyLayer(b.ArmL1, _qb.multiply(_qa), w)

  _qa.setFromAxisAngle(AXES.x, p.lean)
  _qb.setFromAxisAngle(AXES.y, p.twist)
  applyLayer(b.Spine1, _qb.multiply(_qa), w)

  _qa.setFromAxisAngle(AXES.x, THROW_STANCE.legL)
  applyLayer(b.LegL1, _qa, w)
  _qa.setFromAxisAngle(AXES.x, THROW_STANCE.legR)
  applyLayer(b.LegR1, _qa, w)
}

// Whether the throw loop currently has the stone in hand (true when idle).
export function throwHoldsStone(gait) {
  return !gait || !gait.throwRig || gait.throwRig.w === 0 || gait.throwRig.stone
}

// Return the rig to its bind pose. Call before the avatar itself is torn
// down, while the nodes are still live.
export function disposeGait(gait) {
  if (!gait) return
  if (gait.mixer) {
    gait.mixer.stopAllAction()
    gait.mixer.uncacheRoot(gait.built.root)
  }
  for (const limb of gait.limbs) limb.bone.quaternion.copy(limb.bind)
  if (gait.spine) gait.spine.quaternion.copy(gait.spineBind)
  if (gait.throwRig) for (const e of Object.values(gait.throwRig.bones)) e.bone.quaternion.copy(e.bind)
  if (gait.built && gait.built.root) gait.built.root.position.y = 0
}
