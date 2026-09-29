// Water splash effects: droplets that fly up and fall back, plus an expanding
// ring on the surface. Plain singleton arrays (not zustand) since they change
// every frame — Splashes.jsx reads them directly.
export const MAX_DROPS = 600
export const MAX_RINGS = 40

const GRAVITY = -14
const DROP_LIFE = 0.9
const RING_LIFE = 0.7

export const drops = [] // { x, y, z, vx, vy, vz, age, life, size }
export const rings = [] // { x, y, z, age, life, radius }

// `power` ~0.5 for a light skip up to ~1.5 for a stone sinking.
export function spawnSplash(x, y, z, power = 1) {
  const count = Math.round(10 + 14 * power)
  for (let i = 0; i < count; i++) {
    if (drops.length >= MAX_DROPS) drops.shift()
    const a = Math.random() * Math.PI * 2
    const out = (0.4 + Math.random() * 1.6) * power
    drops.push({
      x, y, z,
      vx: Math.cos(a) * out,
      vy: (2 + Math.random() * 3.5) * (0.6 + 0.6 * power),
      vz: Math.sin(a) * out,
      age: 0,
      life: DROP_LIFE * (0.7 + Math.random() * 0.6),
      size: (0.05 + Math.random() * 0.07) * (0.7 + 0.4 * power),
    })
  }
  if (rings.length >= MAX_RINGS) rings.shift()
  rings.push({ x, y, z, age: 0, life: RING_LIFE, radius: 0.6 + 0.9 * power })
}

export function step(dt) {
  for (let i = drops.length - 1; i >= 0; i--) {
    const d = drops[i]
    d.age += dt
    d.vy += GRAVITY * dt
    d.x += d.vx * dt
    d.y += d.vy * dt
    d.z += d.vz * dt
    if (d.age >= d.life) drops.splice(i, 1)
  }
  for (let i = rings.length - 1; i >= 0; i--) {
    rings[i].age += dt
    if (rings[i].age >= rings[i].life) rings.splice(i, 1)
  }
}
