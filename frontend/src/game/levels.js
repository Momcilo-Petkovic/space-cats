// ============================================================================
//  SPACE CATS levels: one per planet (see config.planets).
//
//  The map is 14 tiles tall: row 0 is the top, the ground is rows 12-13.
//  Something standing on the ground sits on row 11. Cats are ~1.5 tiles tall
//  and jump about 4 rows high (more in low gravity, much more from a bounce pad).
//
//  BUILDER COMMANDS (all chainable):
//    L.ground(x0, x1)          solid ground, rows 12-13
//    L.island(x0, x1, y)       floating ground, 2 rows thick starting at row y
//    L.blocks(x, y, 'B?BP')    B panel, ? star block, P power-up block, S solid block, C crumbling, J bounce pad
//    L.row(x0, x1, y, ch)      a line of one tile type
//    L.crumble(x0, x1, y)      platforms that fall a moment after you step on them (they come back)
//    L.pad(x, y = 11)          bounce pad (launches about 7 rows up)
//    L.belt(x0, x1, y, dir)    conveyor belt, dir -1 pushes left, 1 pushes right
//    L.cloud(x0, x1, y)        jump-through platform: solid from above only
//    L.lava(x0, x1)            deadly pool (lava / goo / plasma, colored per planet)
//    L.pipe(x, h)              2-wide tube standing on the ground
//    L.stairs(x, n, dir)       staircase, dir 1 up / -1 down
//    L.mover(x, y, w, axis, range, speed)   moving platform w tiles wide, moving `range` tiles
//                              along 'x' (right) or 'y' (up) and back
//    L.meteors(x0, x1)         meteors fall from the sky while the cats are in this stretch
//    L.wind(x0, x1, force)     wind pushes cats (positive = right)
//    L.coins(x0, x1, y)        a row of stars; L.arc(x, y, n) an arc of n stars
//    L.enemy(role, x, y)       role: 'walker' | 'hopper' | 'flyer' (flyers need y 3-7)
//    L.decorate(x...)          background props on the ground
//    L.checkpoint = x          respawn column after losing a life
//    L.finish(x)               REQUIRED: landing pad from x to x+8 with the rocket at x+2
//
//  The rocket drops the cats off at the start (columns 0-6 must be flat ground, nothing above).
// ============================================================================

export const ROWS = 14
export const GROUND = 12

export function createLevel(width) {
  const tiles = []
  for (let y = 0; y < ROWS; y++) tiles.push(new Array(width).fill('.'))
  const L = {
    width,
    tiles,
    entities: [],
    movers: [],
    meteorZones: [],
    windZones: [],
    decorations: [],
    start: { x: 4, y: GROUND - 1 },
    rocketStartX: 1,
    checkpoint: null,
    rocketX: 0,
    set(x, y, ch) {
      if (x >= 0 && x < width && y >= 0 && y < ROWS) tiles[y][x] = ch
      return L
    },
    ground(x0, x1) {
      for (let x = x0; x <= x1; x++) L.set(x, GROUND, '#').set(x, GROUND + 1, '#')
      return L
    },
    island(x0, x1, y) {
      for (let x = x0; x <= x1; x++) L.set(x, y, '#').set(x, y + 1, '#')
      return L
    },
    row(x0, x1, y, ch) {
      for (let x = x0; x <= x1; x++) L.set(x, y, ch)
      return L
    },
    blocks(x, y, pattern) {
      ;[...pattern].forEach((ch, i) => ch !== ' ' && L.set(x + i, y, ch))
      return L
    },
    crumble(x0, x1, y) {
      return L.row(x0, x1, y, 'C')
    },
    pad(x, y = GROUND - 1) {
      return L.set(x, y, 'J')
    },
    belt(x0, x1, y, dir) {
      return L.row(x0, x1, y, dir < 0 ? '<' : '>')
    },
    cloud(x0, x1, y) {
      return L.row(x0, x1, y, '=')
    },
    lava(x0, x1) {
      for (let x = x0; x <= x1; x++) L.set(x, GROUND, 'L').set(x, GROUND + 1, 'L')
      return L
    },
    pipe(x, h) {
      const top = GROUND - h
      L.set(x, top, '[').set(x + 1, top, ']')
      for (let y = top + 1; y < GROUND; y++) L.set(x, y, '{').set(x + 1, y, '}')
      return L
    },
    stairs(x, n, dir = 1) {
      for (let i = 0; i < n; i++) {
        const h = dir === 1 ? i + 1 : n - i
        for (let k = 0; k < h; k++) L.set(x + i, GROUND - 1 - k, 'S')
      }
      return L
    },
    mover(x, y, w, axis, range, speed = 0.6) {
      L.movers.push({ x, y, w, axis, range, speed })
      return L
    },
    meteors(x0, x1) {
      L.meteorZones.push([x0, x1])
      return L
    },
    wind(x0, x1, force) {
      L.windZones.push([x0, x1, force])
      return L
    },
    coins(x0, x1, y) {
      for (let x = x0; x <= x1; x++) L.entities.push({ type: 'coin', x, y })
      return L
    },
    arc(x, y, n) {
      for (let i = 0; i < n; i++) {
        const t = (i / Math.max(1, n - 1)) * 2 - 1
        L.entities.push({ type: 'coin', x: x + i, y: y + Math.round(t * t * 2) })
      }
      return L
    },
    enemy(role, x, y = GROUND - 1) {
      L.entities.push({ type: 'enemy', kind: role, x, y })
      return L
    },
    decorate(...xs) {
      L.decorations.push(...xs)
      return L
    },
    finish(x) {
      L.ground(x, x + 8)
      for (let cx = x; cx <= x + 8; cx++) for (let y = 0; y < GROUND; y++) L.set(cx, y, '.')
      L.rocketX = x + 2
      return L
    },
  }
  return L
}

// ---------------------------------------------------------------- 1. LUNA BASE: low gravity
function luna() {
  const L = createLevel(200)
  L.ground(0, 22).ground(29, 48).ground(55, 71).ground(78, 100).ground(107, 130).ground(137, 160).ground(166, 199)
  L.decorate(8, 36, 62, 90, 118, 150, 170)
  L.blocks(11, 8, '?P?')
  L.arc(23, 6, 6)
  L.row(33, 37, 6, 'B').coins(33, 37, 5)
  L.enemy('walker', 42).enemy('hopper', 60)
  L.arc(49, 5, 6)
  L.row(62, 64, 7, 'S').row(67, 69, 4, 'S').coins(67, 69, 3)
  L.arc(72, 6, 6)
  L.row(84, 87, 7, 'S').row(91, 94, 4, 'S').coins(91, 94, 3)
  L.enemy('walker', 88).enemy('flyer', 97, 6)
  L.checkpoint = 109
  L.blocks(112, 8, 'B?B?B').blocks(114, 4, 'P')
  L.enemy('walker', 120).enemy('hopper', 125)
  L.arc(131, 5, 6)
  L.row(140, 142, 8, 'B').row(145, 147, 5, 'B').row(150, 152, 2, 'B').coins(150, 152, 1)
  L.enemy('flyer', 145, 3).enemy('walker', 155)
  L.arc(161, 6, 5)
  L.enemy('hopper', 172).enemy('walker', 176)
  L.finish(184)
  return L
}

// ---------------------------------------------------------------- 2. MARS DUNES: geysers and crumbling bridges
function mars() {
  const L = createLevel(205)
  L.ground(0, 30).crumble(31, 37, 12).ground(38, 62).ground(67, 84).ground(89, 120).ground(133, 168).ground(172, 204)
  L.decorate(10, 45, 74, 100, 140, 160, 180)
  L.blocks(14, 8, '??').coins(31, 37, 10)
  L.enemy('walker', 22)
  L.pad(48).row(51, 60, 5, 'S').blocks(54, 5, 'P').coins(52, 59, 4)
  L.enemy('hopper', 44).enemy('walker', 56, 4)
  L.crumble(63, 66, 10)
  L.enemy('walker', 72).enemy('walker', 78)
  L.crumble(85, 88, 9).coins(85, 88, 8)
  L.checkpoint = 92
  L.pad(98).blocks(96, 8, 'B?B').row(102, 108, 4, 'B').coins(102, 108, 3)
  L.pad(112).enemy('hopper', 105).enemy('flyer', 114, 5)
  L.crumble(124, 125, 9).crumble(129, 130, 9).coins(124, 130, 7)
  L.enemy('walker', 140).enemy('hopper', 148).pad(152).row(155, 160, 4, 'S').coins(155, 160, 3)
  L.blocks(157, 8, '?P?').enemy('walker', 163)
  L.crumble(169, 171, 11)
  L.enemy('flyer', 178, 5).enemy('walker', 182)
  L.finish(190)
  return L
}

// ---------------------------------------------------------------- 3. FROSTBITE COMET: slippery ice, tiny ledges
function frost() {
  const L = createLevel(210)
  L.ground(0, 25).ground(30, 44).ground(49, 51).ground(56, 58).ground(63, 82).ground(87, 89).ground(94, 120)
  L.ground(125, 127).ground(131, 133).ground(137, 160).ground(165, 209)
  L.decorate(8, 36, 70, 100, 145, 175)
  L.blocks(12, 8, 'B?B').coins(26, 29, 10)
  L.enemy('walker', 38)
  L.coins(49, 51, 10).coins(56, 58, 10)
  L.stairs(66, 3).row(71, 73, 6, 'S').row(76, 78, 4, 'S').coins(76, 78, 3).stairs(79, 3, -1)
  L.enemy('hopper', 70).enemy('flyer', 85, 6)
  L.coins(87, 89, 9)
  L.checkpoint = 96
  L.pipe(100, 2).pipe(106, 3).pipe(112, 4).enemy('walker', 104).enemy('walker', 110)
  L.blocks(103, 6, 'P')
  L.row(121, 123, 9, 'S').coins(125, 127, 10).row(128, 129, 8, 'S').coins(131, 133, 10).row(134, 135, 9, 'S')
  L.enemy('flyer', 130, 5)
  L.blocks(142, 8, '?B?B?').enemy('hopper', 150).enemy('walker', 156)
  L.row(161, 163, 9, 'S').coins(161, 163, 8)
  L.enemy('walker', 172).enemy('hopper', 180).enemy('flyer', 186, 5)
  L.finish(195)
  return L
}

// ---------------------------------------------------------------- 4. VERDANIA JUNGLE: moving platforms over goo
function verdania() {
  const L = createLevel(215)
  L.ground(0, 24).lava(25, 46).ground(47, 72).lava(73, 94).ground(95, 122).lava(123, 150).ground(151, 214)
  L.decorate(6, 14, 52, 66, 100, 116, 160, 175, 190)
  L.blocks(12, 8, '?P?')
  L.mover(27, 10, 3, 'x', 14, 0.55).coins(30, 40, 8)
  L.enemy('walker', 55).pad(60).row(62, 68, 4, 'B').coins(62, 68, 3).enemy('walker', 66, 3)
  L.enemy('flyer', 70, 5)
  L.mover(75, 9, 2, 'x', 6, 0.6).mover(86, 8, 2, 'x', 5, 0.7)
  L.checkpoint = 97
  L.enemy('hopper', 104).blocks(106, 8, 'B?B').pad(112).row(114, 119, 4, 'S').coins(114, 119, 3)
  L.enemy('walker', 118)
  L.mover(124, 10, 2, 'x', 5, 0.6).mover(133, 7, 2, 'y', 3, 0.5).mover(137, 10, 2, 'x', 10, 0.7)
  L.coins(133, 134, 5).enemy('flyer', 137, 4)
  L.enemy('walker', 158).enemy('hopper', 166).blocks(170, 8, '?P?').enemy('walker', 176)
  L.pad(182).row(184, 188, 5, 'B').coins(184, 188, 4)
  L.enemy('flyer', 186, 3)
  L.finish(200)
  return L
}

// ---------------------------------------------------------------- 5. ASTEROID BELT: floating rocks, elevators, meteors
function asteroids() {
  const L = createLevel(210)
  L.ground(0, 20).island(25, 30, 10).island(35, 39, 8).island(44, 52, 10).ground(56, 70)
  L.island(75, 79, 9).island(84, 88, 7).island(93, 101, 10).ground(105, 122)
  L.island(127, 133, 9).island(146, 151, 9).ground(156, 209)
  L.decorate(150)
  L.coins(25, 30, 9).coins(35, 39, 7).enemy('walker', 48, 9)
  L.blocks(46, 6, 'P')
  L.meteors(56, 125).enemy('hopper', 63).blocks(60, 8, 'B?B')
  L.coins(84, 88, 6).enemy('flyer', 90, 4).enemy('walker', 97, 9)
  L.checkpoint = 108
  L.enemy('walker', 114).enemy('hopper', 119).blocks(112, 8, '?B?')
  L.mover(136, 11, 2, 'y', 6, 0.5).mover(140, 5, 3, 'x', 4, 0.5).coins(140, 143, 4)
  L.enemy('flyer', 138, 4)
  L.meteors(156, 195).enemy('walker', 165).enemy('walker', 172).blocks(168, 8, '?P?').enemy('hopper', 180)
  L.finish(195)
  return L
}

// ---------------------------------------------------------------- 6. ORBITAL STATION: conveyors and catwalks
function station() {
  const L = createLevel(215)
  L.ground(0, 70).ground(75, 140).ground(145, 214)
  L.row(10, 185, 0, 'B').row(10, 185, 1, 'B')
  L.decorate(14, 60, 100, 150)
  L.belt(14, 30, GROUND, 1).coins(16, 28, 10)
  L.enemy('walker', 26).cloud(32, 40, 8).cloud(42, 50, 5).coins(42, 50, 4).enemy('walker', 46, 4)
  L.belt(52, 70, GROUND, -1).enemy('walker', 62).blocks(58, 8, '?P?')
  L.cloud(71, 74, 9)
  L.pipe(80, 2).pipe(86, 3).enemy('hopper', 92).enemy('flyer', 96, 5)
  L.checkpoint = 100
  L.belt(104, 124, GROUND, -1).cloud(106, 112, 8).cloud(116, 122, 5).coins(116, 122, 4).enemy('walker', 110, 7)
  L.blocks(114, 8, 'B?B').enemy('walker', 120)
  L.cloud(136, 149, 8).coins(141, 144, 7)
  L.belt(150, 170, GROUND, 1).cloud(151, 154, 9).enemy('hopper', 160).enemy('walker', 166).cloud(156, 164, 6).blocks(158, 3, 'P')
  L.enemy('flyer', 176, 5)
  L.finish(196)
  return L
}

// ---------------------------------------------------------------- 7. MAGMARA: lava, crumbling bridges, fireball rain
function magmara() {
  const L = createLevel(215)
  L.ground(0, 24).lava(25, 28).ground(29, 50).lava(51, 66).ground(67, 90).lava(91, 104).ground(105, 130)
  L.lava(131, 146).ground(147, 214)
  L.decorate(10, 40, 75, 115, 160, 180)
  L.blocks(12, 8, '?P?').coins(25, 28, 9)
  L.enemy('walker', 38).enemy('hopper', 45)
  L.crumble(52, 54, 10).crumble(58, 60, 9).crumble(63, 65, 10).coins(58, 60, 8)
  L.enemy('walker', 75).pad(80).row(82, 88, 4, 'B').coins(82, 88, 3).enemy('flyer', 86, 6)
  L.meteors(67, 130)
  L.crumble(92, 95, 10).crumble(99, 102, 10)
  L.checkpoint = 107
  L.blocks(110, 8, 'B?B?B').enemy('walker', 115).enemy('hopper', 122)
  L.mover(133, 10, 2, 'x', 10, 0.6).crumble(138, 139, 7).coins(138, 139, 6)
  L.enemy('walker', 155).enemy('walker', 160).blocks(163, 8, '?P?').enemy('hopper', 170)
  L.meteors(150, 195).enemy('flyer', 178, 5)
  L.finish(198)
  return L
}

// ---------------------------------------------------------------- 8. NIMBUS GIANT: clouds and wind
function nimbus() {
  const L = createLevel(215)
  L.ground(0, 16).cloud(20, 30, 12).cloud(34, 40, 10).cloud(44, 56, 12).cloud(60, 64, 9).cloud(68, 82, 11)
  L.cloud(86, 90, 8).ground(94, 112).cloud(116, 126, 11).cloud(130, 134, 8).cloud(138, 150, 11)
  L.cloud(154, 158, 9).cloud(162, 172, 12).ground(176, 214)
  L.blocks(8, 8, '?P?').coins(20, 30, 11)
  L.wind(20, 56, 0.6).enemy('flyer', 38, 6).enemy('walker', 50, 11)
  L.coins(60, 64, 8).enemy('flyer', 66, 4)
  L.wind(68, 92, -0.7).enemy('walker', 75, 10).coins(86, 90, 7)
  L.checkpoint = 97
  L.blocks(100, 8, 'B?B').enemy('hopper', 106)
  L.wind(116, 172, 0.5).enemy('flyer', 120, 5).enemy('walker', 145, 10).enemy('flyer', 152, 4)
  L.coins(130, 134, 7).coins(154, 158, 8).blocks(132, 4, 'P')
  L.enemy('flyer', 168, 6).enemy('walker', 182)
  L.finish(198)
  return L
}

// ---------------------------------------------------------------- 9. PRISMA: crystal bounces, everything mixed
function prisma() {
  const L = createLevel(215)
  L.ground(0, 22).lava(23, 34).ground(35, 60).ground(65, 80).lava(81, 98).ground(99, 125).ground(130, 145)
  L.lava(146, 160).ground(161, 214)
  L.decorate(8, 45, 70, 110, 140, 170, 185)
  L.blocks(12, 8, '?P?')
  L.pad(20).row(24, 26, 5, 'S').crumble(29, 31, 6).coins(24, 31, 4)
  L.enemy('walker', 42).enemy('hopper', 50).pad(56).row(58, 63, 4, 'B').coins(58, 63, 3)
  L.crumble(61, 64, 10)
  L.enemy('flyer', 72, 5).enemy('walker', 76)
  L.mover(82, 10, 2, 'x', 6, 0.7).pad(90, 9).row(89, 91, 10, 'S').mover(93, 7, 2, 'y', 3, 0.6).coins(93, 94, 4)
  L.checkpoint = 102
  L.belt(104, 118, GROUND, -1).enemy('walker', 110).enemy('hopper', 116).blocks(108, 8, 'B?P?B')
  L.crumble(126, 129, 11).enemy('flyer', 135, 5)
  L.crumble(147, 149, 10).crumble(153, 155, 9).crumble(158, 160, 10).coins(153, 155, 8)
  L.enemy('walker', 168).enemy('walker', 174).pad(178).row(180, 186, 4, 'B').coins(180, 186, 3).enemy('hopper', 184, 3)
  L.finish(198)
  return L
}

// ---------------------------------------------------------------- 10. THE MOTHERSHIP: the final gauntlet
function mothership() {
  const L = createLevel(230)
  L.ground(0, 26).lava(27, 40).ground(41, 70).lava(71, 86).ground(87, 118).lava(119, 140).ground(141, 168)
  L.lava(169, 186).ground(187, 229)
  L.row(12, 210, 0, 'B').row(12, 210, 1, 'B')
  L.decorate(10, 50, 95, 150, 195)
  L.blocks(14, 8, '?P?').enemy('walker', 22)
  L.mover(29, 10, 2, 'x', 9, 0.75).coins(30, 39, 8)
  L.belt(44, 60, GROUND, -1).enemy('hopper', 50).enemy('walker', 56).cloud(46, 54, 8).coins(46, 54, 7)
  L.pad(65).row(62, 64, 5, 'B').blocks(66, 5, 'P').enemy('flyer', 68, 4)
  L.crumble(72, 74, 10).crumble(78, 80, 9).crumble(84, 86, 10)
  L.checkpoint = 90
  L.enemy('walker', 96).enemy('walker', 100).enemy('hopper', 106).blocks(98, 8, 'B?B?B').belt(108, 118, GROUND, 1)
  L.mover(121, 10, 2, 'x', 6, 0.8).mover(131, 7, 2, 'y', 3, 0.6).crumble(136, 139, 10).coins(131, 132, 4)
  L.enemy('flyer', 128, 4).meteors(141, 168)
  L.cloud(144, 150, 8).cloud(154, 160, 5).coins(154, 160, 4).enemy('hopper', 148).enemy('walker', 158).enemy('walker', 164)
  L.pad(167).crumble(171, 173, 6).mover(176, 9, 2, 'x', 7, 0.8).crumble(184, 186, 10).coins(171, 173, 5)
  L.enemy('flyer', 180, 4)
  L.enemy('walker', 194).enemy('hopper', 200).blocks(197, 8, '?P?').enemy('flyer', 204, 5)
  L.finish(214)
  return L
}

// One level per planet, in order.
export const LEVELS = [luna, mars, frost, verdania, asteroids, station, magmara, nimbus, prisma, mothership].map(
  (build, i) => ({ planet: i, build }),
)

// ---------------------------------------------------------------- validation (npm run check)

export const SOLID = new Set(['#', 'B', '?', 'P', 'U', 'S', '[', ']', '{', '}', 'C', 'J', '<', '>'])

export function validateLevel(L, planet = {}) {
  const errors = []
  const warnings = []
  const g = planet.gravity || 1
  const rise = Math.floor(4 / g + 0.05)
  const reach = Math.min(8, Math.floor(5 / g + 0.05))
  const padRise = Math.min(10, Math.floor(7 / g))
  const at = (x, y) => (y >= 0 && y < ROWS && x >= 0 && x < L.width ? L.tiles[y][x] : '.')
  const solid = (x, y) => SOLID.has(at(x, y))
  const top = (x, y) => solid(x, y) || at(x, y) === '='
  const standable = (x, y) => top(x, y) && !solid(x, y - 1) && !solid(x, y - 2)

  if (L.width < 120 || L.width > 400) warnings.push(`width ${L.width} is unusual (120-400 works best)`)
  if (!L.rocketX) errors.push('missing L.finish(x) at the end of the level')
  else if (L.rocketX + 8 > L.width) errors.push(`L.finish(${L.rocketX - 2}) is too close to the end: use L.finish(${L.width - 12}) or smaller`)
  for (let x = 0; x <= 6; x++) {
    if (!solid(x, GROUND)) errors.push(`column ${x}: the rocket landing area (columns 0-6) needs ground`)
    for (let y = 0; y < GROUND; y++) if (x <= 3 && solid(x, y)) errors.push(`column ${x}, row ${y}: the rocket needs empty sky above columns 0-3`)
  }
  if (L.checkpoint != null && (!solid(L.checkpoint, GROUND) || solid(L.checkpoint, GROUND - 1)))
    errors.push(`checkpoint at column ${L.checkpoint} has no ground or is inside a block`)

  // surfaces, including moving platform paths
  const surf = Array.from({ length: L.width }, () => new Map())
  for (let x = 0; x < L.width; x++) for (let y = 1; y <= GROUND; y++) if (standable(x, y)) surf[x].set(y, at(x, y))
  for (const m of L.movers) {
    for (let s = 0; s <= m.range; s++) {
      for (let i = 0; i < m.w; i++) {
        const x = m.axis === 'x' ? m.x + s + i : m.x + i
        const y = m.axis === 'y' ? m.y - s : m.y
        if (x >= 0 && x < L.width && y > 0 && y <= GROUND) surf[x].set(y, 'M')
      }
    }
  }

  // pits
  const maxPit = Math.floor(4 / g + 0.05)
  let run = 0
  for (let x = 0; x <= L.width; x++) {
    if (x < L.width && surf[x].size === 0) run++
    else {
      if (run > maxPit) errors.push(`gap from column ${x - run} to ${x - 1} is ${run} tiles wide with nothing to stand on (max ${maxPit} here)`)
      run = 0
    }
  }

  // reachability from the start
  const key = (x, y) => y * 10000 + x
  const seen = new Set([key(L.start.x, GROUND)])
  const queue = [[L.start.x, GROUND]]
  while (queue.length) {
    const [x, y] = queue.pop()
    const up = surf[x].get(y) === 'J' ? padRise : rise
    const r = surf[x].get(y) === 'J' ? reach + 2 : reach
    for (let nx = Math.max(0, x - r); nx <= Math.min(L.width - 1, x + r); nx++) {
      for (const ny of surf[nx].keys()) {
        if (y - ny > up || seen.has(key(nx, ny))) continue
        if (ny < y - 1 && Math.abs(nx - x) <= 1 && solid(x, y - 3)) continue
        seen.add(key(nx, ny))
        queue.push([nx, ny])
      }
    }
  }
  const unreachable = []
  for (let x = 0; x < L.width; x++) for (const y of surf[x].keys()) if (!seen.has(key(x, y)) && surf[x].get(y) !== 'M') unreachable.push([x, y])
  const reported = []
  unreachable.forEach(([x, y], i) => {
    if (i > 0 && unreachable[i - 1][1] === y && unreachable[i - 1][0] === x - 1) return
    reported.push(`platform at column ${x}, row ${y} can't be reached`)
  })
  warnings.push(...reported.slice(0, 5))
  if (reported.length > 5) warnings.push(`...and ${reported.length - 5} more unreachable platforms`)
  if (L.rocketX && ![...surf[L.rocketX].keys()].some((y) => seen.has(key(L.rocketX, y))))
    errors.push(`the rocket at column ${L.rocketX} can't be reached from the start`)

  for (let x = 0; x < L.width; x++) {
    for (let y = 1; y < ROWS; y++) {
      const t = L.tiles[y][x]
      if ((t === '?' || t === 'P') && solid(x, y + 1)) warnings.push(`item block at column ${x}, row ${y} can't be hit from below`)
    }
  }
  for (const e of L.entities) {
    if (e.x < 0 || e.x >= L.width || e.y < 0 || e.y >= ROWS) {
      errors.push(`${e.type} at column ${e.x}, row ${e.y} is outside the level`)
      continue
    }
    if (solid(e.x, e.y)) errors.push(`${e.kind || e.type} at column ${e.x}, row ${e.y} is inside a block`)
    if (e.type === 'enemy') {
      if (!['walker', 'hopper', 'flyer'].includes(e.kind)) errors.push(`unknown enemy role '${e.kind}' at column ${e.x}`)
      else if (e.kind !== 'flyer') {
        let floor = false
        for (let y = e.y + 1; y < ROWS; y++) if (top(e.x, y)) floor = true
        if (!floor) warnings.push(`${e.kind} at column ${e.x} has no floor under it`)
      } else if (e.y > 9) warnings.push(`flyer at column ${e.x} is very low (use row 3-7)`)
      if (Math.abs(e.x - L.start.x) < 8) warnings.push(`${e.kind} at column ${e.x} is very close to the start`)
    }
  }
  return { errors, warnings }
}
