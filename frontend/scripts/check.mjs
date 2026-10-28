// `npm run check`: validates config.js and levels.js, then the build runs.
// Prints ERRORS (must fix) and WARNINGS (should look at). Exit code 1 if there are errors.
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const { default: config } = await import('../src/game/config.js')
const { LEVELS, validateLevel } = await import('../src/game/levels.js')

let errors = 0
let warnings = 0
const err = (where, msg) => { errors++; console.log(`  ERROR   ${where}: ${msg}`) }
const warn = (where, msg) => { warnings++; console.log(`  warning ${where}: ${msg}`) }
const note = (msg) => console.log(`  note    ${msg}`)

const hex = (c) => typeof c === 'string' && /^#[0-9a-fA-F]{6}$/.test(c)
const checkColors = (where, arr, n) => {
  if (!Array.isArray(arr) || arr.length < n) return err(where, `needs ${n} colors`)
  arr.forEach((c) => !hex(c) && err(where, `'${c}' is not a color like '#3fa34d'`))
}
const spriteDir = (name) => join(root, 'public', 'sprites', name)
const hasSprite = (name) => existsSync(join(spriteDir(name), `${name}.json`))
const spriteIssues = (where, name) => {
  const rep = join(spriteDir(name), 'report.json')
  if (!existsSync(rep)) return
  const r = JSON.parse(readFileSync(rep, 'utf8'))
  if (r.issues && r.issues.length) warn(where, `sprite '${name}' has reported issues: ${r.issues.join('; ')}`)
}

console.log('Checking config.js ...')
for (const k of ['title', 'cats', 'planets', 'coins', 'powerUp']) if (config[k] === undefined) err('config', `missing '${k}'`)
if (!['coin', 'gem', 'star', 'heart', 'leaf'].includes(config.coins?.shape)) err('config.coins', 'shape must be coin, gem, star, heart or leaf')
for (const c of ['dark', 'light', 'mid']) if (!hex(config.coins?.colors?.[c])) err(`config.coins.colors.${c}`, 'needs a color like #ffd84d')

// cats
if (!Array.isArray(config.cats) || config.cats.length < 2) err('config.cats', 'needs at least 2 cats (2 players pick different ones)')
;(config.cats || []).forEach((c, i) => {
  const w = `config.cats[${i}]`
  if (!c.name) err(w, 'missing name')
  if (!hex(c.color)) err(w, `color '${c.color}' is not like '#ff9a3c'`)
  if (!c.sprite) err(w, 'missing sprite')
  else if (!hasSprite(c.sprite)) warn(w, `sprite '${c.sprite}' not found in public/sprites, using built-in art`)
  else spriteIssues(w, c.sprite)
})

// planets
const kinds = ['earth', 'moons', 'aurora', 'ringed', 'asteroids', 'station', 'sun', 'clouds', 'galaxy', 'ship']
const lands = ['craters', 'dunes', 'peaks', 'spires', 'crystals', 'none']
const terrains = ['craters', 'sand', 'ice', 'moss', 'rock', 'metal', 'basalt', 'cloud', 'crystal', 'hull']
const decors = ['antenna', 'crystal', 'mushroom', 'rock', 'vent', 'dish', 'icicle', 'none']
let generated = 0
let recolored = 0
;(config.planets || []).forEach((p, i) => {
  const w = `config.planets[${i}] (${p.name})`
  if (!p.name) err(w, 'missing name')
  if (typeof p.gravity !== 'number' || p.gravity < 0.5 || p.gravity > 1.2) err(w, 'gravity must be a number from 0.5 to 1.2')
  checkColors(`${w}.sky`, p.sky, 1)
  if (!kinds.includes(p.planet?.kind)) err(w, `planet.kind must be one of ${kinds.join(', ')}`)
  if (!lands.includes(p.land?.style)) err(w, `land.style must be one of ${lands.join(', ')}`)
  if (!terrains.includes(p.terrain)) err(w, `terrain must be one of ${terrains.join(', ')}`)
  if (!decors.includes(p.decor)) err(w, `decor must be one of ${decors.join(', ')}`)
  for (const k of ['surface', 'ground', 'panel', 'block']) checkColors(`${w}.${k}`, p[k], 3)
  checkColors(`${w}.tube`, p.tube, 4)
  for (const role of ['walker', 'hopper', 'flyer']) {
    const e = p.enemies?.[role]
    const we = `${w}.enemies.${role}`
    if (!e) {
      err(we, 'missing')
      continue
    }
    if (!e.name) err(we, 'missing name')
    if (typeof e.speed !== 'number' || e.speed < 0.1 || e.speed > 1.5) warn(we, 'speed should be between 0.3 and 1.0')
    if (e.sprite && hasSprite(e.sprite)) {
      generated++
      spriteIssues(we, e.sprite)
    } else if (e.base && hasSprite(e.base)) recolored++
    else warn(we, `neither sprite '${e.sprite}' nor base '${e.base}' found, using built-in art`)
  }
})
if (recolored) note(`${recolored} alien(s) use a recolored base sprite until generated (run tools\\generate-aliens.bat)`)

console.log(`Checking ${LEVELS.length} levels ...`)
if (LEVELS.length < 1) err('levels', 'LEVELS is empty')
LEVELS.forEach((def, i) => {
  const planet = (config.planets || [])[def.planet]
  const where = `level ${i + 1} (${planet?.name ?? '?'})`
  if (!planet) return err(where, `planet ${def.planet} doesn't exist in config.planets`)
  let L
  try {
    L = def.build()
  } catch (e) {
    return err(where, `crashed while building: ${e.message}`)
  }
  const r = validateLevel(L, planet)
  r.errors.forEach((m) => err(where, m))
  r.warnings.forEach((m) => warn(where, m))
})

console.log(`\n${errors} error(s), ${warnings} warning(s)`)
if (errors) {
  console.log('Fix the errors above, then run `npm run check` again.')
  process.exit(1)
}
console.log(warnings ? 'Content OK, but look at the warnings above. Building...' : 'Content OK. Building...')
