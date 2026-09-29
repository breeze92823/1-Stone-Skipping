import { PLAYER_MOVE_SPEED } from '../data/world.js'

// The player singleton. Mutated in place, never reallocated, so the frame
// loop can read it without a React subscription.
export const player = {
  // Capsule base (feet) in world space, +Y up.
  position: { x: 0, y: 0, z: 0 },
  velocity: { x: 0, y: 0, z: 0 },
  grounded: true,
  facing: Math.PI, // yaw the character model faces, radians
  padTarget: null, // { x, z } centre of the throwing pad being walked to while locked
  atPad: false, // reached padTarget; the throw animation plays
  padUnlocked: false, // the pad underfoot belongs to an unlocked pool (locked pads never animate)
  throwCount: 0, // bumped per THROW press; Player.jsx plays the throw once per bump
  throwing: false, // mid-throw: movement input is ignored until the follow-through ends
  handPos: null, // world position of the stone in hand (Player.jsx), or null if no hand
  moveSpeed: PLAYER_MOVE_SPEED,
  dims: { radius: 0.4, height: 1.8 },
}

export function resetPlayer(spawn = { x: 0, y: 0, z: 0 }, facing = Math.PI) {
  player.position.x = spawn.x
  player.position.y = spawn.y
  player.position.z = spawn.z
  player.velocity.x = 0
  player.velocity.y = 0
  player.velocity.z = 0
  player.grounded = true
  player.facing = facing
}
