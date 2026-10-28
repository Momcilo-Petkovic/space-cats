// Space art for SPACE CATS: planet tiles, backgrounds, decorations, the rocket and the victory scene.
// Everything is drawn in code at the game's native 400x224 resolution, so it stays crisp pixel art.

import { TILE, makeCanvas, paint, rng, blob, drawText, textWidth } from './art.js'

// ---------------------------------------------------------------- color helpers

function hexToRgb(h) {
  const n = parseInt(h.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
export function shade(h, f) {
  const [r, g, b] = hexToRgb(h)
  const c = (v) => Math.max(0, Math.min(255, Math.round(f >= 0 ? v + (255 - v) * f : v * (1 + f))))
  return `rgb(${c(r)},${c(g)},${c(b)})`
}
export function rgba(h, a) {
  const [r, g, b] = hexToRgb(h)
  return `rgba(${r},${g},${b},${a})`
}

function canvasWith(w, h, fn) {
  const c = makeCanvas(w, h)
  const g = c.getContext('2d')
  const px = (x, y, col) => {
    g.fillStyle = col
    g.fillRect(x, y, 1, 1)
  }
  const rect = (x, y, ww, hh, col) => {
    g.fillStyle = col
    g.fillRect(x, y, ww, hh)
  }
  fn(px, rect, g)
  return c
}
const tile = (fn) => canvasWith(TILE, TILE, fn)

const LIQUIDS = {
  basalt: ['#ff7a1a', '#ffd06a', '#b03a08'],
  moss: ['#7dff3a', '#d8ffa0', '#2f9a10'],
  crystal: ['#ff4fd8', '#ffc0f4', '#a01a8a'],
  hull: ['#b03aff', '#e8b8ff', '#5a10a0'],
  default: ['#ff7a1a', '#ffd06a', '#b03a08'],
}

// ---------------------------------------------------------------- tiles

export function planetTiles(p, starImg, seed = 7) {
  const r = rng(seed)
  const [sL, sM, sD] = p.surface
  const [gM, gD, gL] = p.ground
  const [pM, pD, pL] = p.panel
  const [bM, bD, bL] = p.block
  const terrain = p.terrain

  const fill = (px, rect, from = 0) => {
    rect(0, from, 16, 16 - from, gM)
    for (let i = 0; i < 12; i++) px(Math.floor(r() * 16), from + Math.floor(r() * (16 - from)), r() < 0.5 ? gD : gL)
    if (terrain === 'basalt' && r() < 0.6) {
      const y = from + 4 + Math.floor(r() * 8)
      for (let x = 2; x < 10; x++) px(x + Math.floor(r() * 3), y + (x % 3 === 0 ? 1 : 0), '#ff7a1a')
    }
    if (terrain === 'metal' || terrain === 'hull') {
      rect(0, from, 16, 1, gL)
      rect(0, 15, 16, 1, gD)
      px(2, from + 2, gL); px(13, from + 2, gL); px(2, 13, gD); px(13, 13, gD)
    }
  }

  const top = tile((px, rect) => {
    fill(px, rect, 0)
    switch (terrain) {
      case 'craters':
        rect(0, 0, 16, 4, sM)
        rect(0, 0, 16, 1, sL)
        px(4, 2, sD); px(5, 2, sD); px(11, 1, sD); px(12, 2, sD)
        for (let x = 0; x < 16; x += 2) px(x, 4, sD)
        break
      case 'sand':
        rect(0, 0, 16, 5, sM)
        rect(0, 0, 16, 1, sL)
        for (let x = 0; x < 16; x++) px(x, 2 + ((x >> 2) % 2), sL)
        for (let x = 0; x < 16; x += 3) px(x, 5, sD)
        break
      case 'ice':
        rect(0, 0, 16, 5, sM)
        rect(0, 0, 16, 2, sL)
        px(3, 3, '#ffffff'); px(4, 2, '#ffffff'); px(11, 3, sD); px(12, 4, sD)
        for (let x = 0; x < 16; x++) if (x % 4 === 1) px(x, 5, sD)
        break
      case 'moss':
        rect(0, 0, 16, 4, sM)
        rect(0, 0, 16, 1, sL)
        for (let x = 0; x < 16; x++) {
          if (x % 3 === 0) px(x, 4, sM)
          if (x % 5 === 2) px(x, 5, sD)
        }
        px(6, 1, '#ffffff')
        break
      case 'rock':
        rect(0, 0, 16, 3, sM)
        rect(0, 0, 16, 1, sL)
        for (let x = 0; x < 16; x++) if ((x * 7) % 5 < 2) px(x, 3, sD)
        break
      case 'metal':
        rect(0, 0, 16, 5, sM)
        rect(0, 0, 16, 1, sL)
        for (let x = 0; x < 16; x += 4) rect(x, 1, 2, 3, x % 8 === 0 ? '#ffd23a' : '#2a2f3a')
        rect(0, 4, 16, 1, sD)
        break
      case 'basalt':
        rect(0, 0, 16, 3, sM)
        rect(0, 0, 16, 1, sL)
        px(5, 1, '#ff7a1a'); px(12, 2, '#ff7a1a')
        break
      case 'cloud':
        rect(0, 0, 16, 16, gM)
        for (let x = 0; x < 16; x++) {
          const h = 3 + Math.round(Math.sin(x * 0.8) * 1.5)
          rect(x, 0, 1, h, sL)
        }
        rect(0, 12, 16, 4, gD)
        break
      case 'crystal':
        rect(0, 0, 16, 4, sM)
        for (let x = 0; x < 16; x++) {
          const h = (x % 4 === 1 ? 3 : x % 4 === 2 ? 2 : 0)
          if (h) rect(x, -1 + (3 - h), 1, h, sL)
        }
        rect(0, 0, 16, 1, sL)
        rect(0, 4, 16, 1, sD)
        break
      case 'hull':
        rect(0, 0, 16, 3, gL)
        rect(0, 1, 16, 1, sM)
        for (let x = 1; x < 16; x += 5) px(x, 1, sL)
        break
      default:
        rect(0, 0, 16, 4, sM)
    }
  })
  const ground = tile((px, rect) => fill(px, rect, 0))

  const panel = tile((px, rect) => {
    rect(0, 0, 16, 16, pM)
    rect(0, 0, 16, 1, pL)
    rect(0, 0, 1, 16, pL)
    rect(0, 15, 16, 1, pD)
    rect(15, 0, 1, 16, pD)
    rect(0, 7, 16, 1, pD)
    rect(0, 8, 16, 1, pL)
    rect(7, 1, 1, 6, pD)
    rect(3, 9, 1, 6, pD)
    rect(11, 9, 1, 6, pD)
    px(3, 3, pL); px(12, 3, pL)
  })

  const block = tile((px, rect) => {
    rect(0, 0, 16, 16, bD)
    rect(1, 1, 14, 14, bM)
    rect(1, 1, 14, 1, bL)
    rect(1, 1, 1, 14, bL)
    rect(2, 7, 12, 2, bD)
    ;[[2, 2], [13, 2], [2, 13], [13, 13]].forEach(([x, y]) => px(x, y, bD))
  })

  const crumble = tile((px, rect) => {
    rect(0, 0, 16, 10, pM)
    rect(0, 0, 16, 1, pL)
    rect(0, 9, 16, 1, pD)
    ;[[3, 1], [4, 2], [4, 3], [5, 4], [11, 2], [10, 3], [10, 4], [11, 5], [7, 6], [8, 7]].forEach(([x, y]) => px(x, y, pD))
    for (let x = 1; x < 16; x += 3) px(x, 10 + (x % 2), pD)
  })

  // star block: glowing tech cube with the star silhouette
  const sil = makeCanvas(starImg.width, starImg.height)
  const sg = sil.getContext('2d')
  sg.drawImage(starImg, 0, 0)
  sg.globalCompositeOperation = 'source-in'
  sg.fillStyle = '#5a2a00'
  sg.fillRect(0, 0, sil.width, sil.height)
  const item = [0, 1, 2, 1].map((s) =>
    tile((px, rect, g) => {
      rect(0, 0, 16, 16, '#5a2a00')
      rect(1, 1, 14, 14, ['#ffb81a', '#ffcc3a', '#ffe070'][s])
      rect(1, 1, 14, 1, '#fff6c8')
      rect(1, 1, 1, 14, '#fff6c8')
      rect(14, 1, 1, 14, '#c88200')
      rect(1, 14, 14, 1, '#c88200')
      ;[[2, 2], [13, 2], [2, 13], [13, 13]].forEach(([x, y]) => px(x, y, '#5a2a00'))
      g.drawImage(sil, 3, 3, 10, 10)
    }),
  )
  const used = tile((px, rect) => {
    rect(0, 0, 16, 16, '#22222e')
    rect(1, 1, 14, 14, '#4a4a5e')
    rect(1, 1, 14, 1, '#6a6a80')
    ;[[2, 2], [13, 2], [2, 13], [13, 13]].forEach(([x, y]) => px(x, y, '#22222e'))
  })

  const [tM, tL, tD, tO] = p.tube
  const tube = (part) =>
    tile((px, rect) => {
      const left = part.endsWith('L')
      if (part.startsWith('T')) {
        rect(0, 0, 16, 16, tM)
        rect(0, 0, 16, 1, tO)
        rect(0, 15, 16, 1, tO)
        rect(0, 6, 16, 2, tD)
        if (left) {
          rect(0, 0, 1, 16, tO)
          rect(2, 2, 3, 12, tL)
          px(7, 3, '#ffffff')
        } else {
          rect(15, 0, 1, 16, tO)
          rect(10, 2, 4, 12, tD)
        }
      } else if (left) {
        rect(2, 0, 14, 16, tM)
        rect(2, 0, 1, 16, tO)
        rect(4, 0, 3, 16, tL)
        rect(2, 10, 14, 1, tD)
      } else {
        rect(0, 0, 14, 16, tM)
        rect(13, 0, 1, 16, tO)
        rect(8, 0, 4, 16, tD)
        rect(0, 10, 14, 1, tD)
      }
    })

  // bounce pad: base + spring top (two states: idle, squashed)
  const pad = (squash) =>
    tile((px, rect) => {
      rect(1, 11, 14, 5, '#3a3a4a')
      rect(1, 11, 14, 1, '#6a6a80')
      const topY = squash ? 8 : 3
      for (let y = topY + 3; y < 11; y++) rect(4 + (y % 2) * 2, y, 6, 1, '#b0b0c0')
      rect(0, topY, 16, 3, '#ff4f6a')
      rect(0, topY, 16, 1, '#ffb0bc')
      rect(2, topY + 1, 3, 1, '#ffffff')
    })

  const belt = (dir, f) =>
    tile((px, rect) => {
      rect(0, 0, 16, 16, '#2a2f3a')
      rect(0, 0, 16, 5, '#1a1d24')
      for (let x = 0; x < 16; x++) {
        const k = (x - dir * f * 2 + 64) % 8
        if (k < 3) px(x, 1, '#ffd23a')
        if (k < 3) px(x, 2, '#ffd23a')
      }
      rect(0, 4, 16, 1, '#5a6070')
      for (let x = 3; x < 16; x += 6) {
        rect(x - 2, 7, 5, 5, '#5a6070')
        px(x, 9, '#1a1d24')
      }
    })

  const oneway =
    terrain === 'cloud'
      ? tile((px, rect) => {
          for (let x = 0; x < 16; x++) {
            const h = 5 + Math.round(Math.sin(x * 0.9) * 1.5)
            rect(x, 1, 1, h, '#ffffff')
            rect(x, 1 + h, 1, 2, '#e2d4f8')
          }
          rect(0, 0, 16, 1, '#ffffff')
        })
      : tile((px, rect) => {
          rect(0, 0, 16, 3, sM)
          rect(0, 0, 16, 1, sL)
          for (let x = 1; x < 16; x += 3) rect(x, 3, 1, 3, sD)
          rect(0, 5, 16, 1, sD)
        })

  const [lM, lL, lD] = LIQUIDS[terrain] || LIQUIDS.default
  const lavaTop = [0, 1, 2, 3].map((f) =>
    tile((px, rect) => {
      rect(0, 3, 16, 13, lM)
      for (let x = 0; x < 16; x++) {
        const h = Math.round(Math.sin((x + f * 2) * 0.7) * 1.5)
        rect(x, 3 + h, 1, 2, lL)
      }
      px((f * 5) % 16, 9, lL)
      px((f * 5 + 8) % 16, 12, lD)
    }),
  )
  const lavaFill = [0, 1, 2, 3].map((f) =>
    tile((px, rect) => {
      rect(0, 0, 16, 16, lM)
      px((f * 3 + 2) % 16, (f * 5) % 16, lL)
      px((f * 7 + 9) % 16, (f * 3 + 6) % 16, lD)
    }),
  )

  return {
    top, ground, panel, block, crumble, item, used, belt: { l: [0, 1, 2, 3].map((f) => belt(-1, f)), r: [0, 1, 2, 3].map((f) => belt(1, f)) },
    tubeTL: tube('TL'), tubeTR: tube('TR'), tubeBL: tube('BL'), tubeBR: tube('BR'),
    pad: pad(false), padSquash: pad(true), oneway, lavaTop, lavaFill, liquid: lM, liquidLight: lL,
  }
}

// ---------------------------------------------------------------- items

export function canSprite() {
  return paint(
    [
      '.KKKKKKK.',
      'KSWWWWWSK',
      'KPPPPPPPK',
      'KPWWWWWPK',
      'KPWOOOWPK',
      'KPWOKOWPK',
      'KPWWWWWPK',
      'KPPPPPPPK',
      'KPPPPPPPK',
      'KSWWWWWSK',
      '.KKKKKKK.',
    ],
    { K: '#1b1430', S: '#c9d1dc', W: '#ffffff', P: '#8a3cff', O: '#ff9a3c' },
  )
}

export function meteorSprite() {
  return blob(12, 12, [[6, 6, 5]], '#8a6a5a', '#3a2a22', '#5a4438')
}

export function moverSprite(w) {
  return canvasWith(w * TILE, 10, (px, rect) => {
    rect(0, 0, w * TILE, 6, '#9aa6b8')
    rect(0, 0, w * TILE, 1, '#e0e6f0')
    rect(0, 5, w * TILE, 1, '#4a5466')
    for (let x = 3; x < w * TILE; x += 8) px(x, 2, '#4a5466')
    rect(3, 6, 4, 2, '#4a5466')
    rect(w * TILE - 7, 6, 4, 2, '#4a5466')
  })
}

// ---------------------------------------------------------------- decorations

export function decorSprite(kind, p) {
  const [sL, sM, sD] = p.surface
  switch (kind) {
    case 'antenna':
      return canvasWith(14, 34, (px, rect) => {
        rect(6, 6, 2, 28, '#9aa6b8')
        rect(2, 30, 10, 4, '#6a768a')
        rect(3, 10, 8, 1, '#9aa6b8')
        rect(4, 16, 6, 1, '#9aa6b8')
        rect(5, 0, 4, 4, '#ff3a3a')
        px(6, 1, '#ffd0d0')
      })
    case 'crystal':
      return canvasWith(24, 28, (px, rect) => {
        const spike = (x, w, h, col, hi) => {
          for (let y = 0; y < h; y++) {
            const half = Math.max(1, Math.round(((y + 1) / h) * (w / 2)))
            rect(x - half, 28 - h + y, half * 2, 1, col)
            px(x - half, 28 - h + y, hi)
          }
        }
        spike(7, 6, 18, sM, sL)
        spike(14, 8, 26, sL, '#ffffff')
        spike(19, 6, 14, sD, sM)
      })
    case 'mushroom':
      return canvasWith(30, 34, (px, rect, g) => {
        rect(13, 14, 4, 20, '#e8d8ff')
        rect(14, 14, 1, 20, '#ffffff')
        const cap = blob(30, 16, [[15, 16, 14]], '#ff5ac8', '#8a1a66', '#c8329a')
        g.drawImage(cap, 0, 0)
        ;[[8, 8], [17, 6], [22, 10], [12, 11]].forEach(([x, y]) => rect(x, y, 2, 2, '#ffe0f4'))
      })
    case 'rock':
      return blob(26, 16, [[9, 14, 8], [17, 15, 7]], sM, sD, sD)
    case 'vent':
      return canvasWith(18, 20, (px, rect) => {
        rect(3, 6, 12, 14, '#3a3030')
        rect(1, 4, 16, 3, '#5a4a48')
        rect(5, 8, 8, 2, '#ff7a1a')
        rect(4, 12, 10, 1, '#2a2020')
      })
    case 'dish':
      return canvasWith(26, 30, (px, rect) => {
        rect(12, 14, 3, 16, '#7f8ca3')
        rect(8, 27, 11, 3, '#46506a')
        for (let i = 0; i < 12; i++) rect(2 + i, 2 + Math.round(i * 0.7), 12 - i + 8, 1, i % 3 === 0 ? '#e0e6f0' : '#b5c0d4')
        rect(18, 0, 2, 9, '#46506a')
        px(19, 0, '#ff3a3a')
      })
    case 'icicle':
      return canvasWith(22, 22, (px, rect) => {
        const spike = (x, h) => {
          for (let y = 0; y < h; y++) {
            const half = Math.max(1, Math.round(((y + 1) / h) * 3))
            rect(x - half, 22 - h + y, half * 2, 1, y % 3 === 0 ? '#ffffff' : '#c9ecff')
          }
        }
        spike(5, 12)
        spike(11, 20)
        spike(17, 9)
      })
    default:
      return makeCanvas(1, 1)
  }
}

// ---------------------------------------------------------------- the rocket

const ROCKET_W = 32
const ROCKET_H = 58
export const ROCKET = { w: ROCKET_W, h: ROCKET_H, doorX: 10, doorY: 30, doorW: 12, doorH: 14 }

function rocketBody() {
  return canvasWith(ROCKET_W, ROCKET_H, (px, rect) => {
    const K = '#1b1430'
    // fins
    for (let y = 0; y < 18; y++) {
      const w = Math.round((y / 18) * 7)
      rect(8 - w, 34 + y, w, 1, '#e0483e')
      rect(24, 34 + y, w, 1, '#b02a22')
    }
    // body
    for (let y = 8; y < 52; y++) {
      const narrow = y < 14 ? Math.round((14 - y) * 0.8) : 0
      rect(8 + narrow, y, 16 - narrow * 2, 1, '#f2f4f8')
      rect(8 + narrow, y, 2, 1, '#ffffff')
      rect(20 - narrow, y, 4, 1, '#c9d1dc')
      px(7 + narrow, y, K)
      px(24 - narrow, y, K)
    }
    // nose cone
    for (let y = 0; y < 10; y++) {
      const half = Math.max(1, Math.round((y / 10) * 6))
      rect(16 - half, y, half * 2, 1, '#e0483e')
      px(16 - half, y, K)
      px(15 + half, y, K)
    }
    rect(8, 24, 16, 2, '#e0483e')
    // window
    for (let y = -4; y <= 4; y++) {
      for (let x = -4; x <= 4; x++) {
        const d = x * x + y * y
        if (d <= 20) px(16 + x, 17 + y, d >= 13 ? '#5a6474' : x + y < -2 ? '#b8ecff' : '#3ab0e8')
      }
    }
    // engine
    rect(11, 52, 10, 4, '#5a6474')
    rect(12, 56, 8, 2, '#3a4250')
    rect(8, 51, 16, 1, K)
  })
}

function rocketDoor(open) {
  return canvasWith(ROCKET.doorW, ROCKET.doorH, (px, rect) => {
    if (open) {
      rect(0, 0, ROCKET.doorW, ROCKET.doorH, '#1b1430')
      rect(1, 1, ROCKET.doorW - 2, ROCKET.doorH - 1, '#ffd27a')
      rect(1, 1, ROCKET.doorW - 2, 2, '#ffe9b0')
    } else {
      rect(0, 0, ROCKET.doorW, ROCKET.doorH, '#1b1430')
      rect(1, 1, ROCKET.doorW - 2, ROCKET.doorH - 2, '#dfe4ec')
      rect(ROCKET.doorW - 4, 6, 2, 2, '#5a6474')
    }
  })
}

const rocketParts = { body: null, doorOpen: null, doorClosed: null }
export function drawRocket(g, x, y, frame, { open = false, flame = 0 } = {}) {
  if (!rocketParts.body) {
    rocketParts.body = rocketBody()
    rocketParts.doorOpen = rocketDoor(true)
    rocketParts.doorClosed = rocketDoor(false)
  }
  const rx = Math.round(x)
  const ry = Math.round(y)
  if (flame > 0) {
    const len = Math.round(8 + flame * 18 + ((frame >> 1) % 3) * 3)
    for (let i = 0; i < len; i++) {
      const w = Math.max(1, Math.round(8 * (1 - i / len)))
      g.fillStyle = i < len * 0.3 ? '#ffffff' : i < len * 0.6 ? '#ffd23a' : '#ff7a1a'
      g.fillRect(rx + 16 - w, ry + ROCKET_H + i, w * 2, 1)
    }
  }
  g.drawImage(rocketParts.body, rx, ry)
  g.drawImage(open ? rocketParts.doorOpen : rocketParts.doorClosed, rx + ROCKET.doorX, ry + ROCKET.doorY)
}

// ---------------------------------------------------------------- backgrounds

function spiralGalaxy(w, h, seed) {
  const r = rng(seed)
  return canvasWith(w, h, (px) => {
    for (let i = 0; i < 900; i++) {
      const arm = i % 2
      const t = r() * 4.2
      const rad = t * (w / 9)
      const a = t * 1.6 + arm * Math.PI + (r() - 0.5) * 0.5
      const x = Math.round(w / 2 + Math.cos(a) * rad)
      const y = Math.round(h / 2 + Math.sin(a) * rad * 0.45)
      const c = t < 0.8 ? '#ffffff' : t < 2 ? '#ffd0f4' : r() < 0.5 ? '#9ab8ff' : '#ff9af0'
      if (x >= 0 && x < w && y >= 0 && y < h) px(x, y, c)
    }
  })
}

function silhouette(style, w, h, color, seed) {
  const r = rng(seed)
  return canvasWith(w, h, (px, rect) => {
    for (let x = 0; x < w; x++) {
      let top
      const t = x / w
      switch (style) {
        case 'craters':
          top = h * 0.55 + Math.sin(t * Math.PI * 4) * 6 - Math.max(0, Math.sin(t * Math.PI * 10)) * 5
          break
        case 'dunes':
          top = h * 0.5 + Math.sin(t * Math.PI * 3) * 12 + Math.sin(t * Math.PI * 7) * 4
          break
        case 'peaks':
          top = h * 0.25 + Math.abs(((t * 5) % 1) - 0.5) * h * 0.9 + r() * 2
          break
        case 'spires':
          top = h * 0.6 - (Math.sin(t * 37) > 0.85 ? h * 0.45 : 0) - Math.sin(t * Math.PI * 4) * 6
          break
        case 'crystals':
          top = h * 0.5 - Math.max(0, 1 - Math.abs(((t * 9) % 1) - 0.5) * 4) * h * 0.4
          break
        default:
          top = h
      }
      rect(x, Math.round(top), 1, h - Math.round(top), color)
    }
  })
}

// Pre-renders a planet's background layers, then draws them with parallax.
export class Backdrop {
  constructor(p, W, H, seed = 1) {
    this.p = p
    this.W = W
    this.H = H
    const r = rng(seed * 97 + 13)
    this.stars = [0, 1, 2].map((layer) =>
      Array.from({ length: Math.round([90, 50, 25][layer] * (p.stars ?? 1)) }, () => [
        Math.floor(r() * 800), Math.floor(r() * H * 0.8), r(),
      ]),
    )
    if (p.nebula) {
      this.nebula = canvasWith(560, H, (px, rect, g) => {
        for (let i = 0; i < 7; i++) {
          const cx = r() * 560
          const cy = 20 + r() * (H * 0.6)
          const rad = 40 + r() * 70
          const grad = g.createRadialGradient(cx, cy, 0, cx, cy, rad)
          grad.addColorStop(0, rgba(p.nebula[i % p.nebula.length], 0.28))
          grad.addColorStop(1, rgba(p.nebula[i % p.nebula.length], 0))
          g.fillStyle = grad
          g.fillRect(0, 0, 560, H)
        }
      })
    }
    const land = p.land || {}
    if (land.style && land.style !== 'none') {
      this.far = silhouette(land.style, 480, 110, land.far, seed + 5)
      this.near = silhouette(land.style, 420, 80, land.near, seed + 9)
    }
    const k = p.planet || {}
    if (k.kind === 'galaxy') this.galaxy = spiralGalaxy(120, 70, seed)
    if (k.kind === 'moons') {
      this.moonBig = blob(k.r * 2 + 2, k.r * 2 + 2, [[k.r + 1, k.r + 1, k.r]], k.color, '#5a3a2a', shade(k.color, -0.2))
      this.moonSmall = blob(14, 14, [[7, 7, 6]], '#a88a74', '#5a3a2a', null)
    }
    if (k.kind === 'ringed') this.ringed = blob(k.r * 2 + 2, k.r * 2 + 2, [[k.r + 1, k.r + 1, k.r]], k.color, shade(k.color, -0.4), shade(k.color, -0.15))
    if (k.kind === 'asteroids') {
      this.rocks = Array.from({ length: 14 }, (_, i) => ({
        x: r() * 800, y: 20 + r() * 150, s: 6 + Math.floor(r() * 18), layer: i % 2,
        img: blob(26, 26, [[13, 13, 4 + r() * 8], [9 + r() * 8, 11 + r() * 4, 3 + r() * 5]], '#5a4c40', '#2a221c', '#43382f'),
      }))
    }
    if (k.kind === 'clouds') {
      this.cloudImgs = [0, 1, 2].map((i) =>
        blob(120, 40, [[25, 30, 18], [55, 22, 22], [85, 28, 18], [60, 34, 16]], ['#ffffff', '#ffe8f0', '#f4d8ff'][i], ['#f0d0e8', '#e8c0d8', '#d8b8f0'][i], null),
      )
    }
    if (k.kind === 'earth') {
      this.earth = canvasWith(k.r * 2 + 8, k.r * 2 + 8, (px) => {
        const R = k.r
        const c = R + 4
        for (let y = -R - 3; y <= R + 3; y++) {
          for (let x = -R - 3; x <= R + 3; x++) {
            const d = Math.sqrt(x * x + y * y)
            if (d > R && d <= R + 2) px(c + x, c + y, 'rgba(120,190,255,0.35)')
            if (d > R) continue
            const n = (a, b) => Math.sin(a * 0.21 + b * 0.07) + Math.sin(b * 0.27 - a * 0.11 + 1.7) + Math.sin((a + b) * 0.13 + 4.1)
            const land1 = n(x, y) > 0.9
            const cloud = n(x * 2.1 + 40, y * 1.3 - 17) > 1.75
            let col = land1 ? (n(x + 9, y) > 1.6 ? '#7a9a4a' : '#3fa34d') : '#2f6fd6'
            if (cloud) col = '#f4f8ff'
            const lit = (x + R * 0.45) * (x + R * 0.45) + (y + R * 0.45) * (y + R * 0.45) < R * R * 0.18
            if (lit && !cloud) col = land1 ? '#5cc46a' : '#4a8cf0'
            if (x > R * 0.35 && d > R * 0.55) col = cloud ? '#a8b4c8' : land1 ? '#25602e' : '#1d4690'
            px(c + x, c + y, col)
          }
        }
      })
    }
  }

  draw(g, cam, frame) {
    const { p, W, H } = this
    const k = p.planet || {}
    const sky = p.sky || ['#000000']
    const grad = g.createLinearGradient(0, 0, 0, H)
    sky.forEach((c, i) => grad.addColorStop(sky.length === 1 ? 0 : i / (sky.length - 1), c))
    g.fillStyle = grad
    g.fillRect(0, 0, W, H)

    if (k.kind === 'station' || k.kind === 'ship') {
      this.drawInterior(g, cam, frame, k.kind)
      return
    }

    // stars, three depths
    const speeds = [0.02, 0.05, 0.1]
    this.stars.forEach((layer, li) => {
      for (const [sx, sy, tw] of layer) {
        const x = Math.round((((sx - cam * speeds[li]) % 800) + 800) % 800)
        if (x >= W) continue
        const blink = (frame * 0.05 + tw * 10) % 6 < 5.5
        g.fillStyle = blink ? (li === 2 ? '#ffffff' : li === 1 ? '#d8e4ff' : '#9aa4c8') : '#4a5070'
        g.fillRect(x, sy, li === 2 && tw > 0.7 ? 2 : 1, li === 2 && tw > 0.7 ? 2 : 1)
      }
    })

    if (this.nebula) {
      const x = -Math.round((cam * 0.03) % 560)
      g.drawImage(this.nebula, x, 0)
      g.drawImage(this.nebula, x + 560, 0)
    }

    // big sky objects
    const drift = Math.round(cam * 0.015)
    if (k.kind === 'earth') g.drawImage(this.earth, k.x - drift, k.y - k.r)
    if (k.kind === 'moons') {
      g.drawImage(this.moonBig, k.x - drift, k.y)
      g.drawImage(this.moonSmall, k.x + 60 - drift, k.y + 22)
    }
    if (k.kind === 'ringed') {
      g.drawImage(this.ringed, k.x - k.r - drift, k.y - k.r)
      g.strokeStyle = k.ring
      g.lineWidth = 2
      g.beginPath()
      g.ellipse(k.x - drift + 1, k.y + 1, k.r * 1.9, k.r * 0.45, -0.25, 0, Math.PI * 2)
      g.stroke()
    }
    if (k.kind === 'sun') {
      const sg = g.createRadialGradient(k.x, k.y, 0, k.x, k.y, k.r * 2.6)
      sg.addColorStop(0, '#fff2c0')
      sg.addColorStop(0.25, '#ffb01a')
      sg.addColorStop(0.45, 'rgba(255,90,20,0.35)')
      sg.addColorStop(1, 'rgba(255,60,10,0)')
      g.fillStyle = sg
      g.fillRect(0, 0, W, H)
    }
    if (k.kind === 'galaxy') g.drawImage(this.galaxy, k.x - drift - 60, k.y - 35)
    if (k.kind === 'aurora') {
      for (let b = 0; b < 3; b++) {
        g.fillStyle = rgba(['#1de9b6', '#2979ff', '#b388ff'][b], 0.12)
        for (let x = 0; x < W; x += 2) {
          const y = 30 + b * 18 + Math.sin(x * 0.02 + frame * 0.01 + b) * 12
          g.fillRect(x, y, 2, 26 + Math.sin(x * 0.05 + b) * 8)
        }
      }
    }
    if (k.kind === 'asteroids') {
      for (const a of this.rocks) {
        const sp = a.layer ? 0.25 : 0.12
        const x = Math.round((((a.x - cam * sp + frame * 0.05 * (a.layer + 1)) % 800) + 800) % 800) - 30
        if (x > W) continue
        g.globalAlpha = a.layer ? 0.9 : 0.55
        g.drawImage(a.img, x, Math.round(a.y + Math.sin(frame * 0.01 + a.x) * 3), a.s, a.s)
        g.globalAlpha = 1
      }
    }
    if (k.kind === 'clouds') {
      for (let i = 0; i < 9; i++) {
        const sp = [0.1, 0.25, 0.45][i % 3]
        const x = Math.round((((i * 140 - cam * sp - frame * 0.1 * (1 + (i % 3))) % 900) + 900) % 900) - 120
        g.drawImage(this.cloudImgs[i % 3], x, 40 + (i % 3) * 45 + (i % 2) * 15)
      }
    }

    if (this.far) {
      const x = -Math.round((cam * 0.2) % 480)
      g.drawImage(this.far, x, H - 140)
      g.drawImage(this.far, x + 480, H - 140)
    }
    if (this.near) {
      const x = -Math.round((cam * 0.4) % 420)
      g.drawImage(this.near, x, H - 96)
      g.drawImage(this.near, x + 420, H - 96)
    }
  }

  drawInterior(g, cam, frame, kind) {
    const { W } = this
    const wall = kind === 'ship' ? ['#0c1a14', '#16302a', '#1e4436'] : ['#141a28', '#1e2738', '#2a354c']
    const off = -Math.round((cam * 0.5) % 96)
    for (let x = off - 96; x < W + 96; x += 96) {
      g.fillStyle = wall[1]
      g.fillRect(x, 32, 94, 160)
      g.fillStyle = wall[2]
      g.fillRect(x, 32, 94, 2)
      g.fillStyle = wall[0]
      g.fillRect(x + 94, 32, 2, 160)
      // window with stars
      const wx = x + 22
      const wy = 60
      g.fillStyle = '#05060f'
      if (kind === 'ship') {
        g.beginPath()
        g.arc(wx + 25, wy + 25, 22, 0, Math.PI * 2)
        g.fill()
      } else g.fillRect(wx, wy, 50, 40)
      for (let s = 0; s < 8; s++) {
        g.fillStyle = s % 3 ? '#9aa4c8' : '#ffffff'
        g.fillRect(wx + ((s * 17 + Math.floor(frame * 0.2)) % 46) + 2, wy + ((s * 11) % 36) + 4, 1, 1)
      }
      g.fillStyle = kind === 'ship' ? '#3ad07a' : '#5a6474'
      g.fillRect(x + 10, 150, 74, 3)
      g.fillStyle = (frame + x) % 120 < 60 ? (kind === 'ship' ? '#7affb0' : '#3ad0ff') : wall[2]
      g.fillRect(x + 80, 140, 4, 4)
    }
  }
}

// ---------------------------------------------------------------- the victory scene

function catPilot() {
  // a big orange tabby in a glass dome, holding a can of SPACE MEOW
  return canvasWith(64, 60, (px, rect, g) => {
    const K = '#1b1430'
    const O = '#ff9a3c'
    const o = '#d86a14'
    const W = '#fff4e6'
    const ellipse = (cx, cy, rx, ry, col) => {
      for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) if ((x * x) / (rx * rx) + (y * y) / (ry * ry) <= 1) px(cx + x, cy + y, col)
    }
    // ears
    for (let i = 0; i < 9; i++) {
      rect(14 + i, 12 - i, 9 - i, 1, O)
      rect(33, 12 - i, 9 - i, 1, O)
    }
    rect(17, 8, 3, 3, '#ffb0c8')
    rect(36, 8, 3, 3, '#ffb0c8')
    // head
    ellipse(28, 26, 17, 14, K)
    ellipse(28, 26, 16, 13, O)
    // stripes
    ;[[22, 14], [28, 13], [34, 14]].forEach(([x, y]) => rect(x, y, 2, 5, o))
    rect(12, 24, 5, 2, o)
    rect(40, 24, 5, 2, o)
    // muzzle
    ellipse(28, 32, 8, 5, W)
    // eyes
    ellipse(21, 24, 3, 3, '#3fd36b')
    ellipse(35, 24, 3, 3, '#3fd36b')
    rect(21, 22, 1, 5, K)
    rect(35, 22, 1, 5, K)
    px(20, 23, '#ffffff')
    px(34, 23, '#ffffff')
    // nose and smile
    rect(27, 29, 3, 2, '#ff6a8a')
    px(26, 32, K); px(27, 33, K); px(29, 33, K); px(30, 32, K)
    // whiskers
    rect(6, 30, 10, 1, '#fff4e6')
    rect(40, 30, 10, 1, '#fff4e6')
    rect(7, 33, 9, 1, '#fff4e6')
    rect(40, 33, 9, 1, '#fff4e6')
    // body / suit collar
    ellipse(28, 50, 20, 9, '#e8ecf2')
    rect(8, 44, 40, 2, '#9aa6b8')
    // the can
    rect(39, 28, 25, 30, K)
    rect(40, 29, 23, 28, '#8a3cff')
    rect(40, 29, 23, 3, '#d0d6e0')
    rect(40, 54, 23, 3, '#d0d6e0')
    rect(40, 35, 23, 15, '#ffffff')
    rect(44, 29, 2, 28, 'rgba(255,255,255,0.25)')
    drawText(g, 'SPACE', 42, 36, '#8a3cff', 1, null)
    drawText(g, 'MEOW', 44, 43, '#ff7a1a', 1, null)
    // paw holding it
    ellipse(42, 44, 5, 4, O)
    rect(38, 43, 3, 1, o)
  })
}

function bigShip() {
  // side view, nose to the right; the cockpit dome sits on top around x 110-170
  return canvasWith(200, 100, (px, rect) => {
    const K = '#1b1430'
    const cy = 64
    const half = (x) => {
      if (x < 14 || x > 196) return 0
      if (x < 70) return 15 + ((x - 14) / 56) * 7
      return 22 * Math.sqrt(Math.max(0, 1 - ((x - 70) / 126) ** 2))
    }
    // fins (behind the body)
    const fin = (dir) => {
      for (let i = 0; i <= 26; i++) {
        const x0 = 16 + i * 0.35
        const x1 = 66 - i * 1.4
        const y = cy + dir * (14 + i)
        if (x1 > x0) {
          rect(Math.round(x0), y, Math.round(x1 - x0), 1, dir < 0 ? '#e0483e' : '#b02a22')
          px(Math.round(x0) - 1, y, K)
          px(Math.round(x1), y, K)
        }
      }
    }
    fin(-1)
    fin(1)
    // body
    for (let x = 14; x <= 196; x++) {
      const h = Math.round(half(x))
      if (h <= 0) continue
      for (let y = -h; y <= h; y++) {
        let col = '#eef1f6'
        if (y < -h * 0.45) col = '#ffffff'
        if (y > h * 0.35) col = '#c9d1dc'
        if (y > h * 0.75) col = '#9aa6b8'
        if (x % 30 === 0) col = '#b8c0cc'
        px(x, cy + y, col)
      }
      px(x, cy - h - 1, K)
      px(x, cy + h + 1, K)
    }
    rect(13, cy - 16, 1, 33, K)
    // red racing stripe and nose cap
    for (let x = 30; x <= 196; x++) {
      const h = half(x)
      if (h < 3) continue
      px(x, cy + 3, '#e0483e')
      px(x, cy + 4, '#e0483e')
      px(x, cy + 5, '#9a2a22')
    }
    for (let x = 176; x <= 196; x++) {
      const h = Math.round(half(x))
      for (let y = -h; y <= h; y++) px(x, cy + y, y < 0 ? '#ff6a5a' : '#e0483e')
    }
    // portholes
    for (const x of [44, 66, 88]) {
      rect(x - 4, cy - 5, 9, 7, K)
      rect(x - 3, cy - 4, 7, 5, '#3ab0e8')
      px(x - 2, cy - 3, '#b8ecff')
    }
    // engine
    rect(2, cy - 12, 12, 25, '#5a6474')
    rect(2, cy - 12, 12, 2, '#7a8494')
    rect(0, cy - 9, 3, 19, '#3a4250')
    rect(1, cy - 13, 13, 1, K)
    rect(1, cy + 13, 13, 1, K)
  })
}

let victoryArt = null
export function drawVictory(g, W, H, frame) {
  if (!victoryArt) {
    const r = rng(77)
    victoryArt = {
      ship: bigShip(),
      cat: catPilot(),
      galaxy: spiralGalaxy(140, 80, 77),
      stars: Array.from({ length: 150 }, () => [Math.floor(r() * W), Math.floor(r() * H), Math.floor(r() * 3)]),
      planet: blob(260, 260, [[130, 130, 128]], '#7a9cff', '#1a2a6a', '#4a6ad0'),
      layer: makeCanvas(260, 150),
    }
  }
  const A = victoryArt
  const grad = g.createLinearGradient(0, 0, 0, H)
  grad.addColorStop(0, '#04020c')
  grad.addColorStop(0.6, '#140a2e')
  grad.addColorStop(1, '#2a124a')
  g.fillStyle = grad
  g.fillRect(0, 0, W, H)
  // stars rush down-left: the ship is climbing up and away
  for (const [sx, sy, d] of A.stars) {
    const sp = 0.4 + d * 0.6
    const x = (((sx - frame * sp) % W) + W) % W
    const y = (((sy + frame * sp * 0.5) % H) + H) % H
    g.fillStyle = d === 2 ? '#ffffff' : d === 1 ? '#c8d0ff' : '#7a80a8'
    g.fillRect(Math.round(x), Math.round(y), d + 1, 1)
  }
  g.drawImage(A.galaxy, 262, 64)
  // the planet they're leaving, falling away below
  const drop = Math.min(26, frame * 0.08)
  const py = H - 62 + drop
  g.drawImage(A.planet, -60, py)
  g.fillStyle = 'rgba(160,190,255,0.25)'
  g.beginPath()
  g.arc(70, py + 130, 132, 0, Math.PI * 2)
  g.fill()

  // compose ship + flame + pilot on a layer, then tilt it upward
  const L = A.layer
  const lg = L.getContext('2d')
  lg.clearRect(0, 0, L.width, L.height)
  lg.imageSmoothingEnabled = false
  const sx = 52
  const sy = 40
  const fl = 40 + ((frame >> 1) % 4) * 4
  for (let i = 0; i < fl; i++) {
    const w = Math.max(1, Math.round(11 * (1 - i / (fl + 8))))
    lg.fillStyle = i < 8 ? '#ffffff' : i < 20 ? '#ffd23a' : '#ff7a1a'
    lg.fillRect(sx - i, sy + 64 - w, 1, w * 2)
  }
  lg.drawImage(A.ship, sx, sy)
  const dx = sx + 112
  const dy = sy + 2
  lg.fillStyle = 'rgba(150,220,255,0.22)'
  lg.beginPath()
  lg.ellipse(dx + 34, dy + 42, 38, 34, 0, Math.PI, 0)
  lg.fill()
  lg.drawImage(A.cat, dx + 2, dy - 4)
  lg.strokeStyle = 'rgba(220,245,255,0.95)'
  lg.lineWidth = 2
  lg.beginPath()
  lg.ellipse(dx + 34, dy + 42, 38, 34, 0, Math.PI, 0)
  lg.stroke()
  lg.fillStyle = '#ffffff'
  lg.fillRect(dx + 12, dy + 18, 2, 6)
  lg.fillRect(dx + 16, dy + 13, 2, 3)

  // tilt the ship upward, with a smoke trail streaming back from the engine
  const bob = Math.sin(frame * 0.08) * 3
  const climb = Math.max(0, 30 - frame * 0.3)
  const cx = 214
  const cy = 108 + climb + bob
  const th = -0.32
  const ex = sx - 30 - L.width / 2
  const ey = sy + 64 - L.height / 2
  const ox = cx + ex * Math.cos(th) - ey * Math.sin(th)
  const oy = cy + ex * Math.sin(th) + ey * Math.cos(th)
  for (let i = 0; i < 16; i++) {
    const t = i / 16
    g.fillStyle = `rgba(255,255,255,${0.16 * (1 - t)})`
    g.beginPath()
    g.arc(ox - Math.cos(th) * t * 190, oy - Math.sin(th) * t * 190 + t * t * 30, 5 + t * 18, 0, Math.PI * 2)
    g.fill()
  }
  g.save()
  g.translate(cx, cy)
  g.rotate(th)
  g.drawImage(L, -L.width / 2, -L.height / 2)
  g.restore()

  const pulse = Math.floor(frame / 20) % 2
  const text = 'VICTORY'
  drawText(g, text, Math.round((W - textWidth(text, 6)) / 2), 12, pulse ? '#ffe46b' : '#ffd23a', 6, '#3a0a5a')
}
