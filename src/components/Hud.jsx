import { useEffect, useRef, useState } from 'react'
import { useGameStore } from '../store/useGameStore.js'
import { inputState } from '../systems/input.js'
import { authState, isAvailable, login, logout, purchase, inviteFriend } from '../systems/bloxity.js'
import { settings } from '../systems/settingsState.js'
import { useAuth, useSettings } from '../systems/bloxityHooks.js'
import InteractPrompt from './InteractPrompt.jsx'
import EggPanel from './EggPanel.jsx'
import PetBar from './PetBar.jsx'
import ActionResult from './ActionResult.jsx'
import ActionPopups from './ActionPopups.jsx'
import { formatNumber } from '../utils/formatNumber.js'
import { actionResultState } from '../systems/actionResult.js'
import { canAcceptRebirth, rebirthLevelsRequired, levelForSkill, levelProgress } from '../data/progression.js'

const TUTORIAL_SKILL = 30
const TUTORIAL_WINS = 2
const TUTORIAL_STONE = 'scallop' // the +3 Skill Stone
const TUTORIAL_LEVEL = 20

// Skill purchase buttons along the bottom, now backed by real Bux
// purchases: the sku is passed to the SDK and the price comes from the
// catalog registered for GAME_SLUG on bloxity.io — these placeholder skus
// need to match whatever that catalog actually calls them.
const BOOSTS = [
  { label: '+10K', amount: 10_000, cost: 7, className: 'boost-yellow', sku: 'skill_boost_10k' },
  { label: '+100K', amount: 100_000, cost: 30, className: 'boost-red', sku: 'skill_boost_100k' },
  { label: '+1M', amount: 1_000_000, cost: 55, className: 'boost-rainbow', sku: 'skill_boost_1m' },
]


const Bolt = ({ className }) => (
  <svg className={className} viewBox="0 0 24 36" aria-hidden="true">
    <path d="M15 1 L2 20 H11 L8 35 L22 13 H13 Z" fill="#ffcf1f" stroke="#1a1206" strokeWidth="2" strokeLinejoin="round" />
  </svg>
)

const RobuxHex = () => (
  <svg className="robux" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 2 L21 7 V17 L12 22 L3 17 V7 Z" fill="none" stroke="#111" strokeWidth="6" strokeLinejoin="round" />
    <path d="M12 2 L21 7 V17 L12 22 L3 17 V7 Z" fill="none" stroke="#3fcf4f" strokeWidth="3" strokeLinejoin="round" />
    <rect x="9.5" y="9.5" width="5" height="5" fill="#3fcf4f" stroke="#111" strokeWidth="1" />
  </svg>
)

const RebirthIcon = () => (
  <svg className="stat-icon" viewBox="0 0 48 48" aria-hidden="true">
    <defs>
      <linearGradient id="rb-pink" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#ff5aa0" />
        <stop offset="1" stopColor="#ff2f7a" />
      </linearGradient>
      <linearGradient id="rb-blue" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#4fb8ff" />
        <stop offset="1" stopColor="#2a74ff" />
      </linearGradient>
    </defs>
    <path d="M8 22 A16 16 0 0 1 38 14 L42 8 L44 24 L29 20 L34 17 A11 11 0 0 0 14 22 Z" fill="url(#rb-pink)" stroke="#111" strokeWidth="2.5" strokeLinejoin="round" />
    <path d="M40 26 A16 16 0 0 1 10 34 L6 40 L4 24 L19 28 L14 31 A11 11 0 0 0 34 26 Z" fill="url(#rb-blue)" stroke="#111" strokeWidth="2.5" strokeLinejoin="round" />
  </svg>
)

const TrophyIcon = () => (
  <svg className="stat-icon" viewBox="0 0 48 48" aria-hidden="true">
    <path d="M12 10 H6 V16 A8 8 0 0 0 14 24 M36 10 H42 V16 A8 8 0 0 1 34 24" fill="none" stroke="#111" strokeWidth="6" />
    <path d="M12 10 H6 V16 A8 8 0 0 0 14 24 M36 10 H42 V16 A8 8 0 0 1 34 24" fill="none" stroke="#ffc21a" strokeWidth="3" />
    <path d="M11 6 H37 V16 A13 13 0 0 1 11 16 Z" fill="#ffc21a" stroke="#111" strokeWidth="2.5" strokeLinejoin="round" />
    <path d="M15 9 V15 A9 9 0 0 0 19 23" fill="none" stroke="#fff3b0" strokeWidth="2.5" strokeLinecap="round" />
    <rect x="21" y="28" width="6" height="8" fill="#e8a410" stroke="#111" strokeWidth="2" />
    <rect x="13" y="36" width="22" height="7" rx="2" fill="#ffc21a" stroke="#111" strokeWidth="2.5" />
  </svg>
)

const PlusIcon = () => (
  <svg className="plus-icon" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M9 2 H15 V9 H22 V15 H15 V22 H9 V15 H2 V9 H9 Z" fill="#5ed94a" stroke="#1d5e18" strokeWidth="1.5" strokeLinejoin="round" />
  </svg>
)

// Driven by the Bloxity `show_fps` setting. Runs its own rAF loop since
// this overlay lives outside the R3F <Canvas> tree.
function FpsCounter() {
  const [fps, setFps] = useState(0)
  useEffect(() => {
    let frames = 0
    let last = performance.now()
    let raf
    const tick = (now) => {
      frames += 1
      if (now - last >= 500) {
        setFps(Math.round((frames * 1000) / (now - last)))
        frames = 0
        last = now
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])
  return <div className="fps-counter outlined">{fps} FPS</div>
}

// Bloxity login + account control. Reads only from authState, which is kept
// current by the single onUserChanged subscription in systems/bloxity.js —
// no local caching of the user object here.
function AuthControl() {
  useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  if (!isAvailable()) return null
  const user = authState.user

  if (!user) {
    return (
      <button className="pill-btn auth-pill" onClick={() => login()}>
        <span className="outlined">Log In</span>
      </button>
    )
  }

  return (
    <div className="auth-account">
      <button className="round-btn auth-avatar" aria-label="Account" onClick={() => setMenuOpen((v) => !v)}>
        {user.pfp ? <img src={user.pfp} alt="" /> : <span className="outlined">{(user.displayName || user.username || '?')[0]}</span>}
      </button>
      {menuOpen && (
        <div className="auth-menu">
          <div className="auth-name outlined">{user.displayName || user.username}</div>
          <button
            className="auth-logout"
            onClick={() => {
              logout()
              setMenuOpen(false)
            }}
          >
            Log Out
          </button>
        </div>
      )}
    </div>
  )
}

const PRESENCE_COLOR = { online: '#3dec5b', 'in-game': '#4a6bff', away: '#ffc21a', offline: '#6b7fa8' }

// Friends list popover, backed by Legion.SDK.social.getFriends() via
// authState (refreshed on login).
function FriendsPanel() {
  useAuth()
  const [open, setOpen] = useState(false)

  if (!authState.user) return null
  const friends = authState.friends

  return (
    <div className="friends-panel-wrap">
      <button className="round-btn" aria-label="Friends" onClick={() => setOpen((v) => !v)}>
        <svg viewBox="0 0 24 24">
          <circle cx="9" cy="9" r="3.2" fill="#fff" />
          <circle cx="16" cy="10.5" r="2.6" fill="#c9d6ea" />
          <path d="M3 20 C3 15.5 6 13 9 13 C12 13 15 15.5 15 20" fill="#fff" />
          <path d="M14 20 C14 16.3 15.8 14.2 17.5 14.2 C19.6 14.2 21 16.6 21 20" fill="#c9d6ea" />
        </svg>
      </button>
      {open && (
        <div className="friends-panel">
          <div className="friends-title outlined">Friends</div>
          {friends.length === 0 && <div className="friends-empty">No friends yet</div>}
          {friends.map((f) => (
            <div key={f._id} className="friend-row">
              <span className="presence-dot" style={{ background: PRESENCE_COLOR[f.presence?.status] ?? PRESENCE_COLOR.offline }} />
              <span className="friend-name">{f.displayName || f.username}</span>
              <button className="friend-invite" onClick={() => inviteFriend(f._id)}>
                Invite
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Generic stand-ins for the client's top-bar buttons.
function TopBar() {
  useAuth()
  useSettings()
  const user = authState.user
  const balance = authState.balance

  return (
    <>
      <div className="topbar topbar-left">
        <button className="round-btn" aria-label="Menu">
          <svg viewBox="0 0 24 24">
            <rect x="5" y="5" width="14" height="14" rx="2" transform="rotate(15 12 12)" fill="#fff" />
            <rect x="10" y="10" width="4" height="4" transform="rotate(15 12 12)" fill="#1d1f24" />
          </svg>
        </button>
        {settings.enable_chat && (
          <div className="pill-btn">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 7 H20 M4 12 H20 M4 17 H20" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span className="chat">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 5 H20 V16 H10 L6 20 V16 H4 Z" fill="none" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
              </svg>
              <span className="badge">13</span>
            </span>
          </div>
        )}
        <button className="round-btn" aria-label="Settings">
          <svg viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="7.6" fill="none" stroke="#4aa8ff" strokeWidth="4" strokeDasharray="3 3" />
            <circle cx="12" cy="12" r="6.2" fill="#4aa8ff" />
            <circle cx="12" cy="12" r="2.6" fill="#1d1f24" />
          </svg>
        </button>
        {user && <FriendsPanel />}
      </div>
      <div className="topbar topbar-right">
        {user && (
          <div className="pill-btn bux-balance">
            <RobuxHex />
            <span className="outlined">{balance ?? '—'}</span>
          </div>
        )}
        <button className="round-btn" aria-label="Daily rewards">
          <svg viewBox="0 0 24 24">
            <rect x="4" y="6" width="16" height="14" rx="2" fill="#fff" />
            <rect x="4" y="6" width="16" height="4" fill="#ff4d6d" />
            <text x="12" y="18" fontSize="7" textAnchor="middle" fill="#1d1f24" fontWeight="bold">31</text>
          </svg>
        </button>
        <button className="round-btn" aria-label="Quests">
          <svg viewBox="0 0 24 24">
            <path d="M6 4 H17 A2 2 0 0 1 19 6 V18 A2 2 0 0 1 17 20 H7 A2 2 0 0 1 5 18 V6 A2 2 0 0 1 6 4 Z" fill="#e8f0ff" />
            <path d="M8 9 H16 M8 12 H16 M8 15 H13" stroke="#6b7fa8" strokeWidth="1.5" />
          </svg>
        </button>
        <AuthControl />
      </div>
    </>
  )
}

// Confirms the trade of current Skill for a rebirth rather than firing on a
// single click. Ported from Age-every-click's RebirthWindow.
function RebirthWindow({ onClose }) {
  const skill = useGameStore((s) => s.skill)
  const rebirths = useGameStore((s) => s.rebirths)
  const acceptRebirth = useGameStore((s) => s.acceptRebirth)
  const requirement = rebirthLevelsRequired(rebirths)
  const level = levelForSkill(skill)
  const canRebirth = canAcceptRebirth(skill, rebirths)
  const frac = Math.min(1, Math.max(0, level / requirement))

  return (
    <div className="modal-backdrop" onWheel={(e) => e.stopPropagation()}>
      <div className="modal">
        <span className="modal-title outlined">Rebirth</span>
        <button type="button" className="modal-close" aria-label="Close" onClick={onClose}>
          X
        </button>
        <div className="modal-body">
          <div className="rebirth-arrow-row">
            <span className="outlined rebirth-x">X{rebirths}</span>
            <span className="outlined rebirth-arrow">▶</span>
            <span className="outlined rebirth-x">X{rebirths + 1}</span>
          </div>
          <div className="outlined rebirth-warning">Rebirth resets your Skill and Level!</div>
          <div className="rebirth-bar">
            <div className="rebirth-bar-fill" style={{ width: `${(frac * 100).toFixed(2)}%` }} />
            <span className="outlined rebirth-bar-label">
              Level {formatNumber(level)}/{formatNumber(requirement)}
            </span>
          </div>
          <button
            type="button"
            className="rebirth-confirm outlined"
            disabled={!canRebirth}
            onClick={() => {
              acceptRebirth()
              onClose()
            }}
          >
            {canRebirth ? 'Rebirth' : `Level ${formatNumber(requirement)} needed`}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Hud() {
  const skill = useGameStore((s) => s.skill)
  const level = useGameStore((s) => s.level)
  const rebirths = useGameStore((s) => s.rebirths)
  const wins = useGameStore((s) => s.wins)
  const multiplier = useGameStore((s) => s.multiplier)
  const friendBoost = useGameStore((s) => s.friendBoost)
  const grantSkill = useGameStore((s) => s.grantSkill)
  const [rebirthOpen, setRebirthOpen] = useState(false)
  const { into, span } = levelProgress(skill)
  const maxLevel = level >= rebirthLevelsRequired(rebirths)
  const inThrowZone = useGameStore((s) => s.inThrowZone)
  const stoneReady = useGameStore((s) => s.stoneReady)

  // systems/actionResult.js singleton, polled at ~10Hz; the id changes on every
  // trigger so a repeated message still re-pops the popup.
  const actionResultRef = useRef(null)
  useEffect(() => {
    let lastId = actionResultState.id
    const id = setInterval(() => {
      if (actionResultState.id === lastId) return
      lastId = actionResultState.id
      actionResultRef.current?.show(actionResultState.text, actionResultState.success)
    }, 100)
    return () => clearInterval(id)
  }, [])

  const [showHint, setShowHint] = useState(true)
  useEffect(() => {
    const id = setTimeout(() => setShowHint(false), 12000)
    return () => clearTimeout(id)
  }, [])

  // Tutorial steps (see useGameStore): 0 get skills, 1 get wins, 2 equip the
  // +3 stone, 3 reach level 20, 4 rebirth, 5 done. Latched so the step never
  // goes backwards (e.g. a rebirth resets skill).
  const currentPoolId = useGameStore((s) => s.currentPoolId)
  const equippedStone = useGameStore((s) => s.equippedStone)
  const tutorialStep = useGameStore((s) => s.tutorialStep)
  const setTutorialStep = useGameStore((s) => s.setTutorialStep)
  useEffect(() => {
    if (tutorialStep === 0 && skill >= TUTORIAL_SKILL) setTutorialStep(1)
    else if (tutorialStep === 1 && wins >= TUTORIAL_WINS) setTutorialStep(2)
    else if (tutorialStep === 2 && equippedStone === TUTORIAL_STONE) setTutorialStep(3)
    else if (tutorialStep === 3 && level >= TUTORIAL_LEVEL) setTutorialStep(4)
    else if (tutorialStep === 4 && rebirths >= 1) setTutorialStep(5)
  }, [tutorialStep, skill, wins, equippedStone, level, rebirths, setTutorialStep])
  const questDone = tutorialStep === 5
  useSettings()
  const showFps = settings.show_fps

  return (
    <div className="hud">
      <TopBar />
      <InteractPrompt />
      <EggPanel />
      <PetBar />
      <ActionResult ref={actionResultRef} />
      <ActionPopups />
      {showFps && <FpsCounter />}

      <div className="quest">
        <div className="quest-tag outlined">{questDone ? 'COMPLETE' : 'TUTORIAL'}</div>
        <div className="quest-text outlined">
          {tutorialStep === 0 && `GET ${TUTORIAL_SKILL} SKILLS (${formatNumber(Math.min(skill, TUTORIAL_SKILL))}/${TUTORIAL_SKILL})`}
          {tutorialStep === 1 && `GET ${TUTORIAL_WINS} WINS (${formatNumber(Math.min(wins, TUTORIAL_WINS))}/${TUTORIAL_WINS})`}
          {tutorialStep === 2 && 'EQUIP A NEW STONE'}
          {tutorialStep === 3 && `REACH LEVEL ${TUTORIAL_LEVEL} (${formatNumber(Math.min(level, TUTORIAL_LEVEL))}/${TUTORIAL_LEVEL})`}
          {tutorialStep === 4 && 'REBIRTH NOW'}
          {tutorialStep === 5 && 'TUTORIAL COMPLETE'}
        </div>
        {tutorialStep === 1 && currentPoolId && (
          <div className="quest-warn outlined">JUMP TO EXIT TRAINING ZONE</div>
        )}
      </div>

      {showHint && (
        <div className="controls-hint">WASD move · Space jump · Right-drag camera</div>
      )}

      {inThrowZone && stoneReady && (
        <button
          className="throw-btn"
          onClick={() => {
            inputState.throwPressed = true
          }}
        >
          <span className="outlined">THROW</span>
        </button>
      )}

      <div className="side-stats">
        <button
          type="button"
          className={`side-stat rebirth-btn${canAcceptRebirth(skill, rebirths) ? ' ready' : ''}`}
          aria-label="Rebirth"
          onClick={() => setRebirthOpen(true)}
        >
          <RebirthIcon />
          <span className="outlined stat-num stat-rebirth">{formatNumber(rebirths)}</span>
        </button>
        <div className="side-stat">
          <TrophyIcon />
          <span className="outlined stat-num stat-wins">{formatNumber(wins)}</span>
        </div>
        <div className="friend-boost">
          <span className="outlined">Friend Boost +{friendBoost}%</span>
          <PlusIcon />
        </div>
      </div>

      <div className="bottom">
        <div className="bottom-row">
          <span className="skill outlined">
            <Bolt className="skill-bolt" />
            {formatNumber(skill)} SKILL
          </span>
          <span className="mult outlined">x{multiplier * (rebirths + 1)} Multiplier</span>
        </div>

        <div className="levelbar">
          <div className="levelbar-fill" style={{ width: `${maxLevel ? 100 : (into / span) * 100}%` }} />
          <span className="levelbar-level outlined">Level {formatNumber(level)}</span>
          <span className="levelbar-xp outlined">{maxLevel ? 'MAX Level' : `${formatNumber(into)} / ${formatNumber(span)}`}</span>
        </div>

        <div className="boosts">
          {BOOSTS.map((b) => (
            <button
              key={b.label}
              className={`boost ${b.className}`}
              onClick={async () => {
                const result = await purchase(b.sku)
                if (result?.success) grantSkill(b.amount)
              }}
            >
              <Bolt className="boost-bolt" />
              <span className="outlined boost-label">{b.label}</span>
              <span className="boost-cost">
                <RobuxHex />
                <span className="outlined">{b.cost}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {rebirthOpen && <RebirthWindow onClose={() => setRebirthOpen(false)} />}
    </div>
  )
}
