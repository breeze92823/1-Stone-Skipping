import { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Quaternion, Vector3 } from 'three'
import { subscribeRoster } from '../systems/net.js'
import { applyProportions, attachEquippedAccessories } from '../systems/avatarLoader.js'
import { loadBaseCharacter } from '../systems/defaultCharacter.js'
import { makeGait, updateGait, disposeGait } from '../systems/avatarAnim.js'
import Nametag from './Nametag.jsx'

const _up = new Vector3(0, 1, 0)
const _targetQuat = new Quaternion()
const _targetPos = new Vector3()
// Same easing shape as components/Player.jsx's TURN_RATE, applied to position
// too: systems/net.js only relays a sample every MOVE_SEND_INTERVAL_MS, so this
// smooths the gap instead of a remote character snapping on every packet.
const LERP_RATE = 0.0008

function parseAvatar(raw) {
  if (typeof raw !== 'string' || !raw) return null
  try {
    const v = JSON.parse(raw)
    return v && typeof v === 'object' ? v : null
  } catch {
    return null
  }
}

// One other connected session: rebuilds the same kind of character
// components/Player.jsx builds for the local player (the game's base character
// dressed with the sender's equipped Bloxity hat / back accessory and
// proportions) whenever their `avatar` payload changes. Position/yaw/gait are
// read straight off `p` each frame — the synced schema instance is patched in
// place as `move` packets arrive.
function RemotePlayer({ p }) {
  const ref = useRef()
  const gaitRef = useRef(null)
  const posRef = useRef(null)
  const [avatar, setAvatar] = useState(null)
  const [avatarRaw, setAvatarRaw] = useState(p.avatar)

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()

    async function build() {
      const parsed = parseAvatar(avatarRaw) || {}
      const group = await loadBaseCharacter()
      await attachEquippedAccessories(group, parsed.equipped || null, { signal: controller.signal })
      if (cancelled) return
      applyProportions(group, parsed.proportions || null)
      setAvatar(group)
    }
    build()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [avatarRaw])

  // Rebuilt per loaded avatar — the gait's cached bind-pose quaternions belong
  // to one specific rig instance.
  useEffect(() => {
    gaitRef.current = null
    if (!avatar) return
    gaitRef.current = makeGait({ root: avatar, nodes: avatar.nodes || {}, clips: avatar.animations || [] })
    return () => {
      disposeGait(gaitRef.current)
      gaitRef.current = null
    }
  }, [avatar])

  useFrame((_state, delta) => {
    // A human-speed change (new equip) only needs a per-frame compare.
    if (p.avatar !== avatarRaw) setAvatarRaw(p.avatar)

    const g = ref.current
    if (!g) return
    if (!posRef.current) posRef.current = new Vector3(p.x, p.y, p.z)
    const k = 1 - Math.pow(LERP_RATE, delta)
    posRef.current.lerp(_targetPos.set(p.x, p.y, p.z), k)
    g.position.copy(posRef.current)
    _targetQuat.setFromAxisAngle(_up, p.yaw)
    g.quaternion.slerp(_targetQuat, k)

    const gait = gaitRef.current
    if (gait) updateGait(gait, Math.min(delta, 0.1), p.moveBlend, true)
  })

  return (
    <group ref={ref}>
      {avatar && <primitive object={avatar} />}
      <Nametag getName={() => p.username} getLevel={() => p.level} />
    </group>
  )
}

// Mounts one RemotePlayer per other connected session (systems/net.js's
// subscribeRoster()) — everyone in the shared room except ourselves.
export default function RemotePlayers() {
  const [ids, setIds] = useState(() => [])
  const playersRef = useRef(new Map())

  useEffect(() => {
    return subscribeRoster(
      (sessionId, p) => {
        playersRef.current.set(sessionId, p)
        setIds(Array.from(playersRef.current.keys()))
      },
      (sessionId) => {
        playersRef.current.delete(sessionId)
        setIds(Array.from(playersRef.current.keys()))
      },
    )
  }, [])

  return (
    <>
      {ids.map((id) => {
        const p = playersRef.current.get(id)
        return p ? <RemotePlayer key={id} p={p} /> : null
      })}
    </>
  )
}
