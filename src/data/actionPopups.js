// Skill-gain popup tunables. Every throw that raises skill spawns one of these —
// the lightning-bolt icon with a "+N" readout — near the player. It springs in
// with an elastic pop, then sweeps down to the bottom-middle of the screen and
// fades. Simulated by systems/actionPopups.js, drawn by
// components/ActionPopups.jsx as DOM siblings of the canvas.

// Fixed pool — DOM nodes are created once and recycled round-robin.
export const ACTION_POPUP_POOL_SIZE = 14

// Seconds a popup stays on screen, from spawn to fully gone.
export const ACTION_POPUP_LIFETIME = 0.95

// Seconds spent fading in from 0 -> 1 opacity at the very start.
export const ACTION_POPUP_FADE_IN = 0.09

// Fraction of the lifetime spent on the spawn "pop" (elastic overshoot + hop).
export const ACTION_POPUP_POP_T = 0.24
export const ACTION_POPUP_POP_SCALE_FROM = 0.25
export const ACTION_POPUP_POP_OVERSHOOT = 2.4
export const ACTION_POPUP_HOP = 0.05

// Normalized lifetime point (0..1) at which the badge starts fading out.
export const ACTION_POPUP_FADE_OUT_START = 0.55

// World anchor: the player's feet raised this many metres (torso height).
export const ACTION_POPUP_ANCHOR_HEIGHT = 1.3

// Random scatter at spawn, in normalized-viewport units (viewport spans 2x2).
export const ACTION_POPUP_SPREAD_X = 0.16
export const ACTION_POPUP_SPREAD_Y = 0.12

// Travel: normalized device Y it lands on (-1 = bottom edge) and the fraction
// of its horizontal gap to screen centre that it closes.
export const ACTION_POPUP_TARGET_Y = -0.95
export const ACTION_POPUP_CENTER_PULL = 0.7

// Rendered icon width in CSS pixels (height auto).
export const ACTION_POPUP_IMAGE_SIZE = 64

// Font size of the "+N" readout, in CSS pixels.
export const ACTION_POPUP_FONT_SIZE = 40

// Public-root path to the icon art.
export const ACTION_POPUP_IMAGE_URL = '/ui/icons/icon-lightning-bolt.png'
