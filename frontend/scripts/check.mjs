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

console.log('Checking config.js ...')
const need = ['title', 'player', 'enemies', 'collectible', 'powerUp', 'goal', 'themes']
for (const k of need) if (config[k] === undefined) err('config', `missing '${k}'`)
if (String(config.title).includes('__TITLE__')) warn('config', 'title is still the placeholder')
const shapes = ['coin', 'gem', 'star', 'heart', 'leaf']
const fallbacks = ['player', 'aphid', 'mite', 'moth']
const backgrounds = ['hills', 'cave', 'sunset', 'night']
const decorations = ['bush', 'plant', 'rock', 'none']
const hex = (c) => typeof c === 'string' && /^#[0-9a-fA-F]{6}$/.test(c)
const checkColors = (where, arr, n) => {
  if (!Array.isArray(arr) || arr.length < n) return err(where, `needs ${n} colors`)
  arr.forEach((c) => !hex(c) && err(where, `'${c}' is not a color like '#3fa34d'`))
}
const checkSprite = (where, spec) => {
  if (!fallbacks.includes(spec.fallback)) err(where, `fallback must be one of ${fallbacks.join(', ')}`)
  if (!spec.sprite) return warn(where, 'no sprite set, using built-in art')
  const json = join(root, 'public', 'sprites', spec.sprite, `${spec.sprite}.json`)
  if (!existsSync(json)) warn(where, `sprite '${spec.sprite}' not generated yet (no public/sprites/${spec.sprite}/${spec.sprite}.json), using built-in art`)
  else {
    const rep = join(root, 'public', 'sprites', spec.sprite, 'report.json')
    if (existsSync(rep)) {
      const r = JSON.parse(readFileSync(rep, 'utf8'))
      if (r.issues && r.issues.length) warn(where, `sprite '${spec.sprite}' has reported issues: ${r.issues.join('; ')}`)
    }
  }
}
checkSprite('config.player', config.player)
const behaviors = ['walk', 'hop', 'fly']
for (const [k, e] of Object.entries(config.enemies || {})) {
  if (!/^[a-z][a-z0-9_]*$/.test(k)) err(`config.enemies.${k}`, 'enemy keys must be lowercase letters/numbers/_')
  if (!behaviors.includes(e.behavior)) err(`config.enemies.${k}`, `behavior must be one of ${behaviors.join(', ')}`)
  if (typeof e.speed !== 'number' || e.speed < 0.1 || e.speed > 1.5) warn(`config.enemies.${k}`, 'speed should be between 0.3 and 1.0')
  checkSprite(`config.enemies.${k}`, e)
}
for (const k of ['collectible', 'powerUp']) {
  const it = config[k] || {}
  if (!shapes.includes(it.shape)) err(`config.${k}`, `shape must be one of ${shapes.join(', ')}`)
  for (const c of ['dark', 'light']) if (!hex(it.colors?.[c])) err(`config.${k}.colors.${c}`, 'needs a color like #ffd84d')
}
if (!['castle', 'house', 'greenhouse'].includes(config.goal?.building)) err('config.goal', "building must be 'castle', 'house' or 'greenhouse'")
;(config.themes || []).forEach((t, i) => {
  const w = `config.themes[${i}]`
  if (!backgrounds.includes(t.background)) err(w, `background must be one of ${backgrounds.join(', ')}`)
  if (!decorations.includes(t.decoration)) err(w, `decoration must be one of ${decorations.join(', ')}`)
  checkColors(`${w}.sky`, t.sky, 1)
  for (const k of ['far', 'near']) checkColors(`${w}.${k}`, t[k], 2)
  checkColors(`${w}.decorationColors`, t.decorationColors, 3)
  for (const k of ['grass', 'dirt', 'brick', 'stone', 'block']) checkColors(`${w}.${k}`, t[k], 3)
  checkColors(`${w}.pipe`, t.pipe, 4)
})

// Things still at the kit's default values: the game isn't themed yet
const DEFAULTS = {
  subtitle: 'A PLATFORM ADVENTURE',
  story: 'MONSTERS STOLE THE TREASURE.',
  winText: 'YOU DID IT!',
  playerName: 'HERO',
  enemyNames: ['GRUB', 'HOPPER', 'FLAPPER'],
  levelNames: ['GREEN HILLS', 'DEEP CAVE', 'SUNSET PEAKS'],
  sky0: '#5fb7ff', sky1: '#140d22', sky2: '#2b1b4a', grass: '#9be564',
}
const theme = (msg) => warn('theme', msg + ' (still the kit default: change it to fit this game)')
if (config.subtitle === DEFAULTS.subtitle) theme('config.subtitle')
if ((config.story || [])[0] === DEFAULTS.story) theme('config.story')
if ((config.winText || [])[0] === DEFAULTS.winText) theme('config.winText')
if (config.player?.name === DEFAULTS.playerName) theme('config.player.name')
for (const [k, e] of Object.entries(config.enemies || {})) if (DEFAULTS.enemyNames.includes(e.name)) theme(`config.enemies.${k}.name '${e.name}'`)
if (config.collectible?.name === 'COINS' && config.collectible?.shape !== 'coin') warn('theme', `config.collectible.name is 'COINS' but the shape is '${config.collectible.shape}'`)
const t = config.themes || []
if (t[0]?.sky?.[0] === DEFAULTS.sky0 && t[0]?.grass?.[0] === DEFAULTS.grass) theme('config.themes[0] colors')
if (t[1]?.sky?.[0] === DEFAULTS.sky1 && t[1]?.background === 'cave') theme('config.themes[1] colors')
if (t[2]?.sky?.[0] === DEFAULTS.sky2 && t[2]?.background === 'sunset') theme('config.themes[2] colors')
LEVELS.forEach((d, i) => DEFAULTS.levelNames.includes(d.name) && theme(`level name '${d.name}' in LEVELS (levels.js)`))

console.log(`Checking ${LEVELS.length} levels ...`)
if (LEVELS.length < 1) err('levels', 'LEVELS is empty')
LEVELS.forEach((def, i) => {
  const where = `level ${i + 1} (${def.name})`
  if ((def.theme ?? i) >= (config.themes || []).length) err(where, `theme ${def.theme} doesn't exist in config.themes`)
  let L
  try {
    L = def.build()
  } catch (e) {
    return err(where, `crashed while building: ${e.message}`)
  }
  const r = validateLevel(L, config.enemies || {})
  r.errors.forEach((m) => err(where, m))
  r.warnings.forEach((m) => warn(where, m))
})

console.log(`\n${errors} error(s), ${warnings} warning(s)`)
if (errors) {
  console.log('Fix the errors above, then run `npm run check` again.')
  process.exit(1)
}
if (warnings) console.log('Content OK, but look at the warnings above (especially "theme" ones). Building...')
else console.log('Content OK. Building...')
