import { create } from 'zustand'

// Lightweight, infrequently-changing game state for the HUD. The thrown
// stones' per-frame physics live in systems/stoneActions.js instead — that
// changes every frame and would thrash React if it lived here.
//
// Starting values match the reference screenshots (level 11, 7/10, 107 skill).
export const useGameStore = create((set) => ({
  skill: 107,
  level: 11,
  xp: 7,
  xpNeeded: 10,
  rebirths: 0,
  wins: 0,
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

  addSkill: (amount) => set((s) => ({ skill: s.skill + amount * s.multiplier })),
  addWins: (amount) => set((s) => ({ wins: s.wins + amount })),

  addXp: (amount) =>
    set((s) => {
      let xp = s.xp + amount
      let level = s.level
      while (xp >= s.xpNeeded) {
        xp -= s.xpNeeded
        level += 1
      }
      return { xp, level }
    }),
}))
