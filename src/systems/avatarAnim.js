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

// --- Stone-skip throw -----------------------------------------------------
// A real skim, right-handed: stand side-on to the water with knees soft,
// point the lead (left) arm at the target, draw the stone back low behind
// the hip while the chest coils away, step into it with the lead foot, then
// whip the arm through flat at hip height with the throwing shoulder dipped
// (keeps the stone parallel to the water), release just in front of the
// hip, and let the arm carry across the body while the back foot drags
// forward. The head counter-rotates so the eyes stay on the water.
//
// Loops on a pool's throwing pad; plays once per THROW press (see
// triggerThrow). Poses are parent-space rotations layered over the bind pose
// (same frame as the walk cycle: X flexes, Y twists/swings, Z raises/rolls).
//   armR: `raise` lifts the arm out to the side (character's right is -X),
//         `swing` then sweeps it horizontally (+ forward, - behind).
//   armL: same fields, mirrored (swing - is forward for the left arm).
//   Spine1 (hips->torso): `twist` (+ turns left/toward the throw), `lean`
//         (+ forward), `roll` (+ dips the right, throwing shoulder).
//   Spine2 (chest): `chest` extra twist — lags the hips on the way in and
//         snaps past them at release, the whip.
//   legs: `legL`/`legR` flex (- forward), `spread` splays both outward.
// The spine roll carries the arms with it, so armR.raise is set that much
// higher (and armL.raise lower) to keep the hands where they read right.
// `stone` is whether the stone is in hand from that key until the next.
const THROW_PERIOD = 1.6 // s per full throw
const THROW_KEYS = [
  // set: side-on, stone cupped low by the right hip
  { t: 0.0, armR: { raise: 0.4, swing: 0.3 }, armL: { raise: 0.25, swing: -0.3 }, twist: -0.45, chest: 0, lean: 0.15, roll: 0.05, legL: -0.15, legR: 0.2, spread: 0.12, stone: true },
  // aim: lead arm points out at the water
  { t: 0.2, armR: { raise: 0.45, swing: 0.1 }, armL: { raise: 0.75, swing: -1.0 }, twist: -0.5, chest: -0.05, lean: 0.2, roll: 0.1, legL: -0.15, legR: 0.22, spread: 0.13, stone: true },
  // wind-up: stone drawn back low behind the hip, chest coiled, weight back
  { t: 0.45, armR: { raise: 0.85, swing: -1.35 }, armL: { raise: 0.7, swing: -1.1 }, twist: -0.75, chest: -0.3, lean: 0.3, roll: 0.25, legL: -0.1, legR: 0.3, spread: 0.15, stone: true },
  // stride: lead foot plants, hips open first while the chest lags
  { t: 0.56, armR: { raise: 0.9, swing: -0.7 }, armL: { raise: 0.3, swing: -0.3 }, twist: -0.3, chest: -0.35, lean: 0.38, roll: 0.35, legL: -0.5, legR: 0.35, spread: 0.18, stone: true },
  // release: arm flat at hip height just in front, shoulder dipped, lowest point
  { t: 0.63, armR: { raise: 1.0, swing: 0.35 }, armL: { raise: 0.1, swing: 0.45 }, twist: 0.2, chest: 0.15, lean: 0.42, roll: 0.4, legL: -0.5, legR: 0.35, spread: 0.18, stone: false },
  // follow-through: arm carries across the body, back foot drags forward
  { t: 0.78, armR: { raise: 0.9, swing: 1.7 }, armL: { raise: 0.25, swing: 0.6 }, twist: 0.6, chest: 0.2, lean: 0.35, roll: 0.15, legL: -0.45, legR: 0.1, spread: 0.15, stone: false },
  // recover to set
  { t: 1.0, armR: { raise: 0.4, swing: 0.3 }, armL: { raise: 0.25, swing: -0.3 }, twist: -0.45, chest: 0, lean: 0.15, roll: 0.05, legL: -0.15, legR: 0.2, spread: 0.12, stone: true },
]
const THROW_FIELDS = ['twist', 'chest', 'lean', 'roll', 'legL', 'legR', 'spread']
const RELEASE_U = THROW_KEYS.find((k) => !k.stone).t
// A THROW press skips the set/aim hold and starts heading into the wind-up,
// so the stone leaves the hand promptly.
const ONESHOT_START_U = 0.25
export const THROW_RELEASE_DELAY = (RELEASE_U - ONESHOT_START_U) * THROW_PERIOD // s from press to release
// A one-shot stops partway through the recovery (arm already coming back
// down) and eases to the bind pose from there, rather than settling into the
// crouched "set" stance the pad loop restarts from.
const ONESHOT_END_U = 0.9
export const THROW_ONESHOT_TIME = (ONESHOT_END_U - ONESHOT_START_U) * THROW_PERIOD // s until control returns
const NECK_COUNTER = 0.85 // share of the torso's yaw the head undoes to keep eyes on the water
const LEG_RIG_LEN = 2.4 // hip pivot to sole, rig units (see defaultCharacter.js)
const THROW_BLEND_HZ = 10
const THROW_BONES = ['ArmR1', 'ArmL1', 'Spine1', 'Spine2', 'Neck1', 'LegL1', 'LegR1']

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
  const raw = Math.min(Math.max((u - a.t) / (b.t - a.t), 0), 1)
  const k = raw * raw * (3 - 2 * raw) // smoothstep
  const pose = {
    armR: { raise: lerp(a.armR.raise, b.armR.raise, k), swing: lerp(a.armR.swing, b.armR.swing, k) },
    armL: { raise: lerp(a.armL.raise, b.armL.raise, k), swing: lerp(a.armL.swing, b.armL.swing, k) },
    stone: u >= b.t ? b.stone : a.stone,
  }
  for (const f of THROW_FIELDS) pose[f] = lerp(a[f], b[f], k)
  return pose
}

function ensureThrowRig(gait) {
  if (gait.throwRig) return gait.throwRig
  const nodes = gait.built.nodes || {}
  const rig = { w: 0, t: 0, stone: true, shot: false, bones: {} }
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

// Play one throw from the wind-up. The caller releases the real stone
// THROW_RELEASE_DELAY seconds later, in sync with the hand opening.
export function triggerThrow(gait) {
  if (!gait) return
  const rig = ensureThrowRig(gait)
  rig.t = ONESHOT_START_U
  rig.shot = true
}

// Call after updateGait each frame. `active` is true while the player is
// locked on a throwing pad (loops); a triggerThrow one-shot also drives it.
// The pose eases in and out around both.
export function updateThrow(gait, dt, active) {
  if (!gait || dt <= 0) return
  const rig = ensureThrowRig(gait)
  const root = gait.built.root
  const on = active || rig.shot
  const wasOn = rig.w > 0
  rig.w += ((on ? 1 : 0) - rig.w) * (1 - Math.exp(-THROW_BLEND_HZ * dt))
  if (!on && rig.w < 0.01) {
    rig.w = 0
    rig.t = 0
    rig.stone = true
    // Fully done: put every throw bone back at bind (the walk cycle doesn't
    // touch Spine2/Neck1, and the mixer path may not rewrite any of them).
    if (wasOn) {
      for (const e of Object.values(rig.bones)) e.bone.quaternion.copy(e.bind)
      if (gait.mixer) root.position.y = 0
    }
    return
  }

  if (on) {
    rig.t += dt / THROW_PERIOD
    if (rig.shot && !active && rig.t >= ONESHOT_END_U) {
      rig.t = ONESHOT_END_U // hold this pose while the weight fades to bind
      rig.shot = false
    } else if (rig.t >= 1) {
      rig.t %= 1
      rig.shot = false
    }
  }
  const p = samplePose(rig.t)
  // Once a one-shot ends the next stone is back in hand while it eases out.
  rig.stone = on ? p.stone : true
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

  // Hips -> torso: twist, then lean forward and dip the throwing shoulder.
  _qa.setFromAxisAngle(AXES.x, p.lean)
  _qb.setFromAxisAngle(AXES.z, p.roll)
  _qa.premultiply(_qb)
  _qb.setFromAxisAngle(AXES.y, p.twist)
  applyLayer(b.Spine1, _qb.multiply(_qa), w)

  _qa.setFromAxisAngle(AXES.y, p.chest)
  applyLayer(b.Spine2, _qa, w)

  // Head undoes most of the torso's yaw and some of its roll and pitch.
  _qa.setFromAxisAngle(AXES.x, -p.lean * 0.5)
  _qb.setFromAxisAngle(AXES.z, -p.roll * 0.7)
  _qa.premultiply(_qb)
  _qb.setFromAxisAngle(AXES.y, -(p.twist + p.chest) * NECK_COUNTER)
  applyLayer(b.Neck1, _qb.multiply(_qa), w)

  // Legs: stride (flex) inside a slight outward splay (+Z moves the left
  // foot out toward +X, -Z the right foot toward -X).
  _qa.setFromAxisAngle(AXES.x, p.legL)
  _qb.setFromAxisAngle(AXES.z, p.spread)
  applyLayer(b.LegL1, _qb.multiply(_qa), w)
  _qa.setFromAxisAngle(AXES.x, p.legR)
  _qb.setFromAxisAngle(AXES.z, -p.spread)
  applyLayer(b.LegR1, _qb.multiply(_qa), w)

  // Straight legs can't bend at the knee, so lower the hips by exactly what
  // the stance costs — the less-angled leg keeps its sole on the ground.
  // The fallback walk sets root Y each frame; the mixer path doesn't.
  const legLen = LEG_RIG_LEN * root.scale.y
  const drop = legLen * (1 - Math.cos(p.spread) * Math.cos(Math.min(Math.abs(p.legL), Math.abs(p.legR))))
  root.position.y = (gait.mixer ? 0 : root.position.y) - drop * w
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
