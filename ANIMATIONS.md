# Animations

Character animation and the throwing-pad lock. Read this before changing how
the player rig moves or how the pool pads behave.

## Rig basics

- The character rig is built in `src/systems/defaultCharacter.js`. Bones are looked up by name via `avatar.nodes`.
- Animated bones: `ArmR1`, `ArmL1`, `LegL1`, `LegR1`, `Spine1`. The held stone mesh hangs off `ArmR1` (`HELD_ITEM_OFFSET`).
- All animation is **rotation-only**, layered on each bone's bind-pose quaternion in parent space. Position and scale belong to `avatarLoader.js` (`applyProportions`), so don't touch them.
- The model faces local +Z. The character's right side is -X.
- Parent-space rotation axes:
  - **X** is forward/back flexion. Negative swings an arm or leg forward/up; positive leans the spine forward.
  - **Y** is twist or a horizontal swing.
  - **Z** is a sideways raise. Negative raises the right arm outward; positive raises the left.

## Animations (`src/systems/avatarAnim.js`)

| Animation | Function | When it plays |
|---|---|---|
| Walk/run cycle | `updateGait` | Moving. Uses an embedded clip if `player.glb` has one (`GAIT.runClip`), otherwise a generated limb swing. |
| Idle sway | `updateGait` | Standing still |
| Airborne pose | `updateGait` | Jumping or falling |
| Stone-skip throw loop | `updateThrow` | Locked on a pool pad **and** arrived at its centre |

Tuning for walk, idle and airborne lives in `GAIT` in `src/data/bloxity.js`.

`src/components/Player.jsx` ticks both each frame. It calls `updateGait` first, then
`updateThrow(gait, dt, inputState.moveLocked && player.atPad)`. The throw
blends over the gait, so it must run after it.

## Stone-skip throw loop

A sidearm skim with the right arm, looping every `THROW_PERIOD` seconds:

| Key `t` | Phase | Pose |
|---|---|---|
| 0.00 to 0.22 | Hold | Right arm out front-right, stone flat, torso square |
| 0.50 | Wind-up | Arm swung behind, torso twisted right, left arm reaching forward |
| 0.62 | Release | Arm whips forward near shoulder height, torso turns into the throw; stone leaves the hand |
| 0.80 | Follow-through | Arm across the front, chest turned left |
| 1.00 | Back to hold | Stone reappears |

Constants at the top of the throw section in `avatarAnim.js`:

| Constant | Meaning |
|---|---|
| `THROW_PERIOD` | Seconds per throw (1.6) |
| `THROW_KEYS` | Keyframes. `t` is the 0 to 1 cycle fraction. Values are in radians. |
| `THROW_STANCE` | Constant leg offsets (left foot forward, right foot back) |
| `THROW_BLEND_HZ` | How fast the loop eases in and out when the lock starts or ends |
| `THROW_BONES` | Bones the loop drives |

Fields in each `THROW_KEYS` entry:

| Field | Meaning |
|---|---|
| `armR.raise` | Lift the right arm out to the side (0 = hanging, about 1.57 = horizontal) |
| `armR.swing` | Horizontal sweep about the vertical. + is forward, - is behind. |
| `armL.raise`, `armL.swing` | Same, mirrored. For the left arm, - swing is forward. |
| `twist` | Spine yaw. + turns the chest left, toward the throw. |
| `lean` | Spine pitch. + leans forward. |
| `stone` | Whether the held stone is visible at this key |

Keys are smoothstep-interpolated. The first and last keys must match so the
loop is seamless. The rotation order for each arm is raise first, then swing.

Helpers:

- `throwHoldsStone(gait)` returns whether the stone is in hand. Player.jsx combines it with the store's `stoneReady` flag.
- `disposeGait` resets the throw bones to bind as well.

**Common tweaks:**

| To do this | Change this |
|---|---|
| Speed the throw up or down | `THROW_PERIOD` |
| Make the swing bigger or smaller | Scale `armR.swing` and `twist` in the wind-up and follow-through keys |
| Throw from a higher or lower arm | `armR.raise` |
| Fix an arm moving the wrong way | Flip the sign of that field in every key |
| Add a new phase | Insert a key with a `t` between its neighbours |
| Animate another bone | Add it to `THROW_BONES` and apply a rotation in `updateThrow` with `applyLayer` |

## Throwing-pad lock (what triggers the throw)

This is the flow when the player steps onto a pool's darker inset panel on its
throwing platform:

1. **Detect.** `stepPickupAndThrow` in `src/systems/stoneActions.js` tests the player against each pool's `poolInsetRect` (`src/data/world.js`) and stores the pool as `currentPoolId`.
2. **Lock.** On entering a panel it calls `setMoveLocked(true)` (`src/systems/input.js`), which zeroes WASD. It also sets `player.padTarget` to the panel centre and `player.atPad = false`.
3. **Walk to centre.** `step` in `src/systems/playerMovement.js` steers the player to `padTarget` at up to `PAD_WALK_SPEED`, slowing on approach. The walk animation plays during this.
4. **Arrive.** Within `PAD_ARRIVE` of the centre it snaps the player to the centre and zeroes their velocity. It sets `player.atPad = true` and turns the player to `PAD_FACING` (west, toward the water). The throw loop then starts.
5. **Unlock.** Space calls `setMoveLocked(false)`. That press does not also jump. `playerMovement` clears `padTarget` and `atPad`, and the throw eases out.
6. **Re-entry.** Leaving the panel and stepping back on repeats the whole flow.

If the inset panel in `src/components/Pools.jsx` changes size, update
`poolInsetRect` to match. `PAD_FACING` assumes every pool's water is west of its pad.

## Not implemented yet

- The throw loop is visual only. It does not spawn real thrown stones or award skill.
- The camera doesn't reposition when the lock starts.
