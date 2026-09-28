import { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Mesh, MeshStandardMaterial, Quaternion, SphereGeometry, Vector3 } from 'three'
import { player } from '../systems/playerState.js'
import { authState, getEquippedAvatar, getProportions, onAvatarChanged, onProportionsChanged } from '../systems/bloxity.js'
import { DEV_MODE } from '../data/bloxity.js'
import { applyProportions, attachEquippedAccessories } from '../systems/avatarLoader.js'
import { buildDefaultCharacter, loadBaseCharacter, HELD_ITEM_OFFSET } from '../systems/defaultCharacter.js'
import { useGameStore } from '../store/useGameStore.js'
import { makeGait, updateGait, disposeGait, updateThrow, throwHoldsStone } from '../systems/avatarAnim.js'
import { inputState } from '../systems/input.js'

const _up = new Vector3(0, 1, 0)
const _targetQuat = new Quaternion()
const TURN_RATE = 0.001 // base of 1 - TURN_RATE^delta; smaller = snappier turn

function makeHeldStoneMesh() {
  const mesh = new Mesh(
    new SphereGeometry(0.13, 12, 10),
    new MeshStandardMaterial({ color: '#8a8580', roughness: 0.85 }),
  )
  mesh.scale.set(1.2, 0.55, 1)
  mesh.castShadow = true
  mesh.visible = false
  return mesh
}

// The player is always the game's own character (systems/defaultCharacter.js)
// — never the raw Bloxity avatar. A signed-in player's equipped Bloxity hat
// and back item are attached to it as accessories. Rebuilds whenever the
// player edits their avatar in the customizer or signs in/out.
function useBloxityAvatar() {
  const [avatar, setAvatar] = useState(() => buildDefaultCharacter())
  const signedIn = !!authState.user
  const currentRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()

    async function load() {
      const group = await loadBaseCharacter()
      if (cancelled) return
      const equipped = signedIn && !DEV_MODE ? getEquippedAvatar() : null
      await attachEquippedAccessories(group, equipped, { signal: controller.signal })
      if (cancelled) return
      currentRef.current = group
      applyProportions(group, getProportions())
      setAvatar(group)
    }
    load()

    const offAvatar = onAvatarChanged(() => load())
    const offProportions = onProportionsChanged(() => {
      if (currentRef.current) applyProportions(currentRef.current, getProportions())
    })

    return () => {
      cancelled = true
      controller.abort()
      offAvatar()
      offProportions()
    }
  }, [signedIn])

  return avatar
}

// Presentation only: read the player singleton, draw the character. The
// group origin sits at the capsule base (feet), matching playerState's
// convention. No physics engine here — systems/playerMovement.js is what
// actually moves the player each frame; this component just turns toward
// player.facing rather than snapping to it.
export default function Player() {
  const ref = useRef()
  const avatar = useBloxityAvatar()
  const gaitRef = useRef(null)
  const heldStoneRef = useRef(null)
  const stoneReady = useGameStore((s) => s.stoneReady)

  // Rebuilt per loaded avatar — the gait's cached bind-pose quaternions
  // (see avatarAnim.js) belong to one specific rig instance.
  useEffect(() => {
    gaitRef.current = null
    heldStoneRef.current = null
    if (!avatar) return
    gaitRef.current = makeGait({ root: avatar, nodes: avatar.nodes || {}, clips: avatar.animations || [] })
    if (import.meta.env.DEV) window.__avatar = avatar // temporary debug hook

    const stoneMesh = makeHeldStoneMesh()
    const hand = avatar.nodes?.ArmR1
    if (hand) {
      stoneMesh.position.set(...HELD_ITEM_OFFSET)
      hand.add(stoneMesh)
      heldStoneRef.current = stoneMesh
    }

    return () => {
      disposeGait(gaitRef.current)
      gaitRef.current = null
    }
  }, [avatar])

  useFrame((_state, delta) => {
    const g = ref.current
    if (!g) return
    g.position.set(player.position.x, player.position.y, player.position.z)
    _targetQuat.setFromAxisAngle(_up, player.facing)
    g.quaternion.slerp(_targetQuat, 1 - Math.pow(TURN_RATE, delta))

    const gait = gaitRef.current
    if (gait) {
      const speed01 = Math.hypot(player.velocity.x, player.velocity.z) / player.moveSpeed
      updateGait(gait, Math.min(delta, 0.1), speed01, player.grounded)
      updateThrow(gait, Math.min(delta, 0.1), inputState.moveLocked && player.atPad)
    }
    if (heldStoneRef.current) heldStoneRef.current.visible = stoneReady && throwHoldsStone(gait)
  })

  return (
    <group ref={ref}>
      <primitive object={avatar} />
    </group>
  )
}
