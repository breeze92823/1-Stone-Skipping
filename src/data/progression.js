// Progression constants and pure helpers, ported from Age-every-click's
// data/progression.js. Skill plays the role Age plays there: the raw earned
// total. Level is derived from it (see levelCost for the per-level cost), and
// Rebirth is gated on Skill exactly like Age-every-click gates it on Age.

export function clamp(n, min, max) {
  return n < min ? min : n > max ? max : n
}

// Starting values can be overridden from .env (VITE_INITIAL_*); bad or
// missing values fall back to the default.
function envInt(value, fallback, min, max) {
  const n = Math.floor(Number(value))
  return value === undefined || value === '' || !Number.isFinite(n) ? fallback : clamp(n, min, max)
}

export const SKILL_MIN = 0
export const SKILL_MAX = 1_000_000_000_000
export const SKILL_INITIAL = envInt(import.meta.env.VITE_INITIAL_SKILL, 0, SKILL_MIN, SKILL_MAX)

export const LEVEL_MIN = 1

// Skill needed to go from `level` to `level + 1` (a single step, not cumulative).
// Levels 1-19 and 20-24 are exact values from the real game. From 25 up there is
// no data yet except 149->150 = 1,590,000, so the tail is an ESTIMATE: the +9 line
// plus a small exponential term fitted through that point. Replace it (or add
// table rows) as real values are confirmed.
const LEVEL_COSTS_EXACT = [
  ...Array(13).fill(10), // 1->2 .. 13->14
  12, 14, 15, 17, 19, 22, // 14->15 .. 19->20
  44, 53, 62, 71, 80, // 20->21 .. 24->25
]
const TAIL_START = 20 // tail formula is anchored at level 20 (cost 44)
const TAIL_EXP = 0.5
const TAIL_RATE = 0.1161

export function levelCost(level) {
  if (level <= LEVEL_COSTS_EXACT.length) return LEVEL_COSTS_EXACT[Math.max(1, level) - 1]
  const d = level - TAIL_START
  return Math.round(44 + 9 * d + TAIL_EXP * (Math.exp(TAIL_RATE * d) - 1))
}

// CUM[i] = total Skill needed to reach level i + 1. Built once, up to SKILL_MAX.
const CUM = [0]
while (CUM[CUM.length - 1] < SKILL_MAX) {
  CUM.push(Math.min(SKILL_MAX, CUM[CUM.length - 1] + levelCost(CUM.length)))
}

// Total Skill needed to reach `level`.
export function skillForLevel(level) {
  const i = Math.max(LEVEL_MIN, level) - LEVEL_MIN
  return i < CUM.length ? CUM[i] : SKILL_MAX
}

export const REBIRTH_MIN = 1 // players start at X1; there is no X0 -> X1 step
export const REBIRTH_MAX = 5000
export const REBIRTH_INITIAL = envInt(import.meta.env.VITE_INITIAL_REBIRTHS, 1, REBIRTH_MIN, REBIRTH_MAX)

// When true, rebirth happens automatically the moment the level cap is reached.
export const AUTO_REBIRTH = import.meta.env.VITE_AUTO_REBIRTH === 'true'

export const WINS_INITIAL = envInt(import.meta.env.VITE_INITIAL_WINS, 0, 0, Number.MAX_SAFE_INTEGER)

function levelIndex(skill) {
  let lo = 0
  let hi = CUM.length - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (CUM[mid] <= skill) lo = mid
    else hi = mid - 1
  }
  return lo
}

export function levelForSkill(skill) {
  return LEVEL_MIN + levelIndex(Math.max(0, skill))
}

// Where the given Skill sits inside its current level, for the HUD level bar.
export function levelProgress(skill) {
  const total = Math.floor(Math.max(0, skill))
  const i = levelIndex(total)
  const span = i + 1 < CUM.length ? CUM[i + 1] - CUM[i] : 1
  return { level: LEVEL_MIN + i, into: Math.min(total - CUM[i], span), span }
}

// Levels needed to rebirth, indexed by current rebirth count (X0->X1 first).
// Past the table it keeps adding REBIRTH_LEVELS_STEP per rebirth (125, 150, 175...).
const REBIRTH_LEVELS = [10, 20, 40, 60, 80, 100, 125, 150]
const REBIRTH_LEVELS_STEP = 25

export function rebirthLevelsRequired(rebirth) {
  if (rebirth < REBIRTH_LEVELS.length) return REBIRTH_LEVELS[rebirth]
  return REBIRTH_LEVELS[REBIRTH_LEVELS.length - 1] + REBIRTH_LEVELS_STEP * (rebirth - REBIRTH_LEVELS.length + 1)
}

// Skill at which a Throw Zone stone reaches the Lake End Portal.
export const PORTAL_SKILL = 1_000_000
const REACH_FLOOR = 0.02 // a fresh player still skips a short way
const WINS_MULT_MAX = 100 // extra wins multiplier at full reach

// 0..1 share of the canal a Throw Zone stone can cross, from Skill alone:
// linear up to PORTAL_SKILL, where the stone reaches the portal.
export function canalReach(skill) {
  return Math.max(REACH_FLOOR, clamp(skill / PORTAL_SKILL, 0, 1))
}

// Wins per lake skip: 1x at no progress, WINS_MULT_MAX x at full reach.
export function lakeWinsMultiplier(reach) {
  return 1 + (WINS_MULT_MAX - 1) * reach * reach
}

// Level is capped at the current rebirth's required level until you rebirth,
// so Skill can't go past the point that reaches it.
export function skillCap(rebirth) {
  return skillForLevel(rebirthLevelsRequired(rebirth))
}

// Single source of truth for rebirth eligibility — the store's guard and the
// HUD button both call this so they can never disagree.
export function canAcceptRebirth(skill, rebirth) {
  return rebirth < REBIRTH_MAX && levelForSkill(skill) >= rebirthLevelsRequired(rebirth)
}
