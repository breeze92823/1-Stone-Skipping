import { CanvasTexture, SRGBColorSpace } from 'three'

// Draws Roblox-BillboardGui-style labels: chunky rounded text with a thick
// black outline, optional gradient fills, inline icons and dark pills.
//
// A label is a list of lines; each line is either { text, ... } or
// { parts: [{ text } | { icon }], ... }. Sizes are in metres of world height
// so labels read consistently next to each other.
//
//   line:  { size, fill?, pill?, italic?, parts | text }
//   part:  { text, fill? } | { icon: 'trophy' | 'robux' | 'rebirth' | 'bolt' | 'palm', color? }
//   fill:  CSS colour | [top, bottom] vertical gradient | 'rainbow'
export const LABEL_FONT = '"Fredoka One", "Arial Rounded MT Bold", "Trebuchet MS", sans-serif'
const RES = 110 // canvas px per metre
const LINE_GAP = 0.18 // x line size
const MAX_CANVAS = 2048

let fontsReady = false
const fontListeners = new Set()
if (typeof document !== 'undefined' && document.fonts) {
  document.fonts
    .load(`64px ${LABEL_FONT}`)
    .catch(() => {})
    .then(() => {
      fontsReady = true
      fontListeners.forEach((fn) => fn())
    })
} else {
  fontsReady = true
}

export function onFontsReady(fn) {
  if (fontsReady) return () => {}
  fontListeners.add(fn)
  return () => fontListeners.delete(fn)
}

export function areFontsReady() {
  return fontsReady
}

function lineHeight(line, px) {
  return px * (1 + LINE_GAP) + (line.pill ? px * 0.3 : 0)
}

function fontFor(px, italic) {
  return `${italic ? 'italic ' : ''}${px}px ${LABEL_FONT}`
}

function partsOf(line) {
  return line.parts ?? [{ text: line.text, fill: line.fill }]
}

function measureLine(ctx, line, scale) {
  const px = line.size * RES * scale
  ctx.font = fontFor(px, line.italic)
  let w = 0
  for (const part of partsOf(line)) {
    if (part.icon) w += px * 1.05
    else w += ctx.measureText(part.text).width
    w += px * 0.12
  }
  w -= px * 0.12
  const pad = line.pill ? px * 0.55 : 0
  return { px, width: w + pad * 2 + px * 0.2, pad }
}

function makeFill(ctx, fill, x0, x1, yTop, yBottom) {
  if (fill === 'rainbow') {
    const g = ctx.createLinearGradient(x0, 0, x1, 0)
    const stops = ['#ff3b3b', '#ff9a1f', '#ffe433', '#3dec5b', '#28c8ff', '#4a6bff', '#c23dff']
    stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c))
    return g
  }
  if (Array.isArray(fill)) {
    const g = ctx.createLinearGradient(0, yTop, 0, yBottom)
    fill.forEach((c, i) => g.addColorStop(i / (fill.length - 1), c))
    return g
  }
  return fill ?? '#ffffff'
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

export function drawIcon(ctx, icon, cx, cy, s, color) {
  ctx.save()
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  const lw = s * 0.1
  if (icon === 'trophy') {
    ctx.fillStyle = '#ffc21a'
    ctx.strokeStyle = '#1a1206'
    ctx.lineWidth = lw
    // handles
    ctx.beginPath()
    ctx.arc(cx - s * 0.3, cy - s * 0.12, s * 0.17, Math.PI * 0.5, Math.PI * 1.5)
    ctx.arc(cx + s * 0.3, cy - s * 0.12, s * 0.17, Math.PI * 1.5, Math.PI * 0.5)
    ctx.stroke()
    // cup
    ctx.beginPath()
    ctx.moveTo(cx - s * 0.32, cy - s * 0.36)
    ctx.lineTo(cx + s * 0.32, cy - s * 0.36)
    ctx.quadraticCurveTo(cx + s * 0.3, cy + s * 0.12, cx, cy + s * 0.14)
    ctx.quadraticCurveTo(cx - s * 0.3, cy + s * 0.12, cx - s * 0.32, cy - s * 0.36)
    ctx.fill()
    ctx.stroke()
    // stem + base
    ctx.fillRect(cx - s * 0.06, cy + s * 0.12, s * 0.12, s * 0.16)
    roundRect(ctx, cx - s * 0.22, cy + s * 0.26, s * 0.44, s * 0.14, s * 0.04)
    ctx.fill()
    ctx.stroke()
  } else if (icon === 'robux') {
    const hex = (r) => {
      ctx.beginPath()
      for (let i = 0; i < 6; i++) {
        const a = Math.PI / 6 + (i * Math.PI) / 3
        ctx[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * r, cy + Math.sin(a) * r)
      }
      ctx.closePath()
    }
    ctx.strokeStyle = '#111'
    ctx.lineWidth = s * 0.3
    hex(s * 0.36)
    ctx.stroke()
    ctx.strokeStyle = color ?? '#e9edf2'
    ctx.lineWidth = s * 0.13
    hex(s * 0.36)
    ctx.stroke()
    ctx.fillStyle = color ?? '#e9edf2'
    ctx.fillRect(cx - s * 0.09, cy - s * 0.09, s * 0.18, s * 0.18)
  } else if (icon === 'rebirth') {
    const g = ctx.createLinearGradient(cx - s / 2, cy - s / 2, cx + s / 2, cy + s / 2)
    g.addColorStop(0, '#ff3d8b')
    g.addColorStop(0.5, '#ff7ab8')
    g.addColorStop(0.5, '#3aa5ff')
    g.addColorStop(1, '#2a6cff')
    ctx.fillStyle = g
    ctx.strokeStyle = '#111'
    ctx.lineWidth = lw
    ctx.beginPath()
    ctx.arc(cx, cy, s * 0.42, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = s * 0.1
    ctx.beginPath()
    ctx.arc(cx, cy, s * 0.22, Math.PI * 0.15, Math.PI * 1.35)
    ctx.stroke()
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.moveTo(cx + s * 0.28, cy - s * 0.02)
    ctx.lineTo(cx + s * 0.12, cy + s * 0.02)
    ctx.lineTo(cx + s * 0.25, cy + s * 0.18)
    ctx.closePath()
    ctx.fill()
  } else if (icon === 'palm') {
    // Leaning trunk with a spray of fronds, like the 🌴 in the Palm Beach sign.
    ctx.strokeStyle = '#111'
    ctx.lineWidth = s * 0.2
    ctx.beginPath()
    ctx.moveTo(cx - s * 0.05, cy + s * 0.46)
    ctx.quadraticCurveTo(cx + s * 0.12, cy + s * 0.05, cx - s * 0.02, cy - s * 0.22)
    ctx.stroke()
    ctx.strokeStyle = '#b8793a'
    ctx.lineWidth = s * 0.1
    ctx.stroke()
    const fronds = [-2.6, -2.0, -1.2, -0.5, 0.2]
    for (const a of fronds) {
      const ex = cx + Math.cos(a) * s * 0.42
      const ey = cy - s * 0.22 + Math.sin(a) * s * 0.3 + s * 0.12
      ctx.beginPath()
      ctx.moveTo(cx - s * 0.02, cy - s * 0.22)
      ctx.quadraticCurveTo((cx + ex) / 2, cy - s * 0.46, ex, ey)
      ctx.strokeStyle = '#111'
      ctx.lineWidth = s * 0.17
      ctx.stroke()
      ctx.strokeStyle = '#3fcf45'
      ctx.lineWidth = s * 0.08
      ctx.stroke()
    }
  } else if (icon === 'bolt') {
    ctx.fillStyle = color ?? '#ffcf1f'
    ctx.strokeStyle = '#111'
    ctx.lineWidth = lw
    ctx.beginPath()
    ctx.moveTo(cx + s * 0.12, cy - s * 0.46)
    ctx.lineTo(cx - s * 0.26, cy + s * 0.06)
    ctx.lineTo(cx - s * 0.02, cy + s * 0.06)
    ctx.lineTo(cx - s * 0.12, cy + s * 0.46)
    ctx.lineTo(cx + s * 0.28, cy - s * 0.08)
    ctx.lineTo(cx + s * 0.04, cy - s * 0.08)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  }
  ctx.restore()
}

// Renders `lines` into a canvas and returns it with its size in metres.
export function drawLabel(lines, canvas = document.createElement('canvas')) {
  const ctx = canvas.getContext('2d')

  // Shrink everything uniformly if the widest line would blow past the
  // canvas limit.
  let scale = 1
  let metrics = lines.map((l) => measureLine(ctx, l, scale))
  const widest = Math.max(...metrics.map((m) => m.width))
  if (widest > MAX_CANVAS) {
    scale = MAX_CANVAS / widest
    metrics = lines.map((l) => measureLine(ctx, l, scale))
  }

  const width = Math.ceil(Math.max(...metrics.map((m) => m.width)) + 8)
  const height = Math.ceil(metrics.reduce((h, m, i) => h + lineHeight(lines[i], m.px), 0) + 8)
  canvas.width = width
  canvas.height = height
  ctx.clearRect(0, 0, width, height)
  ctx.textBaseline = 'middle'
  ctx.lineJoin = 'round'

  let y = 4
  lines.forEach((line, i) => {
    const { px, width: lw, pad } = metrics[i]
    const lineH = lineHeight(line, px)
    const cy = y + lineH / 2
    let x = (width - lw) / 2 + px * 0.1

    if (line.pill) {
      ctx.fillStyle = line.pill
      ctx.strokeStyle = 'rgba(0,0,0,0.55)'
      ctx.lineWidth = px * 0.08
      roundRect(ctx, x, cy - px * 0.62, lw - px * 0.2, px * 1.24, px * 0.62)
      ctx.fill()
      ctx.stroke()
      x += pad
    }

    ctx.font = fontFor(px, line.italic)
    for (const part of partsOf(line)) {
      if (part.icon) {
        drawIcon(ctx, part.icon, x + px * 0.52, cy, px * 1.05, part.color)
        x += px * 1.05
      } else {
        const w = ctx.measureText(part.text).width
        ctx.strokeStyle = line.stroke ?? '#0d0d0d'
        ctx.lineWidth = px * (line.strokeWidth ?? 0.2)
        ctx.strokeText(part.text, x, cy)
        ctx.fillStyle = makeFill(ctx, part.fill ?? line.fill, x, x + w, cy - px / 2, cy + px / 2)
        ctx.fillText(part.text, x, cy)
        x += w
      }
      x += px * 0.12
    }
    y += lineH
  })

  return { canvas, width: width / RES, height: height / RES }
}

export function makeLabelTexture(lines) {
  const { canvas, width, height } = drawLabel(lines)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 4
  return { texture, width, height }
}
