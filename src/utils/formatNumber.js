// Compact number formatting: 1000 -> "1K", 1500000 -> "1.5M".
export function formatNumber(n) {
  const units = [
    [1e12, 'T'],
    [1e9, 'B'],
    [1e6, 'M'],
    [1e3, 'K'],
  ]
  for (const [v, u] of units) {
    if (n >= v) {
      const x = n / v
      return `${x >= 100 ? Math.floor(x) : Math.floor(x * 10) / 10}${u}`
    }
  }
  return String(Math.floor(n))
}
