import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three'
import {
  ADMIN_BOARD,
  CHECKER,
  LEADER_BRIDGE,
  LEADER_COURT,
  LEADER_MOAT,
  LEADERBOARDS,
  PATH_TOP,
  WATERFALL,
} from '../data/world.js'
import { legoMaterial, PALETTE } from '../materials/lego.js'
import { LABEL_FONT, makeLabelTexture } from '../utils/labelCanvas.js'
import { seededRandom } from '../utils/random.js'
import Label, { useFontsReady } from './Label.jsx'

const NAMES = [
  'SkipKing_77', 'PebblePro', 'xXSplashXx', 'RippleRush', 'LakeLegend', 'StoneWizard',
  'BounceBoss', 'AquaAce', 'FlickMaster', 'TidalTom', 'SkimQueen', 'PondHopper',
]

function statValue(stat, rank) {
  const f = 1 / (1 + rank * 0.45)
  switch (stat) {
    case 'level':
      return String(Math.round(9800 * f))
    case 'time':
      return `${Math.round(1480 * f)}h ${(rank * 17) % 60}m`
    case 'robux':
      return `R$ ${Math.round(245000 * f).toLocaleString('en-US')}`
    default:
      return `${(98.4 * f).toFixed(1)}M`
  }
}

function makeBoardCanvas(stat, seed, fontsReady) {
  const W = 512
  const H = 400
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#17692a'
  ctx.fillRect(0, 0, W, H)
  const rows = 10
  const top = 36
  const rowH = (H - top - 8) / rows
  ctx.fillStyle = '#0f5220'
  ctx.fillRect(0, 0, W, top)
  ctx.font = `${fontsReady ? '' : 'bold '}20px ${LABEL_FONT}`
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#b8f5c4'
  ctx.fillText('#', 16, top / 2)
  ctx.fillText('Player', 64, top / 2)
  ctx.textAlign = 'right'
  ctx.fillText('Value', W - 16, top / 2)
  for (let i = 0; i < rows; i++) {
    const y = top + i * rowH
    ctx.fillStyle = i % 2 ? '#1c7a33' : '#22903d'
    ctx.fillRect(6, y + 2, W - 12, rowH - 4)
    ctx.fillStyle = i === 0 ? '#ffd84a' : i === 1 ? '#e6eef5' : i === 2 ? '#f0a35e' : '#ffffff'
    ctx.textAlign = 'left'
    ctx.fillText(`${i + 1}`, 16, y + rowH / 2)
    ctx.fillStyle = '#ffffff'
    ctx.fillText(NAMES[(i + seed * 5) % NAMES.length], 64, y + rowH / 2)
    ctx.textAlign = 'right'
    ctx.fillStyle = '#d9ffe0'
    ctx.fillText(statValue(stat, i), W - 16, y + rowH / 2)
  }
  return canvas
}

function Leaderboard({ board, index }) {
  const fontsReady = useFontsReady()
  const texture = useMemo(() => {
    const t = new CanvasTexture(makeBoardCanvas(board.stat, index, fontsReady))
    t.colorSpace = SRGBColorSpace
    t.anisotropy = 4
    return t
  }, [board, index, fontsReady])
  useEffect(() => () => texture.dispose(), [texture])

  const wood = legoMaterial({ top: '#c98a4b', side: PALETTE.wood, stud: 0.3 })
  const roof = legoMaterial({ top: '#8fe853', side: '#5fd12a', stud: 0.3 })
  const beam = legoMaterial({ top: '#8a4b25', side: '#6e3a1c', stud: 0.3 })
  const bush = legoMaterial({ top: PALETTE.leafLight, side: PALETTE.leaf, stud: 0.35 })
  const W = 6.4
  const H = 5
  const base = LEADER_COURT.top

  return (
    <group position={[board.x, base, board.z]} rotation={[0, board.rot, 0]}>
      {[-W / 2 - 0.25, W / 2 + 0.25].map((x) => (
        <mesh key={x} position={[x, 3.4, 0]} material={wood} castShadow receiveShadow>
          <boxGeometry args={[0.5, 6.8, 0.5]} />
        </mesh>
      ))}
      <mesh position={[0, 6.75, 0]} material={beam} castShadow>
        <boxGeometry args={[W + 1.4, 0.5, 1]} />
      </mesh>
      <mesh position={[0, 7.1, 0]} material={roof} castShadow>
        <boxGeometry args={[W + 1.2, 0.2, 1.1]} />
      </mesh>
      {[-2.6, -0.4, 1.9].map((x) => (
        <mesh key={x} position={[x, 7.35, -0.1]} material={bush} castShadow>
          <boxGeometry args={[0.7, 0.4, 0.6]} />
        </mesh>
      ))}
      {[-W / 2 - 0.4, W / 2 + 0.4].map((x) => (
        <mesh key={x} position={[x, 0.35, 0.45]} material={bush} castShadow>
          <boxGeometry args={[0.9, 0.7, 0.8]} />
        </mesh>
      ))}
      <mesh position={[0, 1.15, 0]} material={wood} castShadow>
        <boxGeometry args={[W + 0.2, 0.3, 0.4]} />
      </mesh>
      <mesh position={[0, 1.3 + H / 2, 0]} material={wood} castShadow receiveShadow>
        <boxGeometry args={[W + 0.2, H + 0.2, 0.2]} />
      </mesh>
      <mesh position={[0, 1.3 + H / 2, 0.11]}>
        <planeGeometry args={[W, H]} />
        <meshStandardMaterial map={texture} roughness={0.9} emissive="#ffffff" emissiveMap={texture} emissiveIntensity={0.25} />
      </mesh>
      <TitleSign text={board.title} y={7.3} maxWidth={W + 0.4} />
    </group>
  )
}

// A board's title, painted flat along its top and facing the same way as
// the board (not a camera-facing billboard). Long titles shrink to fit the
// board so neighbouring back-wall titles don't run together.
function TitleSign({ text, y, maxWidth }) {
  const fontsReady = useFontsReady()
  const label = useMemo(
    () => makeLabelTexture([{ text, size: 1, fill: '#ffffff', italic: true, stroke: '#27425c', strokeWidth: 0.14 }]),
    [text, fontsReady], // eslint-disable-line react-hooks/exhaustive-deps
  )
  useEffect(() => () => label.texture.dispose(), [label])
  const k = Math.min(1, maxWidth / label.width)
  return (
    <mesh position={[0, y + (label.height * k) / 2, 0.15]} rotation={[-0.15, 0, 0]}>
      <planeGeometry args={[label.width * k, label.height * k]} />
      <meshBasicMaterial map={label.texture} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  )
}

function makeFallCanvas() {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 256
  const ctx = canvas.getContext('2d')
  const g = ctx.createLinearGradient(0, 0, 128, 0)
  g.addColorStop(0, '#2aa8ff')
  g.addColorStop(0.5, '#5fd8ff')
  g.addColorStop(1, '#2aa8ff')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 128, 256)
  for (let i = 0; i < 40; i++) {
    const x = (i * 37) % 128
    const y = (i * 71) % 256
    ctx.fillStyle = `rgba(255,255,255,${0.35 + ((i * 13) % 10) / 20})`
    ctx.fillRect(x, y, 3 + (i % 3) * 2, 40 + (i % 5) * 18)
  }
  return canvas
}

// Glowing blue waterfall down the north cliff behind the back boards, with
// a bright column of light and a splash where it meets the moat.
function Waterfall() {
  const texture = useMemo(() => {
    const t = new CanvasTexture(makeFallCanvas())
    t.colorSpace = SRGBColorSpace
    t.wrapS = t.wrapT = RepeatWrapping
    t.repeat.set(3, 4)
    return t
  }, [])
  useEffect(() => () => texture.dispose(), [texture])

  useFrame((_s, dt) => {
    texture.offset.y = (texture.offset.y + dt * 0.9) % 1
  })

  const { x0, x1, z, bottom, top } = WATERFALL
  const w = x1 - x0
  const h = top - bottom
  const cx = (x0 + x1) / 2

  return (
    <group>
      <mesh position={[cx, bottom + h / 2, z + 0.2]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial map={texture} emissive="#4fd0ff" emissiveMap={texture} emissiveIntensity={0.9} roughness={0.2} />
      </mesh>
      <mesh position={[cx, bottom + h / 2, z + 1.2]}>
        <planeGeometry args={[w + 3, h]} />
        <meshBasicMaterial color="#7fe3ff" transparent opacity={0.28} blending={AdditiveBlending} depthWrite={false} />
      </mesh>
      {/* splash */}
      <mesh position={[cx, bottom + 0.02, z + 1.4]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w + 1, 2.4]} />
        <meshStandardMaterial color="#61d6ff" emissive="#9fe8ff" emissiveIntensity={0.6} transparent opacity={0.9} />
      </mesh>
      <mesh position={[cx, bottom + 0.8, z + 1.8]}>
        <planeGeometry args={[w + 1, 1.6]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.35} blending={AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  )
}

function Box({ x0, x1, z0, z1, y0 = -0.1, y1, material, cast = false }) {
  return (
    <mesh position={[(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2]} material={material} castShadow={cast} receiveShadow>
      <boxGeometry args={[x1 - x0, y1 - y0, z1 - z0]} />
    </mesh>
  )
}

// The moat ringing the courtyard: a shallow cyan channel over a blue bed,
// lined with blue-gray stone blocks, with a few lily pads. The waterfall
// feeds its north arm.
function buildMoatRocks() {
  const rand = seededRandom(41)
  const rocks = [] // [x, z, w, h, d]
  const { x0, x1, z0, z1 } = LEADER_MOAT
  const edge = (from, to, fixed, alongX) => {
    for (let a = from; a < to; a += 1.8 + rand() * 1.4) {
      const w = 1.2 + rand() * 1.4
      const h = 0.35 + rand() * 0.9
      const d = 1 + rand() * 1.2
      if (alongX) rocks.push([a, fixed, w, h, d])
      else rocks.push([fixed, a, d, h, w])
    }
  }
  // Outer banks: west, east, and the south arm either side of the bridge.
  edge(z0 + 2, z1, x0 + 0.4, false)
  edge(z0 + 2, z1, x1 - 0.4, false)
  edge(x0 + 1, LEADER_BRIDGE.x0 - 1, z1 - 0.4, true)
  edge(LEADER_BRIDGE.x1 + 1.5, x1, z1 - 0.4, true)
  // Blocks at the courtyard's corners, half in the water.
  for (const [x, z] of [
    [LEADER_COURT.x0, LEADER_COURT.z1],
    [LEADER_COURT.x1, LEADER_COURT.z1],
    [LEADER_COURT.x0, LEADER_COURT.z0],
    [LEADER_COURT.x1, LEADER_COURT.z0],
  ]) {
    rocks.push([x, z, 1.8, 0.9 + rand() * 0.5, 1.6])
  }
  return rocks
}

function Moat() {
  const bed = legoMaterial({ top: '#2f93cc' })
  const water = legoMaterial({
    top: '#4fd6ff',
    emissive: '#2fb8ff',
    emissiveIntensity: 0.35,
    roughness: 0.15,
    studStrength: 0.25,
    transparent: true,
    opacity: 0.85,
  })
  const rock = legoMaterial({ top: '#d3dce8', side: '#aeb9ca', stud: 0.45 })
  const lily = legoMaterial({ top: '#3fbf3a', studStrength: 0 })
  const rocks = useMemo(buildMoatRocks, [])
  const { x0, x1, z0, z1, y } = LEADER_MOAT

  return (
    <group>
      <Box x0={x0} x1={x1} z0={z0} z1={z1} y1={0.02} material={bed} />
      <mesh position={[(x0 + x1) / 2, y, (z0 + z1) / 2]} rotation={[-Math.PI / 2, 0, 0]} material={water}>
        <planeGeometry args={[x1 - x0, z1 - z0]} />
      </mesh>
      {rocks.map(([x, z, w, h, d], i) => (
        <mesh key={i} position={[x, h / 2 - 0.05, z]} material={rock} castShadow receiveShadow>
          <boxGeometry args={[w, h + 0.1, d]} />
        </mesh>
      ))}
      {[
        [-2, -40],
        [-1.5, -33],
        [20, -36],
        [19.8, -29],
        [2.5, -28.8],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, y + 0.02, z]} material={lily}>
          <cylinderGeometry args={[0.45, 0.45, 0.04, 14, 1, false, 0.4, Math.PI * 1.75]} />
        </mesh>
      ))}
    </group>
  )
}

function makeAdminCanvas(fontsReady) {
  const canvas = document.createElement('canvas')
  canvas.width = 640
  canvas.height = 400
  const ctx = canvas.getContext('2d')
  const sky = ctx.createLinearGradient(0, 0, 0, 400)
  sky.addColorStop(0, '#3fa2ff')
  sky.addColorStop(0.6, '#9fe0ff')
  sky.addColorStop(0.6, '#22b3e8')
  sky.addColorStop(1, '#1a86c9')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, 640, 400)
  // splash ripples
  ctx.strokeStyle = 'rgba(255,255,255,0.8)'
  ctx.lineWidth = 5
  for (const [x, r] of [[330, 40], [440, 30], [530, 22]]) {
    ctx.beginPath()
    ctx.ellipse(x, 320, r, r * 0.3, 0, 0, Math.PI * 2)
    ctx.stroke()
  }
  // skipping stone
  ctx.fillStyle = '#6d7480'
  ctx.beginPath()
  ctx.ellipse(560, 280, 36, 14, -0.2, 0, Math.PI * 2)
  ctx.fill()
  // cartoon thrower
  ctx.fillStyle = '#ffcc99'
  ctx.beginPath()
  ctx.arc(120, 150, 52, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#e03a2f'
  ctx.fillRect(68, 90, 104, 30)
  ctx.fillStyle = '#111'
  ctx.beginPath()
  ctx.arc(104, 150, 7, 0, Math.PI * 2)
  ctx.arc(138, 150, 7, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#2f5fe0'
  ctx.fillRect(80, 200, 80, 110)

  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.lineJoin = 'round'
  ctx.font = `${fontsReady ? '' : 'bold '}92px ${LABEL_FONT}`
  ctx.save()
  ctx.translate(390, 120)
  ctx.rotate(-0.12)
  ctx.lineWidth = 18
  ctx.strokeStyle = '#ffe23a'
  ctx.strokeText('ADMIN', 0, -40)
  ctx.strokeText('ABUSE', 0, 50)
  ctx.fillStyle = '#e8261f'
  ctx.fillText('ADMIN', 0, -40)
  ctx.fillText('ABUSE', 0, 50)
  ctx.restore()
  return canvas
}

// Countdown shown over the admin board, ticking down from 5d 01h 16m.
const ADMIN_EVENT_AT = Date.now() + ((5 * 24 + 1) * 60 + 16) * 60 * 1000 + 30 * 1000

function formatCountdown(ms) {
  const mins = Math.max(0, Math.floor(ms / 60000))
  const d = Math.floor(mins / 1440)
  const h = Math.floor((mins % 1440) / 60)
  const m = mins % 60
  return `ADMIN ABUSE IN ${d}D ${String(h).padStart(2, '0')}H ${String(m).padStart(2, '0')}M`
}

function AdminBoard() {
  const fontsReady = useFontsReady()
  const [countdown, setCountdown] = useState(() => formatCountdown(ADMIN_EVENT_AT - Date.now()))
  useEffect(() => {
    const id = setInterval(() => setCountdown(formatCountdown(ADMIN_EVENT_AT - Date.now())), 5000)
    return () => clearInterval(id)
  }, [])

  const texture = useMemo(() => {
    const t = new CanvasTexture(makeAdminCanvas(fontsReady))
    t.colorSpace = SRGBColorSpace
    t.anisotropy = 4
    return t
  }, [fontsReady])
  useEffect(() => () => texture.dispose(), [texture])

  const wood = legoMaterial({ top: '#b97a3e', side: PALETTE.wood, stud: 0.3 })
  const W = 5.6
  const H = 3.5

  return (
    <group position={[ADMIN_BOARD.x, 0, ADMIN_BOARD.z]} rotation={[0, ADMIN_BOARD.rot, 0]}>
      {[-W / 2 - 0.2, W / 2 + 0.2].map((x) => (
        <mesh key={x} position={[x, 2.4, 0]} material={wood} castShadow>
          <boxGeometry args={[0.45, 4.8, 0.45]} />
        </mesh>
      ))}
      <mesh position={[0, 1.2 + H / 2, 0]} material={wood} castShadow receiveShadow>
        <boxGeometry args={[W + 0.6, H + 0.6, 0.3]} />
      </mesh>
      <mesh position={[0, 1.2 + H / 2, 0.16]}>
        <planeGeometry args={[W, H]} />
        <meshStandardMaterial map={texture} emissive="#ffffff" emissiveMap={texture} emissiveIntensity={0.2} roughness={0.8} />
      </mesh>
      <Label position={[-0.6, 5.15, 0]} lines={[{ text: countdown, size: 0.3, fill: '#ffffff', strokeWidth: 0.24 }]} />
    </group>
  )
}

export default function Leaderboards() {
  const court = legoMaterial({ top: '#e2e8f0', top2: '#c9d2de', side: PALETTE.stoneDark, checker: CHECKER })
  const bridge = legoMaterial({ top: PALETTE.path, top2: PALETTE.path2, side: PALETTE.pathEdge, checker: CHECKER })

  return (
    <group>
      <Box {...LEADER_COURT} y1={LEADER_COURT.top} material={court} cast />
      <Box {...LEADER_BRIDGE} y1={LEADER_BRIDGE.top} material={bridge} />
      <Box {...LEADER_BRIDGE} z0={LEADER_MOAT.z1} y0={-0.1} y1={PATH_TOP + 0.02} material={bridge} />
      {LEADERBOARDS.map((b, i) => (
        <Leaderboard key={b.title} board={b} index={i} />
      ))}
      <Moat />
      <Waterfall />
      <AdminBoard />
    </group>
  )
}
