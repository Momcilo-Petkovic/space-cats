// SPACE CATS engine: 1-2 players, cat select, rocket arrivals and launches, 10 planets.
// Physics, collisions, aliens, items, camera, menus and drawing all live here.
// Game content (planets, aliens, cats, colors) is in config.js, the level layouts in levels.js.

import { TILE, drawText, textWidth, itemSprite } from './art.js'
import { planetTiles, canSprite, meteorSprite, moverSprite, decorSprite, drawRocket, ROCKET, Backdrop, drawVictory } from './space.js'
import { loadCharacters } from './characters.js'
import { LEVELS, ROWS, GROUND, SOLID } from './levels.js'
import { Audio } from './audio.js'
import config from './config.js'

export const VIEW_W = 400
export const VIEW_H = 224

const STEP = 1000 / 60

// Movement tuning (pixels per frame at 60 fps)
const WALK_MAX = 1.75
const RUN_MAX = 2.8
const ACCEL = 0.075
const RUN_ACCEL = 0.1
const AIR_ACCEL = 0.07
const FRICTION = 0.11
const SKID = 0.22
const JUMP_V = 6.2
const JUMP_SPEED_BONUS = 0.25
const GRAVITY_HOLD = 0.28
const GRAVITY = 0.72
const MAX_FALL = 6.5
const COYOTE = 6
const JUMP_BUFFER = 7
const PAD_V = 8.2
const BELT_SPEED = 0.9
const LEVEL_TIME = 300

// Player 1: arrows, Up jumps, Right Shift runs. Player 2: A/D, W jumps, Space runs.
// With one player, both sets work.
const P1_KEYS = { left: ['ArrowLeft'], right: ['ArrowRight'], up: ['ArrowUp'], down: ['ArrowDown'], jump: ['ArrowUp'], run: ['ShiftRight'] }
const P2_KEYS = { left: ['KeyA'], right: ['KeyD'], up: ['KeyW'], down: ['KeyS'], jump: ['KeyW'], run: ['Space'] }
const SOLO_KEYS = Object.fromEntries(Object.keys(P1_KEYS).map((k) => [k, [...P1_KEYS[k], ...P2_KEYS[k]]]))
SOLO_KEYS.run.push('ShiftLeft')
const SYS_KEYS = { start: ['Enter', 'NumpadEnter'], pause: ['KeyP', 'Escape'], back: ['Escape', 'Backspace'], mute: ['KeyM'] }
export const GAME_KEYS = new Set([...Object.values(SOLO_KEYS).flat(), ...Object.values(SYS_KEYS).flat()])

const P_COLORS = ['#ffd23a', '#3ad0ff']
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
const upper = (s) => String(s ?? '').toUpperCase()
const ROLES = ['walker', 'hopper', 'flyer']
const BEHAVIOR = { walker: 'walk', hopper: 'hop', flyer: 'fly' }
const FALLBACK = { walker: 'aphid', hopper: 'mite', flyer: 'moth' }
const LIQUID_NAME = { basalt: 'LAVA', moss: 'TOXIC GOO', hull: 'PLASMA', crystal: 'LIQUID LIGHT' }

export class Game {
  constructor(canvas, callbacks = {}) {
    this.canvas = canvas
    canvas.width = VIEW_W
    canvas.height = VIEW_H
    this.g = canvas.getContext('2d')
    this.g.imageSmoothingEnabled = false
    this.cb = callbacks
    this.audio = new Audio()
    this.down = new Set()
    this.prevDown = new Set()
    this.frame = 0
    this.state = 'loading'
    this.menu = 0
    this.levelIndex = 0
    this.players = []
    this.particles = []
    this.popups = []
    this.buildArt()
    this.acc = 0
    this.last = performance.now()
    this.loop = this.loop.bind(this)
    this.raf = requestAnimationFrame(this.loop)

    const specs = {}
    config.cats.forEach((c, i) => (specs[`cat${i}`] = { sprite: c.sprite, fallback: 'player' }))
    config.planets.forEach((p, pi) => {
      for (const role of ROLES) {
        const e = p.enemies[role]
        specs[`e${pi}_${role}`] = { sprite: e.sprite, base: e.base, hue: e.hue, fallback: FALLBACK[role] }
      }
    })
    loadCharacters(specs).then((chars) => {
      this.chars = chars
      this.state = 'title'
    })
  }

  destroy() {
    cancelAnimationFrame(this.raf)
    this.audio.stopMusic()
  }

  buildArt() {
    this.starImg = itemSprite(config.coins.shape, config.coins.colors)
    this.canImg = canSprite()
    this.meteorImg = meteorSprite()
    this.moverImgs = {}
    this.planetArt = config.planets.map((p, i) => ({
      tiles: planetTiles(p, this.starImg, 7 + i * 31),
      backdrop: new Backdrop(p, VIEW_W, VIEW_H, i + 1),
      deco: p.decor && p.decor !== 'none' ? decorSprite(p.decor, p) : null,
    }))
  }

  // ---------- input ----------
  setKey(code, isDown) {
    if (isDown) {
      this.down.add(code)
      this.audio.unlock()
    } else this.down.delete(code)
  }
  clearKeys() {
    this.down.clear()
  }
  sys(action) {
    return SYS_KEYS[action].some((k) => this.down.has(k) && !this.prevDown.has(k))
  }
  held(keys, action) {
    return keys[action].some((k) => this.down.has(k))
  }
  pressed(keys, action) {
    return keys[action].some((k) => this.down.has(k) && !this.prevDown.has(k))
  }
  keysFor(i) {
    if (this.numPlayers === 1) return SOLO_KEYS
    return i === 0 ? P1_KEYS : P2_KEYS
  }

  // ---------- flow ----------
  toTitle() {
    this.state = 'title'
    this.audio.stopMusic()
    this.particles = []
    this.popups = []
  }

  startSelect() {
    this.numPlayers = this.menu + 1
    this.state = 'select'
    this.selTimer = 0
    this.sel = Array.from({ length: this.numPlayers }, (_, i) => ({ cursor: i, locked: false }))
    this.audio.play('confirm')
  }

  newGame() {
    this.score = 0
    this.coins = 0
    this.lives = this.numPlayers === 1 ? 3 : 5
    this.levelIndex = 0
    this.checkpointReached = false
    this.players = this.sel.map((s, i) => {
      const ch = this.chars[`cat${s.cursor}`]
      return { idx: i, cat: s.cursor, ch, keys: this.keysFor(i), w: ch.hitW, h: ch.hitH, powered: false }
    })
    this.startIntro()
  }

  startIntro() {
    this.state = 'intro'
    this.timer = 200
    this.audio.stopMusic()
    const def = LEVELS[this.levelIndex]
    this.introPlanet = def.planet
    this.introLevel = def.build()
  }

  get planetIndex() {
    return LEVELS[this.levelIndex].planet
  }

  loadLevel(index, fromCheckpoint) {
    const def = LEVELS[index]
    const L = def.build()
    this.levelIndex = index
    this.level = L
    this.planet = config.planets[def.planet]
    this.art = this.planetArt[def.planet]
    this.gravity = this.planet.gravity ?? 1
    this.tiles = L.tiles.map((r) => [...r])
    this.widthPx = L.width * TILE
    this.enemies = []
    this.items = []
    this.particles = []
    this.popups = []
    this.bumps = []
    this.crumbles = new Map()
    this.padAnim = new Map()
    this.meteors = []
    this.warnings = []
    this.meteorTimer = 90
    this.windStreaks = []
    this.movers = L.movers.map((m) => ({
      x0: m.x * TILE, y0: m.y * TILE, x: m.x * TILE, y: m.y * TILE, w: m.w * TILE, h: 6,
      axis: m.axis, range: m.range * TILE, ph: 0, step: (Math.PI * m.speed) / Math.max(1, m.range * TILE), dx: 0, dy: 0,
    }))
    for (const m of this.movers) if (!this.moverImgs[m.w]) this.moverImgs[m.w] = moverSprite(m.w / TILE)
    const startX = fromCheckpoint && L.checkpoint ? L.checkpoint : L.start.x
    for (const e of L.entities) {
      if (e.type === 'coin') this.items.push({ type: 'coin', x: e.x * TILE + 3, y: e.y * TILE + 3, w: 10, h: 10 })
      else if (e.type === 'enemy' && ROLES.includes(e.kind)) {
        if (e.x >= startX - 2 && e.x < startX + 8) continue
        this.spawnEnemy(e.kind, e.x, e.y)
      }
    }
    for (const p of this.players) {
      Object.assign(p, {
        x: (startX + p.idx * 1.5) * TILE + (TILE - p.w) / 2, y: GROUND * TILE - p.h, vx: 0, vy: 0, dir: 1,
        onGround: true, coyote: 0, buffer: 0, inv: 0, anim: 0, combo: 0, dead: false, out: false, respawn: false,
        bubble: 0, deathT: 0, hidden: false, riding: null, padBoost: false, auto: null, beam: 0,
      })
    }
    this.goal = { x: L.rocketX * TILE, y: GROUND * TILE - ROCKET.h, open: false, flame: 0, vy: 0 }
    this.arrival = null
    this.leaving = null
    this.time = LEVEL_TIME
    this.timeFrames = 0
    this.camX = 0
    this.updateCamera(true)
  }

  spawnEnemy(role, tx, ty) {
    const def = this.planet.enemies[role]
    const ch = this.chars[`e${this.planetIndex}_${role}`]
    const w = ch.hitW
    const h = ch.hitH
    this.enemies.push({
      role, def, ch, behavior: BEHAVIOR[role], w, h, x: tx * TILE + (TILE - w) / 2, y: (ty + 1) * TILE - h,
      baseY: (ty + 1) * TILE - h, vx: 0, vy: 0, active: false, state: 'alive', t: 0, onGround: false, speed: def.speed ?? 0.5,
    })
  }

  alive(p) {
    return !p.dead && !p.out && !p.hidden
  }
  get active() {
    return this.players.filter((p) => this.alive(p))
  }

  // ---------- main loop ----------
  loop(now) {
    this.acc += Math.min(now - this.last, 100)
    this.last = now
    while (this.acc >= STEP) {
      this.update()
      this.prevDown = new Set(this.down)
      this.acc -= STEP
    }
    this.render()
    this.raf = requestAnimationFrame(this.loop)
  }

  update() {
    this.frame++
    if (this.sys('mute')) this.audio.toggleMute()
    switch (this.state) {
      case 'title':
        this.updateTitle()
        break
      case 'select':
        this.updateSelect()
        break
      case 'intro':
        this.timer--
        if (this.timer <= 0 || (this.timer < 170 && (this.sys('start') || this.players.some((p) => this.pressed(p.keys, 'jump'))))) {
          this.loadLevel(this.levelIndex, this.checkpointReached)
          this.audio.startMusic(this.planet.music ?? this.levelIndex)
          if (this.checkpointReached) {
            this.state = 'play'
            for (const p of this.players) this.sparkle(p.x + p.w / 2, p.y + p.h / 2, 14)
            this.audio.play('beam')
          } else this.startArrival()
        }
        break
      case 'arrive':
        this.updateArrival()
        break
      case 'play':
        if (this.sys('pause') || this.sys('start')) {
          this.state = 'paused'
          this.audio.stopMusic()
          this.audio.play('pause')
          break
        }
        this.updatePlay()
        break
      case 'paused':
        if (this.sys('pause') || this.sys('start')) {
          this.state = 'play'
          this.audio.play('pause')
          this.audio.startMusic(this.planet.music ?? this.levelIndex)
        }
        break
      case 'dying':
        this.updateMovers()
        for (const p of this.players) this.updateDead(p)
        this.updateParticles()
        if (--this.timer <= 0) {
          this.lives--
          if (this.lives <= 0) {
            this.state = 'gameover'
            this.timer = 90
            this.audio.play('gameover')
            this.cb.onEnd?.('gameover', this.score, this.levelIndex + 1)
          } else this.startIntro()
        }
        break
      case 'board':
        this.updateBoarding()
        break
      case 'gameover':
        if (this.timer > 0) this.timer--
        else if (this.sys('start')) this.toTitle()
        break
      case 'win':
        this.vt++
        if (this.vt > 200 && this.sys('start') && !this.reported) {
          this.reported = true
          this.cb.onEnd?.('win', this.score, LEVELS.length)
        }
        break
      default:
        break
    }
  }

  // ---------- menus ----------
  updateTitle() {
    const k = SOLO_KEYS
    if (this.pressed(k, 'up') || this.pressed(k, 'down') || this.pressed(k, 'left') || this.pressed(k, 'right')) {
      this.menu = 1 - this.menu
      this.audio.play('select')
    }
    if (this.sys('start')) this.startSelect()
  }

  updateSelect() {
    const n = config.cats.length
    if (this.sys('back')) {
      this.state = 'title'
      return
    }
    const taken = (i, me) => this.sel.some((s, j) => j !== me && s.locked && s.cursor === i)
    this.sel.forEach((s, i) => {
      const keys = this.keysFor(i)
      if (s.locked) {
        if (this.pressed(keys, 'down')) {
          s.locked = false
          this.audio.play('select')
        }
        return
      }
      const dir = this.pressed(keys, 'left') ? -1 : this.pressed(keys, 'right') ? 1 : 0
      if (dir) {
        let c = s.cursor
        for (let t = 0; t < n; t++) {
          c = (c + dir + n) % n
          if (!taken(c, i)) break
        }
        s.cursor = c
        this.audio.play('select')
      }
      if (this.pressed(keys, 'jump') || (i === 0 && this.sys('start'))) {
        if (!taken(s.cursor, i)) {
          s.locked = true
          this.audio.play('confirm')
          // move the other cursor off a cat that was just taken
          this.sel.forEach((o, j) => {
            if (j !== i && !o.locked && o.cursor === s.cursor) o.cursor = (o.cursor + 1) % n
          })
        }
      }
    })
    if (this.sel.every((s) => s.locked)) {
      if (++this.selTimer > 45) this.newGame()
    } else this.selTimer = 0
  }

  // ---------- rocket: arrival ----------
  startArrival() {
    this.state = 'arrive'
    this.arrival = { x: this.level.rocketStartX * TILE, y: -ROCKET.h - 30, ty: GROUND * TILE - ROCKET.h, phase: 'descend', t: 0, out: 0, open: false }
    for (const p of this.players) p.hidden = true
  }

  updateArrival() {
    const A = this.arrival
    A.t++
    this.updateMovers()
    this.updateParticles()
    if (A.phase === 'descend') {
      A.y += Math.max(0.7, (A.ty - A.y) * 0.045)
      if (A.y >= A.ty - 0.5) {
        A.y = A.ty
        A.phase = 'landed'
        A.t = 0
        this.audio.play('land')
        this.dust(A.x + ROCKET.w / 2, GROUND * TILE, 12)
      }
      return
    }
    if (A.phase === 'landed' && A.t > 20) {
      A.phase = 'out'
      A.open = true
      A.t = 0
      this.audio.play('door')
    }
    if (A.phase === 'out') {
      const next = this.players[A.out]
      if (next && A.t > 16 + A.out * 26) {
        next.hidden = false
        next.x = A.x + ROCKET.doorX + ROCKET.doorW / 2 - next.w / 2
        next.y = A.y + ROCKET.doorY + ROCKET.doorH - next.h
        next.vx = 1.35 + A.out * 0.55
        next.vy = -4.2
        next.dir = 1
        next.onGround = false
        next.auto = 'hop'
        A.out++
        this.audio.play('jump')
      }
      for (const p of this.players) {
        if (p.hidden) continue
        this.applyGravity(p, false)
        this.moveX(p)
        this.landed(p, this.moveY(p, true))
        if (p.onGround) p.vx = Math.abs(p.vx) <= FRICTION ? 0 : p.vx - Math.sign(p.vx) * FRICTION
        p.anim += Math.abs(p.vx) * 0.12
      }
      if (A.out >= this.players.length && this.players.every((p) => p.onGround && p.vx === 0)) {
        A.open = false
        this.audio.play('door')
        for (const p of this.players) p.auto = null
        this.leaving = { x: A.x, y: A.y, vy: 0, t: 0 }
        this.arrival = null
        this.state = 'play'
        this.audio.play('launch')
      }
    }
  }

  // ---------- play ----------
  updatePlay() {
    this.updateMovers()
    for (const p of this.players) this.updatePlayer(p)
    if (this.state !== 'play') return
    this.updateCrumbles()
    this.updateEnemies()
    this.updateItems()
    this.updateMeteors()
    this.updateParticles()
    this.updateWind()
    this.updateCamera(false)
    if (this.leaving) {
      const R = this.leaving
      R.t++
      if (R.t > 20) {
        R.vy -= 0.12
        R.y += R.vy
      }
      if (R.y < -ROCKET.h - 80) this.leaving = null
    }
    const cp = this.level.checkpoint
    if (cp && !this.checkpointReached && this.active.some((p) => p.x > cp * TILE)) {
      this.checkpointReached = true
      this.popup(cp * TILE + 8, 8 * TILE, 'CHECKPOINT')
      this.audio.play('confirm')
    }
    if (++this.timeFrames >= 40) {
      this.timeFrames = 0
      this.time--
      if (this.time === 100) this.popup(this.camX + VIEW_W / 2, 60, 'HURRY!')
      if (this.time <= 0) for (const p of this.active) this.die(p)
    }
    const rocket = { x: this.goal.x + 4, y: this.goal.y, w: ROCKET.w - 8, h: ROCKET.h }
    if (this.state === 'play' && this.active.some((p) => overlap(p, rocket))) this.startBoarding()
  }

  partnerOf(p) {
    return this.players.find((q) => q !== p && this.alive(q))
  }

  updatePlayer(p) {
    if (p.dead) return this.updateDead(p)
    if (p.out || p.hidden) return
    const k = p.keys
    const left = this.held(k, 'left')
    const right = this.held(k, 'right')
    const run = this.held(k, 'run')
    const max = run ? RUN_MAX : WALK_MAX
    const dir = left && !right ? -1 : right && !left ? 1 : 0
    const ice = this.planet.slippery && p.onGround
    const accel = (run ? RUN_ACCEL : ACCEL) * (ice ? 0.4 : 1)
    if (dir !== 0) {
      p.dir = dir
      if (p.onGround && p.vx !== 0 && Math.sign(p.vx) !== dir) p.vx += dir * (ice ? 0.06 : SKID)
      else p.vx += dir * (p.onGround ? accel : AIR_ACCEL)
      if (Math.abs(p.vx) > max) p.vx -= Math.sign(p.vx) * Math.min(Math.abs(p.vx) - max, p.onGround ? 0.1 : 0.03)
    } else if (p.onGround) {
      const f = ice ? 0.02 : FRICTION
      p.vx = Math.abs(p.vx) <= f ? 0 : p.vx - Math.sign(p.vx) * f
    }
    if (this.pressed(k, 'jump')) p.buffer = JUMP_BUFFER
    else if (p.buffer > 0) p.buffer--
    if (p.onGround) {
      p.coyote = COYOTE
      p.combo = 0
    } else if (p.coyote > 0) p.coyote--
    if (p.buffer > 0 && p.coyote > 0) {
      p.vy = -(JUMP_V + Math.abs(p.vx) * JUMP_SPEED_BONUS)
      p.onGround = false
      p.riding = null
      p.coyote = 0
      p.buffer = 0
      this.audio.play('jump')
    }
    // carried by a moving platform, a conveyor belt or the wind
    if (p.riding) this.carry(p, p.riding.dx, 0)
    if (p.onGround) {
      const under = this.tileAt(Math.floor((p.x + p.w / 2) / TILE), Math.floor((p.y + p.h + 1) / TILE))
      if (under === '<') this.carry(p, -BELT_SPEED, 0)
      if (under === '>') this.carry(p, BELT_SPEED, 0)
    }
    const wind = this.windAt(p.x + p.w / 2)
    if (wind) this.carry(p, wind * 0.9, 0)

    this.applyGravity(p, this.held(k, 'jump'))
    this.moveX(p)
    const land = this.moveY(p, true)
    this.landed(p, land)

    // stay on screen
    if (p.x < this.camX) {
      p.x = this.camX
      if (p.vx < 0) p.vx = 0
    }
    if (p.x + p.w > this.camX + VIEW_W - 2) {
      p.x = this.camX + VIEW_W - 2 - p.w
      if (p.vx > 0) p.vx = 0
    }
    p.anim += Math.abs(p.vx) * 0.12
    if (p.inv > 0) p.inv--
    const feet = this.tileAt(Math.floor((p.x + p.w / 2) / TILE), Math.floor((p.y + p.h - 3) / TILE))
    if (feet === 'L') {
      this.splash(p.x + p.w / 2, GROUND * TILE)
      this.die(p)
    } else if (p.y > ROWS * TILE + 8) this.die(p)
  }

  carry(o, dx, dy) {
    const save = o.vx
    o.vx = dx
    this.moveX(o)
    o.vx = save
    o.y += dy
  }

  applyGravity(p, holding) {
    const g = this.gravity
    if (p.vy >= 0) p.padBoost = false
    const hold = p.vy < 0 && (holding || p.padBoost)
    p.vy = Math.min(p.vy + (hold ? GRAVITY_HOLD : GRAVITY) * g, MAX_FALL * Math.min(1, 0.55 + g * 0.45))
  }

  // after vertical movement: movers, bounce pads, crumbling floors, landing dust
  landed(p, land) {
    const wasRiding = p.riding
    p.riding = null
    if (!p.onGround && p.vy >= 0) {
      const prevBottom = p.y + p.h - p.vy
      for (const m of this.movers) {
        if (p.x + p.w <= m.x + 1 || p.x >= m.x + m.w - 1) continue
        const top = m.y
        if (prevBottom <= top + 1 + Math.max(0, m.dy) + (wasRiding === m ? 3 : 0) && p.y + p.h >= top - 0.5) {
          p.y = top - p.h
          p.vy = 0
          p.onGround = true
          p.riding = m
          break
        }
      }
    }
    if (land) {
      const t = this.tileAt(land.tx, land.ty)
      if (t === 'J') {
        p.vy = -PAD_V
        p.padBoost = true
        p.onGround = false
        p.coyote = 0
        this.padAnim.set(`${land.tx},${land.ty}`, 12)
        this.audio.play('boing')
        return
      }
      if (land.speed > 4) this.dust(p.x + p.w / 2, p.y + p.h, 5)
    }
    if (p.onGround && !p.riding) {
      const ty = Math.floor((p.y + p.h + 1) / TILE)
      for (let tx = Math.floor(p.x / TILE); tx <= Math.floor((p.x + p.w - 0.01) / TILE); tx++) {
        if (this.tileAt(tx, ty) === 'C') this.startCrumble(tx, ty)
      }
    }
  }

  updateDead(p) {
    if (!p.dead) return
    if (p.bubble > 0) {
      const mate = this.partnerOf(p)
      if (!mate) return
      const tx = mate.x + mate.w / 2 - 12 * mate.dir
      const ty = mate.y - 26
      p.bx += (tx - p.bx) * 0.06
      p.by += (ty - p.by) * 0.06
      p.bubble--
      if (p.bubble <= 0 || (p.bubble < 175 && (this.pressed(p.keys, 'jump') || this.pressed(p.keys, 'left') || this.pressed(p.keys, 'right')))) {
        p.dead = false
        p.bubble = 0
        p.x = mate.x
        p.y = mate.y + mate.h - p.h - 1
        p.vx = 0
        p.vy = -2
        p.inv = 120
        p.riding = null
        this.sparkle(p.x + p.w / 2, p.y + p.h / 2, 12)
        this.audio.play('beam')
      }
      return
    }
    p.deathT++
    if (p.deathT > 24) {
      p.vy = Math.min(p.vy + 0.3, 6)
      p.y += p.vy
    }
    if (p.respawn && p.deathT > 90 && this.partnerOf(p)) {
      p.respawn = false
      p.bubble = 200
      p.bx = this.camX + VIEW_W / 2
      p.by = 40
      this.audio.play('beam')
    }
  }

  // ---------- tile collision ----------
  tileAt(tx, ty) {
    if (ty < 0 || ty >= ROWS) return '.'
    if (tx < 0 || tx >= this.level.width) return 'S'
    return this.tiles[ty][tx]
  }
  solid(tx, ty) {
    return SOLID.has(this.tileAt(tx, ty))
  }

  moveX(o) {
    o.x += o.vx
    const y0 = Math.floor(o.y / TILE)
    const y1 = Math.floor((o.y + o.h - 0.01) / TILE)
    if (o.vx > 0) {
      const tx = Math.floor((o.x + o.w) / TILE)
      for (let ty = y0; ty <= y1; ty++) {
        if (this.solid(tx, ty)) {
          o.x = tx * TILE - o.w
          o.vx = 0
          return true
        }
      }
    } else if (o.vx < 0) {
      const tx = Math.floor(o.x / TILE)
      for (let ty = y0; ty <= y1; ty++) {
        if (this.solid(tx, ty)) {
          o.x = (tx + 1) * TILE
          o.vx = 0
          return true
        }
      }
    }
    return false
  }

  // Returns { tx, ty, speed } when landing on a tile.
  moveY(o, isPlayer) {
    const vy = o.vy
    o.y += o.vy
    o.onGround = false
    const x0 = Math.floor(o.x / TILE)
    const x1 = Math.floor((o.x + o.w - 0.01) / TILE)
    if (o.vy > 0) {
      const ty = Math.floor((o.y + o.h) / TILE)
      const prevBottom = o.y + o.h - o.vy
      let best = null
      for (let tx = x0; tx <= x1; tx++) {
        const t = this.tileAt(tx, ty)
        if (SOLID.has(t) || (t === '=' && prevBottom <= ty * TILE + 0.5)) {
          if (!best || t === 'J') best = tx
        }
      }
      if (best !== null) {
        o.y = ty * TILE - o.h
        o.vy = 0
        o.onGround = true
        return { tx: best, ty, speed: vy }
      }
    } else if (o.vy < 0) {
      const ty = Math.floor(o.y / TILE)
      const hits = []
      for (let tx = x0; tx <= x1; tx++) if (this.solid(tx, ty)) hits.push(tx)
      if (!hits.length) return null
      if (isPlayer && hits.length === 1) {
        const tx = hits[0]
        const overRight = o.x + o.w - tx * TILE
        const overLeft = (tx + 1) * TILE - o.x
        if (overRight <= 4 && !this.solid(tx - 1, ty)) {
          o.x = tx * TILE - o.w
          return null
        }
        if (overLeft <= 4 && !this.solid(tx + 1, ty)) {
          o.x = (tx + 1) * TILE
          return null
        }
      }
      o.y = (ty + 1) * TILE
      o.vy = 1
      o.padBoost = false
      if (isPlayer) {
        const center = o.x + o.w / 2
        const tx = hits.reduce((b, t) => (Math.abs(t * TILE + 8 - center) < Math.abs(b * TILE + 8 - center) ? t : b))
        this.hitBlock(o, tx, ty)
      }
    }
    return null
  }

  hitBlock(p, tx, ty) {
    const t = this.tileAt(tx, ty)
    if (t === '?') {
      this.tiles[ty][tx] = 'U'
      this.bump(tx, ty, p)
      this.particles.push({ type: 'popstar', x: tx * TILE + 3, y: ty * TILE - 10, vy: -4.5, t: 0 })
      this.collectStar(tx * TILE + 8, ty * TILE - 20)
    } else if (t === 'P') {
      this.tiles[ty][tx] = 'U'
      this.bump(tx, ty, p)
      this.items.push({ type: 'power', x: tx * TILE + 3, y: ty * TILE, w: 10, h: 10, vx: 0, vy: 0, rise: 26, dir: 1 })
      this.audio.play('sprout')
    } else if (t === 'B') {
      if (p.powered) {
        this.tiles[ty][tx] = '.'
        this.addScore(50)
        this.audio.play('break')
        for (const [dx, dy, vx, vy] of [[0, 0, -1.2, -5], [8, 0, 1.2, -5], [0, 8, -1.2, -3.5], [8, 8, 1.2, -3.5]]) {
          this.particles.push({ type: 'debris', x: tx * TILE + dx, y: ty * TILE + dy, vx, vy, t: 0 })
        }
        this.killOnTile(tx, ty, p)
      } else {
        this.bump(tx, ty, p)
        this.audio.play('bump')
      }
    } else this.audio.play('bump')
  }

  bump(tx, ty, p) {
    this.bumps.push({ tx, ty, t: 0 })
    this.killOnTile(tx, ty, p)
  }

  killOnTile(tx, ty, p) {
    const top = ty * TILE
    const zone = { x: tx * TILE - 2, y: top - 4, w: TILE + 4, h: 5 }
    for (const e of this.enemies) if (e.state === 'alive' && overlap(e, zone)) this.flipEnemy(e, 200, p.x)
    for (const it of this.items) {
      if (it.type === 'coin' && overlap(it, { x: tx * TILE, y: top - 16, w: TILE, h: 16 })) {
        it.dead = true
        this.collectStar(it.x + 5, it.y)
      }
    }
  }

  // ---------- special tiles and platforms ----------
  startCrumble(tx, ty) {
    const key = `${tx},${ty}`
    if (!this.crumbles.has(key)) this.crumbles.set(key, { tx, ty, t: 0, gone: false })
  }

  updateCrumbles() {
    for (const [key, c] of this.crumbles) {
      c.t++
      if (!c.gone && c.t >= 34) {
        c.gone = true
        c.t = 0
        this.tiles[c.ty][c.tx] = '.'
        this.particles.push({ type: 'falltile', x: c.tx * TILE, y: c.ty * TILE, vx: 0, vy: 0.5, t: 0 })
        this.audio.play('crumble')
      } else if (c.gone && c.t >= 300) {
        const box = { x: c.tx * TILE, y: c.ty * TILE, w: TILE, h: TILE }
        if (this.players.some((p) => this.alive(p) && overlap(p, box))) continue
        this.tiles[c.ty][c.tx] = 'C'
        this.crumbles.delete(key)
      }
    }
    for (const [key, n] of this.padAnim) {
      if (n <= 1) this.padAnim.delete(key)
      else this.padAnim.set(key, n - 1)
    }
  }

  updateMovers() {
    for (const m of this.movers) {
      m.ph += m.step
      const off = ((1 - Math.cos(m.ph)) / 2) * m.range
      const nx = m.axis === 'x' ? m.x0 + off : m.x0
      const ny = m.axis === 'y' ? m.y0 - off : m.y0
      m.dx = nx - m.x
      m.dy = ny - m.y
      m.x = nx
      m.y = ny
    }
    for (const p of this.players) if (p.riding && !p.dead) p.y = p.riding.y - p.h
  }

  windAt(x) {
    const tx = x / TILE
    for (const [x0, x1, f] of this.level.windZones) if (tx >= x0 && tx <= x1 + 1) return f
    return 0
  }

  updateWind() {
    const zones = this.level.windZones.filter(([x0, x1]) => x1 * TILE > this.camX && x0 * TILE < this.camX + VIEW_W)
    if (zones.length && this.frame % 3 === 0) {
      const [x0, x1, f] = zones[0]
      const x = f > 0 ? Math.max(x0 * TILE, this.camX) - 30 : Math.min(x1 * TILE, this.camX + VIEW_W) + 30
      this.windStreaks.push({ x, y: 20 + Math.random() * 170, f, len: 10 + Math.random() * 20, life: 120, zone: [x0 * TILE, (x1 + 1) * TILE] })
    }
    for (const s of this.windStreaks) {
      s.x += s.f * 5
      s.life--
    }
    this.windStreaks = this.windStreaks.filter((s) => s.life > 0 && s.x > s.zone[0] - 60 && s.x < s.zone[1] + 60)
  }

  updateMeteors() {
    const zones = this.level.meteorZones
    const lead = this.active.reduce((a, p) => (!a || p.x > a.x ? p : a), null)
    if (lead && zones.some(([x0, x1]) => lead.x / TILE >= x0 && lead.x / TILE <= x1)) {
      if (--this.meteorTimer <= 0) {
        this.meteorTimer = 80 + Math.floor(Math.random() * 60)
        const tx = Math.max(this.camX + 30, Math.min(this.camX + VIEW_W - 20, lead.x + (Math.random() * 170 - 40)))
        this.warnings.push({ x: tx, t: 0 })
        this.audio.play('warn')
      }
    }
    for (const w of this.warnings) {
      w.t++
      if (w.t === 50) this.meteors.push({ x: w.x + 24, y: -14, vx: -0.6, vy: 3.2, w: 10, h: 10 })
    }
    this.warnings = this.warnings.filter((w) => w.t < 50)
    for (const m of this.meteors) {
      m.x += m.vx
      m.y += m.vy
      m.vy += 0.05
      if (this.frame % 2 === 0) this.particles.push({ type: 'ember', x: m.x + 5, y: m.y + 2, vx: 0.3, vy: -0.4, t: 0, col: '#ffb01a' })
      const hitTile = this.solid(Math.floor((m.x + 5) / TILE), Math.floor((m.y + 10) / TILE))
      if (hitTile || m.y > ROWS * TILE) {
        m.dead = true
        if (hitTile) this.explode(m.x + 5, m.y + 8)
        continue
      }
      for (const p of this.active) if (p.inv === 0 && overlap(p, m)) {
        m.dead = true
        this.explode(m.x + 5, m.y + 5)
        this.hurt(p)
      }
      for (const e of this.enemies) if (e.active && e.state === 'alive' && overlap(e, m)) this.flipEnemy(e, 100, m.x)
    }
    this.meteors = this.meteors.filter((m) => !m.dead)
  }

  // ---------- aliens ----------
  updateEnemies() {
    const g = this.gravity
    for (const e of this.enemies) {
      if (!e.active) {
        if (e.x < this.camX + VIEW_W + 24) {
          e.active = true
          e.vx = -e.speed
        } else continue
      }
      e.t++
      if (e.state === 'squashed') {
        if (e.t > 30) e.dead = true
        continue
      }
      if (e.state === 'flipped') {
        e.vy += 0.35
        e.x += e.vx
        e.y += e.vy
        if (e.y > ROWS * TILE + 32) e.dead = true
        continue
      }
      if (e.behavior === 'fly') {
        e.x += e.vx
        e.y = e.baseY + Math.sin(e.t * 0.045) * 22
      } else {
        if (e.behavior === 'hop' && e.onGround && e.t % 110 === 0) e.vy = -4.6 * Math.sqrt(g)
        e.vy = Math.min(e.vy + 0.4 * g, 6)
        const before = e.vx
        if (this.moveX(e)) e.vx = -before
        this.moveY(e, false)
        if (e.onGround) {
          const under = this.tileAt(Math.floor((e.x + e.w / 2) / TILE), Math.floor((e.y + e.h + 1) / TILE))
          if (under === '<') this.carry(e, -BELT_SPEED * 0.6, 0)
          if (under === '>') this.carry(e, BELT_SPEED * 0.6, 0)
        }
        if (e.y > ROWS * TILE + 16 || this.tileAt(Math.floor((e.x + e.w / 2) / TILE), Math.floor((e.y + e.h - 3) / TILE)) === 'L') e.dead = true
      }
      if (e.x < this.camX - 64) e.dead = true
      for (const o of this.enemies) {
        if (o !== e && o.active && o.state === 'alive' && e.behavior !== 'fly' && o.behavior !== 'fly' && overlap(e, o)) {
          if ((e.vx > 0 && e.x < o.x) || (e.vx < 0 && e.x > o.x)) e.vx = -e.vx
        }
      }
      for (const p of this.active) {
        if (e.state !== 'alive' || !overlap(p, e)) continue
        const falling = p.vy > 0 && p.y + p.h - e.y < 10
        if (falling) {
          e.state = 'squashed'
          e.t = 0
          p.vy = this.held(p.keys, 'jump') ? -6.6 : -4.2
          p.combo++
          const pts = [100, 200, 400, 800, 1000, 2000, 4000, 8000][Math.min(p.combo - 1, 7)]
          this.addScore(pts, e.x + e.w / 2, e.y - 6)
          this.audio.play('stomp')
        } else if (p.inv === 0) this.hurt(p)
      }
    }
    this.enemies = this.enemies.filter((e) => !e.dead)
  }

  flipEnemy(e, pts, fromX) {
    e.state = 'flipped'
    e.vy = -4
    e.vx = e.x < fromX ? -0.8 : 0.8
    this.addScore(pts, e.x + e.w / 2, e.y - 6)
    this.audio.play('stomp')
  }

  // ---------- items ----------
  updateItems() {
    for (const it of this.items) {
      if (it.type === 'power') {
        if (it.rise > 0) {
          it.rise--
          it.y -= 0.6
          continue
        }
        it.vx = 1.0 * it.dir
        it.vy = Math.min(it.vy + 0.4 * this.gravity, 6)
        if (this.moveX(it)) it.dir = -it.dir
        this.moveY(it, false)
        if (it.y > ROWS * TILE) it.dead = true
      }
      for (const p of this.active) {
        if (it.dead || !overlap(p, it)) continue
        it.dead = true
        if (it.type === 'coin') this.collectStar(it.x + 5, it.y)
        else this.powerUp(p)
      }
    }
    this.items = this.items.filter((i) => !i.dead)
  }

  collectStar(x, y) {
    this.coins++
    this.addScore(200, x, y)
    this.audio.play('leaf')
    if (this.coins % 100 === 0) {
      this.lives++
      this.popup(x, y - 12, '1UP')
      this.audio.play('oneup')
    }
  }

  powerUp(p) {
    this.addScore(1000, p.x + 5, p.y - 8)
    if (!p.powered) {
      p.powered = true
      this.flash = 40
      this.popup(p.x + p.w / 2, p.y - 18, upper(config.powerUp.name) + '!')
    }
    this.audio.play('power')
  }

  hurt(p) {
    if (p.powered) {
      p.powered = false
      p.inv = 120
      this.audio.play('shrink')
    } else this.die(p)
  }

  die(p) {
    if (p.dead || p.out || (this.state !== 'play' && this.state !== 'board')) return
    p.dead = true
    p.deathT = 0
    p.vx = 0
    p.vy = -5.5
    p.powered = false
    p.riding = null
    const others = this.players.some((q) => q !== p && this.alive(q))
    if (others) {
      this.audio.play('shrink')
      if (this.lives > 1) {
        this.lives--
        p.respawn = true
      } else {
        p.out = true
        this.popup(p.x + p.w / 2, p.y - 10, 'OUT')
      }
      return
    }
    this.state = 'dying'
    this.timer = 170
    this.audio.stopMusic()
    this.audio.play('die')
  }

  // ---------- rocket: boarding and launch ----------
  startBoarding() {
    this.state = 'board'
    this.bt = 0
    this.boardPhase = 'gather'
    this.audio.stopMusic()
    this.audio.play('flag')
    const padLeft = (this.level.rocketX - 2) * TILE - 4
    for (const p of this.players) {
      if (p.dead && p.bubble > 0) {
        p.dead = false
        p.bubble = 0
        p.x = p.bx
        p.y = p.by
        p.beam = 40
        p.auto = 'beam'
        continue
      }
      if (!this.alive(p)) continue
      p.riding = null
      if (p.x >= padLeft && p.y + p.h <= GROUND * TILE + 1) p.auto = 'walk'
      else {
        p.auto = 'beam'
        p.beam = 40
        this.audio.play('beam')
      }
    }
  }

  updateBoarding() {
    const G = this.goal
    this.bt++
    this.updateMovers()
    this.updateParticles()
    const door = G.x + ROCKET.doorX + ROCKET.doorW / 2
    if (this.bt === 12) {
      G.open = true
      this.audio.play('door')
    }
    if (this.boardPhase === 'gather') {
      for (const p of this.players) {
        if (p.dead) {
          this.updateDead(p)
          continue
        }
        if (p.out || p.hidden) continue
        if (p.auto === 'beam') {
          p.beam--
          if (this.frame % 3 === 0) this.sparkle(p.x + p.w / 2, p.y + p.h / 2, 2)
          if (p.beam <= 0) this.board(p)
          continue
        }
        const target = door - p.w / 2
        if (p.auto === 'walk') {
          const d = target - p.x
          p.vx = Math.abs(d) < 1.3 ? 0 : Math.sign(d) * 1.2
          if (p.vx) p.dir = Math.sign(p.vx)
          if (Math.abs(d) < 1.3 && p.onGround && G.open) {
            p.x = target
            p.vy = -4.5
            p.onGround = false
            p.auto = 'hop'
            this.audio.play('jump')
          }
        }
        this.applyGravity(p, false)
        this.moveX(p)
        this.moveY(p, true)
        p.anim += Math.abs(p.vx) * 0.12
        if (p.auto === 'hop' && p.vy >= 0) this.board(p)
      }
      if (this.players.every((p) => p.hidden || p.out || p.dead)) {
        G.open = false
        this.audio.play('door')
        this.boardPhase = 'tally'
        const boarded = this.players.filter((p) => p.hidden).length
        if (this.players.length > 1 && boarded === this.players.length) {
          this.addScore(2000, door, G.y - 10)
          this.popup(door, G.y - 22, 'TEAM BONUS')
        }
      }
      return
    }
    if (this.boardPhase === 'tally') {
      if (this.time > 0) {
        const n = Math.min(this.time, 3)
        this.time -= n
        this.addScore(50 * n)
        if (this.frame % 3 === 0) this.audio.play('tick')
        return
      }
      this.boardPhase = 'launch'
      this.bt = 0
      this.audio.play('launch')
      return
    }
    if (this.boardPhase === 'launch') {
      G.flame = Math.min(1, this.bt / 30)
      if (this.bt > 30) {
        G.vy -= 0.1
        G.y += G.vy
        if (this.frame % 2 === 0) this.dust(G.x + ROCKET.w / 2, GROUND * TILE, 2)
      }
      if (G.y < -ROCKET.h - 120) this.nextPlanet()
    }
  }

  board(p) {
    p.hidden = true
    p.auto = null
    this.sparkle(this.goal.x + ROCKET.doorX + ROCKET.doorW / 2, this.goal.y + ROCKET.doorY + 6, 6)
  }

  nextPlanet() {
    this.checkpointReached = false
    for (const p of this.players) if (p.dead || p.out) p.powered = false
    if (this.levelIndex + 1 < LEVELS.length) {
      this.levelIndex++
      this.startIntro()
    } else {
      this.state = 'win'
      this.vt = 0
      this.reported = false
      this.audio.play('victory')
    }
  }

  // ---------- effects ----------
  addScore(pts, x, y) {
    this.score += pts
    if (x !== undefined) this.popup(x, y, String(pts))
  }
  popup(x, y, text) {
    this.popups.push({ x, y, text, t: 0 })
  }
  dust(x, y, n) {
    for (let i = 0; i < n; i++) {
      this.particles.push({ type: 'dust', x: x + (Math.random() - 0.5) * 14, y: y - 2, vx: (Math.random() - 0.5) * 1.6, vy: -Math.random() * 0.8, t: 0 })
    }
  }
  sparkle(x, y, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2
      const s = 0.5 + Math.random() * 1.5
      this.particles.push({ type: 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0, col: i % 2 ? '#b0f0ff' : '#ffffff' })
    }
  }
  explode(x, y) {
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2
      this.particles.push({ type: 'spark', x, y, vx: Math.cos(a) * 1.8, vy: Math.sin(a) * 1.8 - 1, t: 0, col: i % 3 ? '#ff7a1a' : '#ffe46b' })
    }
    if (x > this.camX - 20 && x < this.camX + VIEW_W + 20) this.audio.play('boom')
  }
  splash(x, y) {
    const col = this.art.tiles.liquidLight
    for (let i = 0; i < 12; i++) this.particles.push({ type: 'spark', x, y, vx: (Math.random() - 0.5) * 3, vy: -2 - Math.random() * 3, t: 0, col })
    this.audio.play('splash')
  }

  updateParticles() {
    for (const q of this.particles) {
      q.t++
      if (q.type === 'popstar') {
        q.y += q.vy
        q.vy += 0.3
        if (q.t > 28) q.dead = true
      } else if (q.type === 'dust') {
        q.x += q.vx
        q.y += q.vy
        if (q.t > 24) q.dead = true
      } else if (q.type === 'ember') {
        q.x += q.vx
        q.y += q.vy
        if (q.t > 18) q.dead = true
      } else {
        q.x += q.vx
        q.y += q.vy
        q.vy += q.type === 'spark' ? 0.06 : 0.35
        if (q.t > (q.type === 'spark' ? 45 : 90)) q.dead = true
      }
    }
    this.particles = this.particles.filter((q) => !q.dead)
    for (const b of this.bumps || []) b.t++
    this.bumps = (this.bumps || []).filter((b) => b.t < 10)
    for (const s of this.popups) s.t++
    this.popups = this.popups.filter((s) => s.t < 50)
    if (this.flash > 0) this.flash--
  }

  // Shared camera: follows the pair, only scrolls forward, never leaves a cat behind.
  updateCamera(snap) {
    const act = this.players.filter((p) => !p.dead && !p.out)
    if (!act.length) return
    const minX = Math.min(...act.map((p) => p.x))
    const maxX = Math.max(...act.map((p) => p.x + p.w))
    let target = (minX + maxX) / 2 - VIEW_W * 0.42
    target = Math.min(target, minX - 16)
    target = Math.max(0, Math.min(target, this.widthPx - VIEW_W))
    if (snap || target > this.camX) this.camX = target
  }

  // ---------- drawing ----------
  render() {
    const g = this.g
    g.setTransform(1, 0, 0, 1, 0, 0)
    g.imageSmoothingEnabled = false
    switch (this.state) {
      case 'loading':
        g.fillStyle = '#05060f'
        g.fillRect(0, 0, VIEW_W, VIEW_H)
        this.center('LOADING...', 106, '#ffffff', 2)
        return
      case 'title':
        return this.drawTitle()
      case 'select':
        return this.drawSelect()
      case 'intro':
        return this.drawIntro()
      case 'win':
        drawVictory(g, VIEW_W, VIEW_H, this.vt)
        this.center('ALL 10 PLANETS SAVED. THE CATS GOT THEIR ' + upper(config.powerUp.name) + '!', 196, '#ffffff')
        this.center('FINAL SCORE ' + this.score + '   ' + upper(config.coins.name) + ' ' + this.coins, 206, '#ffe46b')
        if (this.vt > 200 && Math.floor(this.frame / 30) % 2 === 0 && !this.reported) this.center('PRESS ENTER', 216, '#9ab8ff')
        return
      default:
        break
    }
    this.drawWorld()
    this.drawHud()
    this.drawOverlay()
  }

  drawWorld() {
    const g = this.g
    const cam = Math.round(this.camX)
    this.art.backdrop.draw(g, this.camX, this.frame)
    g.save()
    g.translate(-cam, 0)
    this.drawDecorations()
    this.drawCheckpoint()
    const G = this.goal
    if (G.x > cam - 60 && G.x < cam + VIEW_W + 20) drawRocket(g, G.x, G.y, this.frame, { open: G.open, flame: G.flame })
    if (this.arrival) drawRocket(g, this.arrival.x, this.arrival.y, this.frame, { open: this.arrival.open, flame: this.arrival.phase === 'descend' ? 0.6 : 0 })
    if (this.leaving) drawRocket(g, this.leaving.x, this.leaving.y, this.frame, { flame: this.leaving.t > 10 ? 1 : 0.3 })
    this.drawTiles(cam)
    this.drawMovers()
    this.drawItems()
    this.drawEnemies()
    for (const m of this.meteors) {
      g.fillStyle = 'rgba(255,160,40,0.45)'
      g.fillRect(Math.round(m.x) + 6, Math.round(m.y) - 8, 4, 8)
      g.drawImage(this.meteorImg, Math.round(m.x) - 1, Math.round(m.y) - 1)
    }
    for (const p of this.players) this.drawPlayer(p)
    this.drawParticles()
    for (const s of this.popups) drawText(g, s.text, s.x - textWidth(s.text) / 2, s.y - s.t * 0.6, '#ffffff')
    g.restore()
    for (const s of this.windStreaks) {
      g.fillStyle = 'rgba(255,255,255,0.35)'
      g.fillRect(Math.round(s.x - cam), Math.round(s.y), Math.round(s.len), 1)
    }
    for (const w of this.warnings) {
      if (Math.floor(w.t / 5) % 2) continue
      const x = Math.round(w.x - cam)
      g.fillStyle = '#ff3a3a'
      g.fillRect(x - 5, 20, 11, 11)
      g.fillStyle = '#ffffff'
      g.fillRect(x, 22, 1, 5)
      g.fillRect(x, 28, 1, 1)
    }
    if (this.flash > 0 && this.flash % 8 < 4) {
      g.fillStyle = 'rgba(255,240,150,0.22)'
      g.fillRect(0, 0, VIEW_W, VIEW_H)
    }
  }

  drawTiles(cam) {
    const g = this.g
    const T = this.art.tiles
    const x0 = Math.floor(cam / TILE)
    const x1 = Math.min(this.level.width - 1, x0 + Math.ceil(VIEW_W / TILE) + 1)
    const blockFrame = Math.floor(this.frame / 10) % 4
    const beltFrame = Math.floor(this.frame / 4) % 4
    const liquidFrame = Math.floor(this.frame / 9) % 4
    for (let ty = 0; ty < ROWS; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const t = this.tiles[ty][tx]
        if (t === '.') continue
        let img
        let ox = 0
        switch (t) {
          case '#': img = ty > 0 && !this.solid(tx, ty - 1) ? T.top : T.ground; break
          case 'B': img = T.panel; break
          case '?': case 'P': img = T.item[blockFrame]; break
          case 'U': img = T.used; break
          case 'S': img = T.block; break
          case '[': img = T.tubeTL; break
          case ']': img = T.tubeTR; break
          case '{': img = T.tubeBL; break
          case '}': img = T.tubeBR; break
          case 'C': {
            img = T.crumble
            const c = this.crumbles.get(`${tx},${ty}`)
            if (c && !c.gone) ox = c.t % 4 < 2 ? -1 : 1
            break
          }
          case 'J': img = this.padAnim.has(`${tx},${ty}`) ? T.padSquash : T.pad; break
          case '<': img = T.belt.l[beltFrame]; break
          case '>': img = T.belt.r[beltFrame]; break
          case '=': img = T.oneway; break
          case 'L': img = this.tileAt(tx, ty - 1) === 'L' ? T.lavaFill[liquidFrame] : T.lavaTop[liquidFrame]; break
          default: continue
        }
        const bump = this.bumps.find((b) => b.tx === tx && b.ty === ty)
        const off = bump ? -Math.round(Math.sin((bump.t / 10) * Math.PI) * 5) : 0
        g.drawImage(img, tx * TILE + ox, ty * TILE + off)
      }
    }
  }

  drawMovers() {
    for (const m of this.movers) {
      if (m.x > this.camX + VIEW_W || m.x + m.w < this.camX) continue
      this.g.drawImage(this.moverImgs[m.w], Math.round(m.x), Math.round(m.y))
      if (this.frame % 20 < 10) {
        this.g.fillStyle = '#3ad0ff'
        this.g.fillRect(Math.round(m.x + m.w / 2) - 1, Math.round(m.y) + 7, 2, 2)
      }
    }
  }

  drawDecorations() {
    const img = this.art.deco
    if (!img) return
    for (const x of this.level.decorations) {
      const px = x * TILE
      if (px < this.camX - 48 || px > this.camX + VIEW_W) continue
      if (!this.solid(x, GROUND) || this.solid(x, GROUND - 1)) continue
      this.g.drawImage(img, px, GROUND * TILE - img.height)
    }
  }

  drawCheckpoint() {
    const cp = this.level.checkpoint
    if (!cp) return
    const x = cp * TILE + 6
    if (x < this.camX - 20 || x > this.camX + VIEW_W + 20) return
    const g = this.g
    g.fillStyle = '#1b1430'
    g.fillRect(x - 1, GROUND * TILE - 34, 5, 34)
    g.fillStyle = '#9aa6b8'
    g.fillRect(x, GROUND * TILE - 34, 3, 34)
    const on = this.checkpointReached
    g.fillStyle = on ? (this.frame % 30 < 20 ? '#3aff7a' : '#1a8a4a') : '#ff3a3a'
    g.fillRect(x - 2, GROUND * TILE - 40, 7, 6)
    g.fillStyle = '#ffffff'
    g.fillRect(x - 1, GROUND * TILE - 39, 2, 1)
  }

  drawItems() {
    const g = this.g
    for (const it of this.items) {
      if (it.x < this.camX - 16 || it.x > this.camX + VIEW_W) continue
      if (it.type === 'coin') {
        const s = Math.abs(Math.cos(this.frame * 0.08 + it.x * 0.1))
        const w = Math.max(2, Math.round(11 * s))
        g.drawImage(this.starImg, Math.round(it.x + 5 - w / 2), Math.round(it.y), w, 10)
      } else {
        if (this.frame % 6 < 3) {
          g.fillStyle = 'rgba(200,150,255,0.45)'
          g.fillRect(Math.round(it.x) - 2, Math.round(it.y) - 2, 14, 15)
        }
        g.drawImage(this.canImg, Math.round(it.x), Math.round(it.y) - 1)
      }
    }
  }

  drawEnemies() {
    for (const e of this.enemies) {
      if (!e.active) continue
      const dir = e.vx > 0 ? 1 : -1
      if (e.state === 'squashed') {
        if (e.ch.source === 'sheet' && e.ch.anims.knocked_out) e.ch.draw(this.g, 'knocked_out', dir, 0, e.x, e.y, e.w, e.h)
        else e.ch.draw(this.g, 'walk', dir, 0, e.x, e.y, e.w, e.h, { squash: true })
      } else if (e.state === 'flipped') e.ch.draw(this.g, 'walk', dir, 0, e.x, e.y, e.w, e.h, { flipY: true })
      else e.ch.draw(this.g, 'walk', dir, e.t / (e.behavior === 'fly' ? 8 : 10), e.x, e.y, e.w, e.h)
    }
  }

  drawPlayer(p) {
    const g = this.g
    if (p.out || p.hidden) return
    const ch = p.ch
    if (p.dead) {
      if (p.bubble > 0) {
        if (p.bubble < 50 && p.bubble % 6 < 3) return
        const bx = Math.round(p.bx)
        const by = Math.round(p.by)
        ch.draw(g, 'idle', 1, 0, bx - p.w / 2, by - p.h / 2, p.w, p.h)
        g.strokeStyle = 'rgba(190,240,255,0.9)'
        g.lineWidth = 1
        g.beginPath()
        g.arc(bx, by, Math.max(p.w, p.h) / 2 + 5, 0, Math.PI * 2)
        g.stroke()
        g.fillStyle = 'rgba(150,220,255,0.18)'
        g.fill()
        g.fillStyle = '#ffffff'
        g.fillRect(bx - 6, by - 9, 2, 2)
        return
      }
      if (p.deathT > 130) return
      ch.draw(g, ch.source === 'sheet' && ch.anims.knocked_out ? 'knocked_out' : 'jump', p.dir, 0, p.x, p.y, p.w, p.h)
      return
    }
    if (p.inv > 0 && Math.floor(p.inv / 4) % 2 === 0) return
    const opts = p.powered ? { glow: '#ffe066' } : {}
    let anim = 'idle'
    let t = 0
    if (!p.onGround) anim = 'jump'
    else if (Math.abs(p.vx) > 0.15) {
      anim = 'walk'
      t = p.anim
    }
    ch.draw(g, anim, p.dir, t, p.x, p.y, p.w, p.h, opts)
    if (this.players.length > 1 && (this.state === 'play' || this.state === 'arrive')) {
      const label = `P${p.idx + 1}`
      const lx = Math.round(p.x + p.w / 2 - textWidth(label) / 2)
      const ly = Math.round(p.y) - 9
      drawText(g, label, lx, ly, P_COLORS[p.idx])
    }
  }

  drawParticles() {
    const g = this.g
    for (const q of this.particles) {
      const x = Math.round(q.x)
      const y = Math.round(q.y)
      if (q.type === 'popstar') {
        const s = Math.abs(Math.cos(q.t * 0.4))
        const w = Math.max(2, Math.round(11 * s))
        g.drawImage(this.starImg, Math.round(q.x + 5 - w / 2), y, w, 10)
      } else if (q.type === 'debris') {
        g.drawImage(this.art.tiles.panel, 0, 0, 8, 8, x, y, 8, 8)
      } else if (q.type === 'falltile') {
        g.globalAlpha = Math.max(0, 1 - q.t / 60)
        g.drawImage(this.art.tiles.crumble, x, y)
        g.globalAlpha = 1
      } else if (q.type === 'dust') {
        g.fillStyle = `rgba(230,230,240,${Math.max(0, 0.7 - q.t / 34)})`
        g.fillRect(x, y, 3, 3)
      } else {
        g.fillStyle = q.col
        g.fillRect(x, y, 2, 2)
      }
    }
  }

  drawHud() {
    const g = this.g
    const accent = config.coins.colors.light
    g.fillStyle = 'rgba(8,6,20,0.6)'
    g.fillRect(0, 0, VIEW_W, 18)
    const p1 = this.players[0]
    const p2 = this.players[1]
    const catLine = (p, x, right) => {
      const c = config.cats[p.cat]
      const name = upper(c.name)
      const nx = right ? x - textWidth(name) : x
      drawText(g, name, nx, 3, c.color)
      const status = p.out ? 'OUT' : p.dead ? '...' : p.powered ? 'MEOW!' : `P${p.idx + 1}`
      const sx = right ? x - textWidth(status) : x
      drawText(g, status, sx, 10, p.powered ? '#d0a0ff' : P_COLORS[p.idx])
    }
    catLine(p1, 6, false)
    drawText(g, 'SCORE', 54, 3, accent)
    drawText(g, String(this.score).padStart(6, '0'), 54, 10, '#ffffff')
    g.drawImage(this.starImg, 86, 5, 9, 9)
    drawText(g, 'x' + String(this.coins).padStart(2, '0'), 97, 7, '#ffffff')
    drawText(g, `PLANET ${this.levelIndex + 1}/${LEVELS.length}`, 122, 3, accent)
    drawText(g, upper(this.planet.name), 122, 10, '#ffffff')
    drawText(g, 'TIME', 254, 3, accent)
    drawText(g, String(Math.max(0, this.time)).padStart(3, '0'), 254, 10, this.time <= 100 ? '#ff8a7a' : '#ffffff')
    drawText(g, 'LIVES', 282, 3, accent)
    drawText(g, 'x' + this.lives, 282, 10, '#ffffff')
    if (p2) catLine(p2, VIEW_W - 6, true)
    else drawText(g, 'P PAUSE', VIEW_W - 6 - textWidth('P PAUSE'), 7, '#7a80a8')
    if (this.audio.muted) drawText(g, 'MUTED', VIEW_W - 26, 21, '#ffffff')
  }

  center(text, y, color = '#ffffff', s = 1, shadow) {
    const fit = Math.max(1, Math.min(s, Math.floor((VIEW_W - 16) / Math.max(1, textWidth(text, 1) + 1))))
    drawText(this.g, text, Math.round((VIEW_W - textWidth(text, fit)) / 2), y, color, fit, shadow)
  }

  // a cat or alien drawn 2x, feet at (cx, by)
  drawBig(ch, anim, t, cx, by, scale = 2, opts = {}) {
    const g = this.g
    g.save()
    g.translate(cx, by)
    g.scale(scale, scale)
    ch.draw(g, anim, 1, t, -ch.hitW / 2, -ch.hitH, ch.hitW, ch.hitH, opts)
    g.restore()
  }

  drawGroundStrip(art, cam) {
    const g = this.g
    const T = art.tiles
    for (let x = -1; x < VIEW_W / TILE + 1; x++) {
      const px = Math.round(x * TILE - (cam % TILE))
      g.drawImage(T.top, px, 192)
      g.drawImage(T.ground, px, 208)
    }
  }

  drawTitle() {
    const g = this.g
    const art = this.planetArt[0]
    const cam = this.frame * 0.35
    art.backdrop.draw(g, cam, this.frame)
    this.drawGroundStrip(art, cam)
    drawRocket(g, 334, 192 - ROCKET.h - 6 + Math.round(Math.sin(this.frame * 0.05) * 3), this.frame, { flame: 0.25 })
    config.cats.forEach((_, i) => {
      const ch = this.chars[`cat${i}`]
      const hop = Math.max(0, Math.sin(this.frame * 0.06 - i * 0.9)) * 10
      this.drawBig(ch, hop > 1 ? 'jump' : 'idle', 0, 40 + i * 52, 192 - Math.round(hop), 1)
    })
    const accent = config.coins.colors.light
    this.center(upper(config.title), 20, accent, 6, '#3a0a5a')
    this.center(upper(config.subtitle), 58, '#ffffff')
    ;(config.story || []).slice(0, 2).forEach((line, i) => this.center(upper(line), 70 + i * 9, '#c9d4ff'))
    const opts = ['1 PLAYER', '2 PLAYERS']
    opts.forEach((o, i) => {
      const sel = this.menu === i
      const w = textWidth(o, 2)
      const x = Math.round((VIEW_W - w) / 2)
      drawText(g, o, x, 96 + i * 16, sel ? accent : '#7a80a8', 2)
      if (sel) g.drawImage(this.starImg, x - 16, 96 + i * 16, 10, 10)
    })
    if (Math.floor(this.frame / 30) % 2 === 0) this.center('PRESS ENTER', 134, '#ffffff')
    this.center('P1: ARROWS MOVE, UP JUMP, RIGHT SHIFT RUN', 200, P_COLORS[0])
    this.center('P2: A / D MOVE, W JUMP, SPACE RUN      P PAUSE  M MUTE', 210, P_COLORS[1])
  }

  drawSelect() {
    const g = this.g
    const art = this.planetArt[0]
    art.backdrop.draw(g, this.frame * 0.2, this.frame)
    g.fillStyle = 'rgba(5,6,15,0.55)'
    g.fillRect(0, 0, VIEW_W, VIEW_H)
    const accent = config.coins.colors.light
    this.center(this.numPlayers === 1 ? 'CHOOSE YOUR CAT' : 'CHOOSE YOUR CATS', 14, accent, 2)
    const n = config.cats.length
    const sw = 68
    const gap = 8
    const x0 = Math.round((VIEW_W - (n * sw + (n - 1) * gap)) / 2)
    config.cats.forEach((c, i) => {
      const x = x0 + i * (sw + gap)
      const y = 40
      const h = 108
      const owners = this.sel.map((s, j) => (s.cursor === i ? j : -1)).filter((j) => j >= 0)
      const lockedBy = this.sel.findIndex((s) => s.locked && s.cursor === i)
      g.fillStyle = lockedBy >= 0 ? 'rgba(60,40,110,0.85)' : 'rgba(20,16,44,0.8)'
      g.fillRect(x, y, sw, h)
      owners.forEach((j, k) => {
        g.fillStyle = P_COLORS[j]
        const inset = k * 3
        g.fillRect(x + inset, y + inset, sw - inset * 2, 2)
        g.fillRect(x + inset, y + h - 2 - inset, sw - inset * 2, 2)
        g.fillRect(x + inset, y + inset, 2, h - inset * 2)
        g.fillRect(x + sw - 2 - inset, y + inset, 2, h - inset * 2)
        drawText(g, `P${j + 1}`, j === 0 ? x + 5 : x + sw - 12, y + 5, P_COLORS[j])
      })
      const ch = this.chars[`cat${i}`]
      const hovered = owners.length > 0
      const hop = lockedBy >= 0 ? Math.max(0, Math.sin(this.frame * 0.15)) * 6 : 0
      this.drawBig(ch, lockedBy >= 0 ? (hop > 1 ? 'jump' : 'idle') : hovered ? 'walk' : 'idle', this.frame / 8, x + sw / 2, y + 86 - Math.round(hop), 2)
      const name = upper(c.name)
      drawText(g, name, Math.round(x + sw / 2 - textWidth(name) / 2), y + 93, c.color)
      if (lockedBy >= 0) {
        const r = 'READY'
        drawText(g, r, Math.round(x + sw / 2 - textWidth(r) / 2), y + 116, P_COLORS[lockedBy])
      }
    })
    if (this.numPlayers === 1) {
      this.center('LEFT / RIGHT CHOOSE    UP OR ENTER CONFIRM', 176, '#ffffff')
    } else {
      this.center('P1: LEFT / RIGHT, UP TO CONFIRM', 172, P_COLORS[0])
      this.center('P2: A / D, W TO CONFIRM', 182, P_COLORS[1])
      this.center('DOWN / S TO CHANGE YOUR MIND', 192, '#c9d4ff')
    }
    this.center('ESC BACK', 206, '#7a80a8')
  }

  drawIntro() {
    const g = this.g
    const pi = this.introPlanet
    const P = config.planets[pi]
    const art = this.planetArt[pi]
    art.backdrop.draw(g, (200 - this.timer) * 0.3, this.frame)
    g.fillStyle = 'rgba(5,6,15,0.55)'
    g.fillRect(0, 0, VIEW_W, VIEW_H)
    const accent = config.coins.colors.light
    this.center(`PLANET ${this.levelIndex + 1} OF ${LEVELS.length}`, 16, accent)
    this.center(upper(P.name), 28, '#ffffff', 3, '#3a0a5a')
    const L = this.introLevel
    const tags = []
    const has = (ch) => L.tiles.some((r) => r.includes(ch))
    if ((P.gravity ?? 1) < 1) tags.push('LOW GRAVITY')
    if (P.slippery) tags.push('SLIPPERY ICE')
    if (L.meteorZones.length) tags.push('METEOR SHOWERS')
    if (L.windZones.length) tags.push('STRONG WINDS')
    if (has('L')) tags.push(LIQUID_NAME[P.terrain] || 'LAVA')
    if (L.movers.length) tags.push('MOVING PLATFORMS')
    if (has('<') || has('>')) tags.push('CONVEYOR BELTS')
    if (has('C')) tags.push('CRUMBLING FLOORS')
    if (has('J')) tags.push('BOUNCE PADS')
    this.center(tags.slice(0, 3).join('  -  '), 56, '#9ab8ff')
    ROLES.forEach((role, i) => {
      const ch = this.chars[`e${pi}_${role}`]
      const cx = 100 + i * 100
      const by = role === 'flyer' ? 112 + Math.round(Math.sin(this.frame * 0.08) * 3) : 120
      this.drawBig(ch, 'walk', this.frame / 9, cx, by, 2)
      const name = upper(P.enemies[role].name)
      drawText(g, name, Math.round(cx - textWidth(name) / 2), 128, '#ffb0c8')
    })
    const n = this.players.length
    this.players.forEach((p, i) => {
      const cx = VIEW_W / 2 - (n - 1) * 20 + i * 40 - 20
      this.drawBig(p.ch, 'idle', 0, cx, 176, 1, p.powered ? { glow: '#ffe066' } : {})
    })
    drawText(g, 'x ' + this.lives, Math.round(VIEW_W / 2 + (n - 1) * 20 + 4), 164, '#ffffff', 2)
    if (this.checkpointReached) this.center('STARTING FROM CHECKPOINT', 192, '#c9d4ff')
    if (this.timer < 170) this.center('PRESS JUMP TO LAND', 208, '#7a80a8')
  }

  drawOverlay() {
    const g = this.g
    const accent = config.coins.colors.light
    if (this.state === 'paused') {
      g.fillStyle = 'rgba(5,6,15,0.6)'
      g.fillRect(0, 0, VIEW_W, VIEW_H)
      this.center('PAUSED', 90, accent, 3)
      this.center('PRESS P TO CONTINUE', 122, '#ffffff')
    } else if (this.state === 'gameover') {
      g.fillStyle = 'rgba(5,6,15,0.85)'
      g.fillRect(0, 0, VIEW_W, VIEW_H)
      this.center('GAME OVER', 80, '#e0483e', 4)
      this.center('SCORE ' + this.score, 120, '#ffffff', 2)
    }
  }
}
