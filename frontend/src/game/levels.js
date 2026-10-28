// ============================================================================
//  LEVELS: the second file to edit when making a new game.
//
//  The map is 14 tiles tall. Rows go from 0 (top of the screen) to 13 (bottom).
//  The ground is rows 12-13. Something standing on the ground sits on row 11.
//  The player is about 2 tiles tall and jumps about 4 tiles high (5 with a run-up).
//
//  BUILDER COMMANDS (x = column, y = row; all chainable: L.ground(0, 40).pipe(20, 2)):
//    L.ground(x0, x1)            solid ground from column x0 to x1. Leave gaps for pits (max 4 wide).
//    L.blocks(x, y, 'B?BPB')     a row of blocks starting at (x, y): B brick, ? item block, P power-up block,
//                                S stone, space = nothing. Put item blocks at row 8 (or row 4 above other blocks).
//    L.row(x0, x1, y, 'S')       a horizontal line of one block type (platforms, bridges).
//    L.pipe(x, h)                a 2-wide pipe of height h (2-4) standing on the ground.
//    L.stairs(x, n, dir)         a staircase n steps high; dir 1 = going up, -1 = going down.
//    L.coins(x0, x1, y)          a row of collectibles in the air at row y.
//    L.enemy(type, x, y)         an enemy; type is a key from config.enemies. y defaults to 11 (on the ground).
//                                Flying enemies need a y in the air (3-7).
//    L.decorate(x1, x2, ...)     background decorations standing on the ground at these columns.
//    L.checkpoint = x            respawn point after dying (must be above ground).
//    L.finish(x)                 REQUIRED, last: final staircase at x, then flag and goal building.
//                                Needs the level width to be at least x + 26.
//
//  After editing, run `npm run check` in the frontend folder and fix everything it reports.
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
    decorations: [],
    start: { x: 3, y: GROUND - 1 },
    checkpoint: null,
    flagX: 0,
    houseX: 0,
    set(x, y, ch) {
      if (x >= 0 && x < width && y >= 0 && y < ROWS) tiles[y][x] = ch
      return L
    },
    ground(x0, x1) {
      for (let x = x0; x <= x1; x++) L.set(x, GROUND, '#').set(x, GROUND + 1, '#')
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
    coins(x0, x1, y) {
      for (let x = x0; x <= x1; x++) L.entities.push({ type: 'coin', x, y })
      return L
    },
    enemy(type, x, y = GROUND - 1) {
      L.entities.push({ type: 'enemy', kind: type, x, y })
      return L
    },
    decorate(...xs) {
      L.decorations.push(...xs)
      return L
    },
    finish(stairsX) {
      L.stairs(stairsX, 8)
      L.flagX = stairsX + 8 + 4
      L.set(L.flagX, GROUND - 1, 'S')
      L.houseX = L.flagX + 5
      return L
    },
  }
  return L
}

// ---------------------------------------------------------------- the levels

function level1() {
  const L = createLevel(200)
  L.ground(0, 30).ground(35, 60).ground(65, 90).ground(95, 120).ground(125, 150).ground(155, 200)
  L.decorate(5, 15, 38, 50, 75, 90, 110, 130, 155, 175)

  // Level 1: Green Hills
  L.blocks(10, 8, '?')
  L.coins(12, 14, 6)
  L.enemy('walker', 16)
  
  L.blocks(22, 8, 'B?BPB')
  L.enemy('walker', 25).enemy('hopper', 30)
  L.coins(24, 27, 7)

  L.pipe(38, 2).pipe(45, 3)
  L.blocks(46, 8, 'BB')
  L.enemy('walker', 48).enemy('hopper', 52)
  L.coins(40, 43, 6)

  L.checkpoint = 60

  L.blocks(70, 8, '?').blocks(75, 8, 'B?B')
  L.enemy('walker', 78).enemy('hopper', 85)
  L.coins(72, 74, 6)

  L.stairs(90, 3).stairs(95, 3, -1)
  L.blocks(100, 8, 'B?PB')
  L.enemy('walker', 103).enemy('hopper', 108)
  L.coins(102, 107, 7)

  L.pipe(115, 2).pipe(122, 3)
  L.blocks(130, 8, 'BB')
  L.enemy('walker', 133).enemy('hopper', 140)
  L.coins(135, 138, 6)

  L.finish(160)
  return L
}

function level2() {
  const L = createLevel(220)
  L.ground(0, 40).ground(45, 70).ground(75, 90).ground(95, 110).ground(115, 140).ground(145, 220)
  L.row(10, 210, 0, 'B').row(10, 210, 1, 'B') // cave ceiling
  L.decorate(5, 20, 45, 70, 95, 120, 145)

  // Level 2: Deep Cave  
  L.blocks(12, 8, 'P???B')
  L.coins(13, 16, 11)
  L.enemy('walker', 18).enemy('hopper', 25)
  
  L.row(25, 35, 8, 'B').blocks(30, 8, '?')
  L.enemy('walker', 38).enemy('hopper', 48)
  L.coins(32, 34, 6)

  L.pipe(50, 3)
  L.blocks(55, 8, 'B?B')
  L.enemy('walker', 59)
  L.coins(58, 60, 7)

  L.checkpoint = 75  

  L.row(80, 90, 8, 'B').blocks(85, 8, 'P')
  L.enemy('walker', 88).enemy('hopper', 98)
  L.blocks(95, 8, 'B?B?B')
  L.coins(98, 100, 7)

  L.stairs(110, 3).stairs(115, 3, -1)
  L.blocks(120, 8, 'BBP')
  L.enemy('walker', 123).enemy('hopper', 130)
  L.coins(125, 127, 6)

  L.pipe(140, 2).pipe(147, 3)
  L.blocks(155, 8, 'B?BP')
  L.enemy('walker', 158).enemy('hopper', 165)
  L.coins(160, 162, 7)

  L.finish(190)
  return L
}

function level3() {
  const L = createLevel(280)
  L.ground(0, 25).ground(30, 45).ground(50, 70).ground(75, 90).ground(95, 110).ground(115, 135).ground(140, 279)
  L.decorate(5, 20, 40, 60, 80, 100, 120, 140, 160, 180, 200)

  // Level 3: Sunset Peaks
  L.blocks(10, 8, '?P?')
  L.enemy('walker', 15).enemy('hopper', 25)
  L.coins(12, 14, 9)
  
  L.row(25, 30, 8, 'S').coins(27, 30, 7)
  L.enemy('flyer', 33, 5)

  L.row(35, 40, 8, 'S').coins(37, 40, 7)
  L.enemy('walker', 38).enemy('hopper', 45)
  
  L.checkpoint = 65

  L.blocks(70, 8, 'B?B?B')
  L.enemy('walker', 75).enemy('hopper', 80).enemy('flyer', 90, 4)
  L.coins(72, 74, 7)
  
  L.pipe(100, 2).pipe(107, 3)
  L.blocks(115, 8, 'B?BP')
  L.enemy('walker', 120).enemy('hopper', 128).enemy('flyer', 132, 5)

  L.stairs(140, 4).stairs(146, 4, -1)
  L.blocks(150, 8, 'BB')
  L.enemy('walker', 153).enemy('hopper', 160).enemy('flyer', 165, 4)
  L.coins(155, 157, 7)

  L.pipe(175, 2).pipe(182, 3)
  L.blocks(190, 8, 'B?P')
  L.enemy('walker', 195).enemy('hopper', 200).enemy('flyer', 205, 5)

  L.finish(225)
  return L
}

// Order = play order. theme = index into config.themes.
export const LEVELS = [
  { name: 'GREEN HILLS', theme: 0, build: level1 },
  { name: 'DEEP CAVE', theme: 1, build: level2 },
  { name: 'SUNSET PEAKS', theme: 2, build: level3 },
]

// ---------------------------------------------------------------- validation (used by `npm run check`)

const SOLID = new Set(['#', 'B', '?', 'P', 'U', 'S', '[', ']', '{', '}'])

export function validateLevel(L, enemyTypes) {
  const errors = []
  const warnings = []
  const solid = (x, y) => y >= 0 && y < ROWS && x >= 0 && x < L.width && SOLID.has(L.tiles[y][x])
  const standable = (x, y) => solid(x, y) && !solid(x, y - 1) && !solid(x, y - 2)

  if (L.width < 100 || L.width > 400) warnings.push(`width ${L.width} is unusual (100-400 works best)`)
  if (!L.flagX) errors.push('missing L.finish(x) at the end of the level')
  else if (L.houseX + 6 > L.width)
    errors.push(`L.finish(${L.flagX - 12}) is too close to the end of this ${L.width}-wide level. Change it to L.finish(${L.width - 26}) (or smaller) and keep createLevel(${L.width})`)

  const sx = L.start.x
  if (!solid(sx, GROUND)) errors.push(`no ground under the player start (column ${sx})`)
  if (solid(sx, GROUND - 1) || solid(sx, GROUND - 2)) errors.push(`player start (column ${sx}) is inside a block`)
  if (L.checkpoint != null && (!solid(L.checkpoint, GROUND) || solid(L.checkpoint, GROUND - 1)))
    errors.push(`checkpoint at column ${L.checkpoint} has no ground or is inside a block`)

  // pits: any stretch of columns with nothing to stand on must be jumpable
  let run = 0
  for (let x = 0; x <= L.width; x++) {
    let has = false
    for (let y = 3; y <= GROUND; y++) if (x < L.width && standable(x, y)) has = true
    if (has || x === L.width) {
      if (run > 4) errors.push(`pit from column ${x - run} to ${x - 1} is ${run} tiles wide with nothing to stand on (max 4)`)
      run = 0
    } else run++
  }

  // reachability: from the start, a jump reaches surfaces up to 4 rows higher and 5 columns away;
  // falling down is always possible
  const byCol = Array.from({ length: L.width }, () => [])
  for (let x = 0; x < L.width; x++) for (let y = 1; y <= GROUND; y++) if (standable(x, y)) byCol[x].push(y)
  const key = (x, y) => y * 10000 + x
  const seen = new Set()
  const queue = []
  if (solid(sx, GROUND)) {
    seen.add(key(sx, GROUND))
    queue.push([sx, GROUND])
  }
  while (queue.length) {
    const [x, y] = queue.pop()
    for (let nx = Math.max(0, x - 5); nx <= Math.min(L.width - 1, x + 5); nx++) {
      for (const ny of byCol[nx]) {
        if (y - ny > 4 || seen.has(key(nx, ny))) continue
        // can't jump up through a ceiling right above you
        if (ny < y && solid(x, y - 3) && Math.abs(nx - x) <= 1) continue
        seen.add(key(nx, ny))
        queue.push([nx, ny])
      }
    }
  }
  const unreachable = []
  for (let x = 0; x < L.width; x++) for (const y of byCol[x]) if (y < GROUND && !seen.has(key(x, y))) unreachable.push([x, y])
  const reported = []
  for (let i = 0; i < unreachable.length; i++) {
    const [x, y] = unreachable[i]
    if (i > 0 && unreachable[i - 1][1] === y && unreachable[i - 1][0] === x - 1) continue // report each platform once
    reported.push(`platform at column ${x}, row ${y} can't be reached (more than 4 rows above anything within 5 columns)`)
  }
  warnings.push(...reported.slice(0, 5))
  if (reported.length > 5) warnings.push(`...and ${reported.length - 5} more unreachable platforms`)
  if (L.flagX) {
    const lastStair = L.flagX - 5
    if (!byCol[lastStair]?.some((y) => seen.has(key(lastStair, y))))
      errors.push(`the end of the level (column ${lastStair}) can't be reached from the start: check pits and walls before it`)
  }

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
      const def = enemyTypes[e.kind]
      if (!def) {
        errors.push(`unknown enemy type '${e.kind}' at column ${e.x} (use one of: ${Object.keys(enemyTypes).join(', ')})`)
        continue
      }
      if (def.behavior !== 'fly') {
        let floor = false
        for (let y = e.y + 1; y < ROWS; y++) if (solid(e.x, y)) floor = true
        if (!floor) warnings.push(`${e.kind} at column ${e.x} has no floor under it and will fall into a pit`)
      } else if (e.y > 9) warnings.push(`flying ${e.kind} at column ${e.x} is very low (use row 3-7)`)
      if (Math.abs(e.x - L.start.x) < 8) warnings.push(`${e.kind} at column ${e.x} is very close to the start`)
    }
  }
  if (!L.entities.some((e) => e.type === 'enemy')) warnings.push('no enemies in this level')
  if (L.entities.filter((e) => e.type === 'coin').length < 10) warnings.push('fewer than 10 collectibles')
  return { errors, warnings }
}
