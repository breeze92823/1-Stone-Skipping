// Progression constants and pure helpers, ported from Age-every-click's
// data/progression.js. Skill plays the role Age plays there: the raw earned
// total. Level is derived from it (SKILL_PER_LEVEL skill per level), and
// Rebirth is gated on Skill exactly like Age-every-click gates it on Age.

export const SKILL_INITIAL = 0
export const SKILL_MIN = 0
export const SKILL_MAX = 1_000_000_000_000

export const SKILL_PER_LEVEL = 10
export const LEVEL_MIN = 1

export const REBIRTH_INITIAL = 0
export const REBIRTH_MIN = 0
export const REBIRTH_MAX = 5000

export function clamp(n, min, max) {
  return n < min ? min : n > max ? max : n
}

export function levelForSkill(skill) {
  return LEVEL_MIN + Math.floor(Math.max(0, skill) / SKILL_PER_LEVEL)
}

// Where the given Skill sits inside its current level, for the HUD level bar.
export function levelProgress(skill) {
  const total = Math.floor(Math.max(0, skill))
  return { level: levelForSkill(total), into: total % SKILL_PER_LEVEL, span: SKILL_PER_LEVEL }
}

// Levels needed to rebirth, indexed by current rebirth count (X0->X1 first).
// Past the table it keeps adding REBIRTH_LEVELS_STEP per rebirth (125, 150, 175...).
const REBIRTH_LEVELS = [10, 20, 40, 60, 80, 100, 125, 150]
const REBIRTH_LEVELS_STEP = 25

export function rebirthLevelsRequired(rebirth) {
  if (rebirth < REBIRTH_LEVELS.length) return REBIRTH_LEVELS[rebirth]
  return REBIRTH_LEVELS[REBIRTH_LEVELS.length - 1] + REBIRTH_LEVELS_STEP * (rebirth - REBIRTH_LEVELS.length + 1)
}

// Skill needed = levels required * SKILL_PER_LEVEL.
export function rebirthRequirement(rebirth) {
  return rebirthLevelsRequired(rebirth) * SKILL_PER_LEVEL
}

// Single source of truth for rebirth eligibility — the store's guard and the
// HUD button both call this so they can never disagree.
export function canAcceptRebirth(skill, rebirth) {
  return rebirth < REBIRTH_MAX && skill >= rebirthRequirement(rebirth)
}
