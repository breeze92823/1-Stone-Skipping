import { create } from 'zustand'
import {
  SKILL_INITIAL,
  SKILL_MIN,
  REBIRTH_INITIAL,
  skillCap,
  WINS_INITIAL,
  REBIRTH_MIN,
  REBIRTH_MAX,
  levelForSkill,
  canAcceptRebirth,
  AUTO_REBIRTH,
  clamp,
} from '../data/progression.js'

// Lightweight, infrequently-changing game state for the HUD. The thrown
// stones' per-frame physics live in systems/stoneActions.js instead — that
// changes every frame and would thrash React if it lived here.
//
// Skill is the raw earned total (Age-every-click's "Age"); level is always
// derived from it via derive().
function derive(state) {
  return { ...state, level: levelForSkill(state.skill) }
}

// derive() plus the VITE_AUTO_REBIRTH step: at the level cap, rebirth at once.
function settle(state) {
  if (AUTO_REBIRTH && canAcceptRebirth(state.skill, state.rebirths)) {
    return derive({ ...state, rebirths: clamp(state.rebirths + 1, REBIRTH_MIN, REBIRTH_MAX), skill: SKILL_MIN })
  }
  return derive(state)
}

export const useGameStore = create((set, get) => ({
  skill: Math.min(SKILL_INITIAL, skillCap(REBIRTH_INITIAL)),
  level: levelForSkill(Math.min(SKILL_INITIAL, skillCap(REBIRTH_INITIAL))),
  rebirths: REBIRTH_INITIAL,
  wins: WINS_INITIAL,
  multiplier: 1,
  friendBoost: 0,

  stoneReady: true, // a stone is in hand and can be thrown
  skipCount: 0,
  bestSkips: 0,
  inThrowZone: false, // player is standing in the Throw Zone; shows the THROW prompt

  currentPoolId: null, // id of the training pool the player is standing on, if any

  setCurrentPoolId: (id) => set({ currentPoolId: id }),
  throwStone: () => set({ stoneReady: false, skipCount: 0 }),
  reloadStone: () => set({ stoneReady: true }),
  setInThrowZone: (value) => set({ inThrowZone: value }),

  registerSkip: (skips) => set((s) => ({ skipCount: skips, bestSkips: Math.max(s.bestSkips, skips) })),

  // Earned by skipping: scaled by the multiplier and (rebirths + 1), the same
  // rebirth bonus Age-every-click applies to each click.
  addSkill: (amount) =>
    set((s) =>
      settle({
        ...s,
        skill: clamp(s.skill + Math.floor(amount * s.multiplier * (s.rebirths + 1)), SKILL_MIN, skillCap(s.rebirths)),
      }),
    ),
  // Flat grant (Bux boosts) — no multipliers.
  grantSkill: (amount) =>
    set((s) => settle({ ...s, skill: clamp(s.skill + amount, SKILL_MIN, skillCap(s.rebirths)) })),
  addWins: (amount) => set((s) => ({ wins: s.wins + amount })),

  // Skill Stones yard: wins are spent to own a stone, one stone is equipped.
  // Stones are identified by their model name (unique in SKILL_STONES).
  ownedStones: ['pebble'],
  equippedStone: 'pebble',
  buyStone: (id, cost) =>
    set((s) =>
      s.ownedStones.includes(id) || s.wins < cost
        ? s
        : { wins: s.wins - cost, ownedStones: [...s.ownedStones, id], equippedStone: id },
    ),
  equipStone: (id) => set((s) => (s.ownedStones.includes(id) ? { equippedStone: id } : s)),

  // Manual, gated by canAcceptRebirth. Re-checks eligibility itself so a
  // duplicate/stale caller can never double-apply a rebirth.
  acceptRebirth: () => {
    const state = get()
    if (!canAcceptRebirth(state.skill, state.rebirths)) return
    set((s) =>
      derive({
        ...s,
        rebirths: clamp(s.rebirths + 1, REBIRTH_MIN, REBIRTH_MAX),
        skill: SKILL_MIN, // the env starting grant applies once, not on every rebirth
      }),
    )
  },
}))
