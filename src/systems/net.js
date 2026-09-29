// Multiplayer presence. Framework-free (no React import) — the ONLY module
// that talks to the Colyseus server (../Stone-Skipping-backend's LobbyRoom).
// Like systems/bloxity.js, every path through here is built so a slow, asleep
// or absent server leaves the game fully playable solo: nothing blocks
// gameplay and the scene never waits on a socket.
//
// Covers: position/avatar relay + remote-player roster (components/
// RemotePlayers.jsx), live stats, the durable save/load for a signed-in
// player, and the merged global leaderboard.
import {
  authState,
  subscribeAuth,
  getStableUserId,
  getDisplayName,
  getEquippedAvatar,
  getProportions,
  onAvatarChanged,
  onProportionsChanged,
} from './bloxity.js'
import { DEV_MODE } from '../data/bloxity.js'
import { useGameStore } from '../store/useGameStore.js'
import { player } from './playerState.js'
import {
  SERVER_URL,
  ROOM_NAME,
  JOIN_TIMEOUT_MS,
  RETRY_BACKOFF_MS,
  STATS_RESEND_DEBOUNCE_MS,
  PROGRESS_RESEND_DEBOUNCE_MS,
  MOVE_SEND_INTERVAL_MS,
  USERNAME_WAIT_MS,
} from '../data/net.js'

// --- Public state -----------------------------------------------------------
//   'idle'       — not started / torn down / no server configured
//   'connecting' — a join attempt is in flight
//   'solo'       — between retry attempts; playing single-player right now
//   'online'     — attached to a room
export const netState = { status: 'idle', playerCount: 0, error: null }

const listeners = new Set()

export function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function emit() {
  for (const fn of listeners) {
    try {
      fn(netState)
    } catch {
      // A broken subscriber must not wedge the netcode.
    }
  }
}

function setStatus(status) {
  netState.status = status
  emit()
}

// --- Remote players ---------------------------------------------------------
// sessionId -> the OTHER player's live PlayerState schema instance. Colyseus
// patches its fields in place, so a consumer reads e.g. `p.x` every frame with
// no callback; only add/remove needs one (a component must mount/unmount).
const remotePlayers = new Map()
const rosterListeners = new Set()

function notifyRoster(kind, sessionId, p) {
  for (const l of rosterListeners) {
    try {
      l[kind](sessionId, p)
    } catch {
      // A broken subscriber must not wedge the netcode.
    }
  }
}

// Replays the current roster immediately, so a component mounting after we're
// already online doesn't miss whoever is already here.
export function subscribeRoster(onAdd, onRemove) {
  const entry = { onAdd, onRemove }
  rosterListeners.add(entry)
  for (const [sessionId, p] of remotePlayers) onAdd(sessionId, p)
  return () => rosterListeners.delete(entry)
}

// --- Connection state -------------------------------------------------------
let sdkModule = null
let client = null
let room = null
let selfId = ''
let started = false
let stopped = true
let connecting = false
let attempt = 0
let retryTimer = 0

const EMPTY_BOARDS = { level: [], playTime: [], skill: [], wins: [] }
let globalLeaderboard = EMPTY_BOARDS

// The merged all-time + online rows for one board ('level' | 'playTime' |
// 'skill' | 'wins'), as `{ id, name, value }`. Empty until the server's first
// broadcast, or while offline.
export function getLeaderboard(stat) {
  return globalLeaderboard[stat] || []
}

async function loadSdk() {
  if (!sdkModule) sdkModule = await import('@colyseus/sdk')
  return sdkModule
}

function send(type, payload) {
  if (!room) return
  try {
    room.send(type, payload)
  } catch {
    // Socket mid-close — the next attach re-seeds everything anyway.
  }
}

// --- Stats + durable progress -------------------------------------------------
function statsPayload() {
  const s = useGameStore.getState()
  return { skill: s.skill, wins: s.wins, rebirths: s.rebirths, bestSkips: s.bestSkips, equippedStone: s.equippedStone }
}

function progressPayload() {
  return { ...statsPayload(), ownedStones: [...useGameStore.getState().ownedStones] }
}

// The ROOM decides whether this session may persist (its userIds map), so a
// save sent just after a logout lands as a harmless no-op there.
function sendStatsNow() {
  send('stats', statsPayload())
}

function sendProgressNow() {
  send('saveProgress', progressPayload())
}

let statsTimer = 0
let progressTimer = 0
let lastSnap = ''

// useGameStore.subscribe fires on ANY change, so filter to the fields we send.
function onStoreChange(s) {
  const snap = JSON.stringify([s.skill, s.wins, s.rebirths, s.bestSkips, s.equippedStone, s.ownedStones.length])
  if (snap === lastSnap) return
  lastSnap = snap
  if (!statsTimer) {
    statsTimer = setTimeout(() => {
      statsTimer = 0
      sendStatsNow()
    }, STATS_RESEND_DEBOUNCE_MS)
  }
  if (getStableUserId() && !progressTimer) {
    progressTimer = setTimeout(() => {
      progressTimer = 0
      sendProgressNow()
    }, PROGRESS_RESEND_DEBOUNCE_MS)
  }
}

// Applied at most once per IDENTITY: the first `progress` under the current
// sign-in is the real load. A later reattach under the SAME identity would
// otherwise clobber what the player did locally during a blip.
let hydratedFromServer = false

// --- Avatar + position relay ------------------------------------------------
// Same recipe components/Player.jsx renders the LOCAL player from: the game's
// own base character dressed with the signed-in player's equipped Bloxity hat/
// back accessory and SDK proportions. Sent as an opaque JSON string (the
// server never parses it), so components/RemotePlayers.jsx can rebuild an
// identical-looking character for every other session.
function avatarPayload() {
  return {
    // Same gate as Player.jsx: only a real signed-in player (never a dev-mode
    // stub) shows Bloxity accessories.
    equipped: authState.user && !DEV_MODE ? getEquippedAvatar() : null,
    proportions: getProportions(),
  }
}

let lastSentAvatar = ''

function sendAvatarNow() {
  if (!room) return
  const payload = JSON.stringify(avatarPayload())
  if (payload === lastSentAvatar) return
  lastSentAvatar = payload
  send('setAvatar', { avatar: payload })
}

// Local position/facing/gait, throttled out over `move`. Called every frame
// from components/GameLoop.jsx. A no-op while offline.
let moveAccumMs = 0
let lastSentMove = null
const MOVE_EPS = 0.01

export function reportLocal(delta) {
  if (!room) return
  moveAccumMs += delta * 1000
  if (moveAccumMs < MOVE_SEND_INTERVAL_MS) return
  moveAccumMs = 0

  const moveBlend = Math.min(1, Math.hypot(player.velocity.x, player.velocity.z) / player.moveSpeed)
  const next = { x: player.position.x, y: player.position.y, z: player.position.z, yaw: player.facing, moveBlend }
  const last = lastSentMove
  if (
    last &&
    Math.abs(next.x - last.x) < MOVE_EPS &&
    Math.abs(next.y - last.y) < MOVE_EPS &&
    Math.abs(next.z - last.z) < MOVE_EPS &&
    Math.abs(next.yaw - last.yaw) < MOVE_EPS &&
    Math.abs(next.moveBlend - last.moveBlend) < MOVE_EPS
  ) {
    return
  }
  lastSentMove = next
  send('move', next)
}

// --- Identity sync (login/logout mid-session) -------------------------------
// Join options only carry what was true the instant the socket opened; Bloxity
// auth routinely settles later or changes without a reload.
let lastIdentity = { userId: '', username: '' }

function sendIdentityNow() {
  if (!room) return
  const userId = getStableUserId()
  const username = getDisplayName()
  if (userId === lastIdentity.userId && username === lastIdentity.username) return

  // Flush this session's progress under the OLD id before the room forgets it.
  if (lastIdentity.userId && lastIdentity.userId !== userId) sendProgressNow()
  // A freshly-signed-in id gets its saved doc hydrated, like a brand-new join.
  if (userId && userId !== lastIdentity.userId) hydratedFromServer = false

  lastIdentity = { userId, username }
  send('identify', { userId, username })
  // Signing in/out flips avatarPayload()'s equipped gate.
  sendAvatarNow()
}

function waitForAuth(ms) {
  if (authState.ready) return Promise.resolve()
  return new Promise((resolve) => {
    let done = false
    const finish = () => {
      if (done) return
      done = true
      clearTimeout(t)
      off()
      resolve()
    }
    const off = subscribeAuth((s) => {
      if (s.ready) finish()
    })
    const t = setTimeout(finish, ms)
  })
}

function withTimeout(promise, ms, label) {
  let t
  const timeout = new Promise((_, reject) => {
    t = setTimeout(() => reject(new Error(label)), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(t))
}

// --- Connect / attach / retry ---------------------------------------------
async function connect() {
  if (stopped || connecting || room) return
  connecting = true
  clearTimeout(retryTimer)
  retryTimer = 0
  setStatus('connecting')

  try {
    const mod = await loadSdk()
    if (stopped) return
    if (!client) client = new mod.Client(SERVER_URL)

    // The SDK's Room rides out brief socket drops itself; this is only the
    // first join and the fallback once that recovery gives up (room.onLeave).
    const joined = await withTimeout(
      client.joinOrCreate(ROOM_NAME, {
        username: getDisplayName(),
        userId: getStableUserId(), // '' for a guest: nothing to load/save
        // Seeds the server's PlayerState.avatar so others render us correctly
        // from the very first frame.
        avatar: JSON.stringify(avatarPayload()),
      }),
      JOIN_TIMEOUT_MS,
      'join timed out',
    )

    if (stopped) {
      try {
        joined.leave()
      } catch {
        /* nothing to clean up */
      }
      return
    }
    attachRoom(joined)
  } catch (err) {
    connecting = false
    attempt += 1
    netState.error = String((err && err.message) || err)
    if (!stopped) scheduleRetry()
  }
}

function scheduleRetry() {
  if (stopped || room || retryTimer) return
  setStatus('solo')
  const i = Math.min(Math.max(attempt - 1, 0), RETRY_BACKOFF_MS.length - 1)
  retryTimer = setTimeout(() => {
    retryTimer = 0
    connect()
  }, RETRY_BACKOFF_MS[i])
}

function recount() {
  const n = room && room.state && room.state.players ? room.state.players.size : 0
  if (n !== netState.playerCount) {
    netState.playerCount = n
    emit()
  }
}

function attachRoom(joined) {
  room = joined
  connecting = false
  attempt = 0
  selfId = joined.sessionId
  netState.error = null

  room.onLeave(() => handleLeave())
  room.onError((code, message) => {
    netState.error = message || `error ${code}`
  })

  // The saved doc for our Bloxity user id, sent once right after join.
  room.onMessage('progress', (msg) => {
    if (hydratedFromServer) return
    hydratedFromServer = true
    useGameStore.getState().hydrate(msg)
  })
  room.onMessage('leaderboard', (msg) => {
    globalLeaderboard = msg || EMPTY_BOARDS
    emit()
  })

  // Called unconditionally: room.state can still be an empty shell right
  // after joinOrCreate() resolves, and getStateCallbacks() defers registration
  // until the `players` map arrives. Guarding on room.state.players here would
  // skip registering for good.
  const $ = sdkModule.getStateCallbacks(room)
  $(room.state).players.onAdd((p, sessionId) => {
    recount()
    if (sessionId === selfId) return
    remotePlayers.set(sessionId, p)
    notifyRoster('onAdd', sessionId, p)
  })
  $(room.state).players.onRemove((_p, sessionId) => {
    recount()
    if (sessionId === selfId) return
    remotePlayers.delete(sessionId)
    notifyRoster('onRemove', sessionId)
  })

  // A fresh session starts every server field at its default, so re-state ours
  // right away instead of waiting for the next change.
  sendStatsNow()
  lastSentAvatar = ''
  sendAvatarNow()
  lastSentMove = null
  moveAccumMs = MOVE_SEND_INTERVAL_MS // send on the very next reportLocal()
  // Join options already carried this identity; only resend on a REAL change.
  lastIdentity = { userId: getStableUserId(), username: getDisplayName() }

  recount()
  setStatus('online')
}

function clearRemotePlayers() {
  for (const sessionId of remotePlayers.keys()) notifyRoster('onRemove', sessionId)
  remotePlayers.clear()
}

function handleLeave() {
  room = null
  selfId = ''
  connecting = false
  netState.playerCount = 0
  globalLeaderboard = EMPTY_BOARDS
  // Those characters belonged to the room we just lost.
  clearRemotePlayers()

  if (stopped) return
  attempt = 0
  scheduleRetry()
}

// --- Lifecycle --------------------------------------------------------------
let offStore = null
let offIdentity = null
let offAvatarChanged = null
let offProportionsChanged = null

export function init() {
  if (started) return
  started = true
  stopped = false
  // No server configured for this build: stay 'idle' forever. Every export
  // below already no-ops without a room.
  if (!SERVER_URL) return

  offStore ||= useGameStore.subscribe(onStoreChange)
  // subscribeAuth also fires on friends/balance loads; sendIdentityNow()'s own
  // diff check filters those out.
  offIdentity ||= subscribeAuth(() => sendIdentityNow())
  // Anything that changes avatarPayload() -> the room, so others see the
  // equip/unequip or proportions edit right away.
  offAvatarChanged ||= onAvatarChanged(() => sendAvatarNow())
  offProportionsChanged ||= onProportionsChanged(() => sendAvatarNow())
  waitForAuth(USERNAME_WAIT_MS).then(() => {
    if (!stopped) connect()
  })
}

export function teardown() {
  stopped = true
  started = false
  clearTimeout(retryTimer)
  clearTimeout(statsTimer)
  clearTimeout(progressTimer)
  retryTimer = statsTimer = progressTimer = 0
  for (const off of [offStore, offIdentity, offAvatarChanged, offProportionsChanged]) off?.()
  offStore = offIdentity = offAvatarChanged = offProportionsChanged = null
  clearRemotePlayers()
  // Final best-effort save; room.send() is fire-and-forget so it never delays leave().
  sendProgressNow()
  if (room) {
    try {
      // Don't let the SDK reconnect a socket we are deliberately closing.
      if (room.reconnection) room.reconnection.enabled = false
      room.leave()
    } catch {
      /* page is going away */
    }
  }
  room = null
  connecting = false
  globalLeaderboard = EMPTY_BOARDS
  netState.playerCount = 0
  setStatus('idle')
}

// Collapses the backoff and tries to connect now.
export function retryNow() {
  if (!SERVER_URL) return
  if (stopped) {
    stopped = false
    started = true
  }
  clearTimeout(retryTimer)
  retryTimer = 0
  attempt = 0
  connect()
}
