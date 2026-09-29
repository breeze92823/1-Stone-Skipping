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
import { MAX_EQUIPPED_PETS, petBonus } from '../systems/eggPanel.js'

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

  tutorialStep: 0, // 0 skills, 1 wins, 2 equip +3 stone, 3 level 20, 4 rebirth, 5 done; only ever advances (Hud.jsx)
  setTutorialStep: (step) => set({ tutorialStep: step }),

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
        skill: clamp(s.skill + Math.floor(amount * (s.multiplier + petBonus(s.equippedPets)) * (s.rebirths + 1)), SKILL_MIN, skillCap(s.rebirths)),
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

  // Applies a saved doc from the server (systems/net.js's `progress` message).
  // Every field is re-validated, so a malformed doc can't corrupt the store.
  hydrate: (d) =>
    set((s) => {
      const num = (v, fallback) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback)
      const rebirths = clamp(Math.floor(num(d.rebirths, s.rebirths)), REBIRTH_MIN, REBIRTH_MAX)
      const owned = Array.isArray(d.ownedStones) ? d.ownedStones.filter((id) => typeof id === 'string') : s.ownedStones
      const ownedStones = owned.includes('pebble') ? owned : ['pebble', ...owned]
      return derive({
        ...s,
        rebirths,
        skill: clamp(num(d.skill, s.skill), SKILL_MIN, skillCap(rebirths)),
        wins: Math.max(0, num(d.wins, s.wins)),
        bestSkips: Math.max(0, num(d.bestSkips, s.bestSkips)),
        ownedStones,
        equippedStone: ownedStones.includes(d.equippedStone) ? d.equippedStone : 'pebble',
      })
    }),

  // Pets: each is owned at most once, up to MAX_EQUIPPED_PETS equipped; equipped
  // multipliers are added onto the skill multiplier (see addSkill).
  ownedPets: [],
  equippedPets: [],
  autoHatch: false,
  addPets: (names, cost) =>
    set((s) => ({ wins: s.wins - cost, ownedPets: [...s.ownedPets, ...names.filter((n) => !s.ownedPets.includes(n))] })),
  equipPet: (name) =>
    set((s) =>
      !s.ownedPets.includes(name) || s.equippedPets.includes(name) || s.equippedPets.length >= MAX_EQUIPPED_PETS
        ? s
        : { equippedPets: [...s.equippedPets, name] },
    ),
  unequipPet: (name) => set((s) => ({ equippedPets: s.equippedPets.filter((n) => n !== name) })),
  setAutoHatch: (on) => set({ autoHatch: on }),

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
