// Multiplayer / netcode tunables. The game is single-player-complete: nothing
// in systems/net.js gates gameplay, and a slow or absent server degrades to
// solo play (same stance as systems/bloxity.js).

// Stone-Skipping-backend deploys to two Bloxity Legion channels (`dev` branch
// -> dev, `main` -> prod), each with its own hostname, so the two URLs come
// from separate env vars and Vite's MODE picks one at build time. A local
// `npm start` in Stone-Skipping-backend listens on ws://localhost:2567, so
// that's the dev fallback.
export const SERVER_URL_DEV = import.meta.env.VITE_SERVER_URL_DEV || 'ws://localhost:2567'
// Empty = no prod server configured yet; systems/net.js then stays solo.
export const SERVER_URL_MAIN = import.meta.env.VITE_SERVER_URL_MAIN || ''
export const SERVER_URL = import.meta.env.MODE === 'production' ? SERVER_URL_MAIN : SERVER_URL_DEV

// Room handler name registered in Stone-Skipping-backend's app.config.ts.
export const ROOM_NAME = 'lobby'

// One join attempt is abandoned after this long (covers a cold host boot).
export const JOIN_TIMEOUT_MS = 45_000

// Backoff between connect attempts; clamps to the last entry.
export const RETRY_BACKOFF_MS = [3_000, 6_000, 12_000, 20_000, 30_000]

// Ceiling on `move` packets (position/yaw/gait). reportLocal() also skips a
// send when nothing changed, so this is a ceiling, not a fixed tick.
export const MOVE_SEND_INTERVAL_MS = 80

// Debounces for the live stats (leaderboards) and the durable save (Mongo).
export const STATS_RESEND_DEBOUNCE_MS = 1_000
export const PROGRESS_RESEND_DEBOUNCE_MS = 3_000

// Wait this long for Bloxity auth to settle before the first connect, so a
// signed-in player joins under their real userId instead of as a guest.
export const USERNAME_WAIT_MS = 8_000
