// Skill-gain popups: framework-free, mutable singleton pool, stepped once per
// frame from GameLoop. stoneActions.js calls spawnActionPopup(amount) with each
// throw's applied skill gain; step() projects the player's anchor point to the
// screen and ages the live popups. components/ActionPopups.jsx draws the pool.
import * as THREE from 'three'
import { player } from './playerState.js'
import { playSkillGainPop } from './sfx.js'
import {
  ACTION_POPUP_POOL_SIZE,
  ACTION_POPUP_LIFETIME,
  ACTION_POPUP_ANCHOR_HEIGHT,
  ACTION_POPUP_SPREAD_X,
  ACTION_POPUP_SPREAD_Y,
} from '../data/actionPopups.js'

function makeSlot() {
  return { alive: false, age: 0, amount: 0, ndcX: 0, ndcY: 0, seq: 0 }
}

export const actionPopupPool = []
for (let i = 0; i < ACTION_POPUP_POOL_SIZE; i++) actionPopupPool.push(makeSlot())

let nextSlot = 0
let spawnSeq = 0

// Last projection of the player anchor into NDC, refreshed by step().
const playerNdc = { x: 0, y: 0 }
const anchor = new THREE.Vector3()

// A non-positive amount (skill already clamped at max) shows nothing.
export function spawnActionPopup(amount) {
  if (!(amount > 0)) return
  playSkillGainPop()
  const slot = actionPopupPool[nextSlot]
  nextSlot = (nextSlot + 1) % ACTION_POPUP_POOL_SIZE
  spawnSeq += 1

  slot.alive = true
  slot.age = 0
  slot.amount = amount
  slot.ndcX = playerNdc.x + (Math.random() * 2 - 1) * ACTION_POPUP_SPREAD_X
  slot.ndcY = playerNdc.y + (Math.random() * 2 - 1) * ACTION_POPUP_SPREAD_Y
  slot.seq = spawnSeq
}

export function step(dt, camera) {
  if (camera) {
    anchor.set(player.position.x, player.position.y + ACTION_POPUP_ANCHOR_HEIGHT, player.position.z)
    anchor.project(camera)
    // anchor.z > 1 = behind the camera; fall back to screen centre.
    if (anchor.z <= 1) {
      playerNdc.x = anchor.x
      playerNdc.y = anchor.y
    } else {
      playerNdc.x = 0
      playerNdc.y = 0
    }
  }

  for (let i = 0; i < ACTION_POPUP_POOL_SIZE; i++) {
    const slot = actionPopupPool[i]
    if (!slot.alive) continue
    slot.age += dt
    if (slot.age >= ACTION_POPUP_LIFETIME) slot.alive = false
  }
}
