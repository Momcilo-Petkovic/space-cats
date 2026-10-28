// ============================================================================
//  SPACE CATS: game content. Cats, planets, aliens and colors.
//  Text is shown in a pixel font: CAPITAL letters, numbers and . , ! ? ' - : / &
// ============================================================================

const config = {
  title: 'SPACE CATS',
  subtitle: 'A CO-OP PLATFORMER IN SPACE',
  story: ['THE ALIEN BLOBS STOLE THE LAST CAN OF SPACE MEOW.', 'CROSS 10 PLANETS AND GET IT BACK!'],
  coins: { name: 'STARS', shape: 'star', colors: { dark: '#a86a00', light: '#ffe46b', mid: '#ffc21a' } },
  powerUp: { name: 'SPACE MEOW', shape: 'can' },

  // Playable cats (folder names in public/sprites)
  cats: [
    { name: 'GINGER', sprite: 'player', color: '#ff9a3c' },
    { name: 'SHADOW', sprite: 'blackcat', color: '#9a8cff' },
    { name: 'PATCHES', sprite: 'calicocat', color: '#ffcf8a' },
    { name: 'TUX', sprite: 'tuxedocat', color: '#e8f1f2' },
    { name: 'SMOKEY', sprite: 'graycat', color: '#a9b4c2' },
  ],

  // One planet per level. Each alien role (walker / hopper / flyer) has its own sprite.
  // While a planet's alien sprite isn't generated yet, `base` is used, recolored by `hue` degrees.
  //
  // physics: gravity (1 = normal, lower = floaty), slippery (ice), wind (push to the right, negative = left)
  // look:   sky (top to bottom), stars (0-1), nebula ([colors] or null), planet (big body in the sky),
  //         land (far + near silhouettes), surface/ground/panel/block/tube colors, terrain texture,
  //         decor (antenna, crystal, mushroom, rock, vent, dish, icicle, none), extra (special background layer)
  planets: [
    {
      name: 'LUNA BASE', music: 0, gravity: 0.62,
      sky: ['#05060f', '#0a0d22', '#111637', '#181e45'], stars: 1, nebula: null,
      planet: { kind: 'earth', x: 300, y: 46, r: 26 },
      land: { style: 'craters', far: '#2a2f45', near: '#3b4160' },
      terrain: 'craters', surface: ['#d9dce6', '#b7bccb', '#8e94a8'], ground: ['#8e94a8', '#6f748a', '#a9aec0'],
      panel: ['#c9cfdc', '#7f879c', '#eef1f7'], block: ['#9aa3b5', '#5e667a', '#d0d6e2'], tube: ['#c0c6d4', '#eef1f7', '#7f879c', '#2a2f45'],
      decor: 'antenna',
      enemies: {
        walker: { name: 'MOON MITE', sprite: 'luna_walker', base: 'walker', hue: 200, speed: 0.4 },
        hopper: { name: 'CRATER HOPPER', sprite: 'luna_hopper', base: 'hopper', hue: 150, speed: 0.55 },
        flyer: { name: 'DUST MOTH', sprite: 'luna_flyer', base: 'flyer', hue: 40, speed: 0.5 },
      },
    },
    {
      name: 'MARS DUNES', music: 1, gravity: 1,
      sky: ['#1a0507', '#3d0d0f', '#6b1d16', '#a3401f', '#d4702e'], stars: 0.4, nebula: null,
      planet: { kind: 'moons', x: 90, y: 40, r: 12, color: '#c9a48a' },
      land: { style: 'dunes', far: '#7a2a18', near: '#a8431f' },
      terrain: 'sand', surface: ['#f0a35a', '#d9803d', '#a85a26'], ground: ['#a85a26', '#7f3f19', '#c87438'],
      panel: ['#c86a3a', '#7a3418', '#eb9a62'], block: ['#b07a5a', '#6b4430', '#d9a786'], tube: ['#5a8fb0', '#a9d4ec', '#2f5a78', '#152a3a'],
      decor: 'rock',
      enemies: {
        walker: { name: 'DUST CRAWLER', sprite: 'mars_walker', base: 'walker', hue: 300, speed: 0.45 },
        hopper: { name: 'SAND SKIPPER', sprite: 'mars_hopper', base: 'hopper', hue: 330, speed: 0.6 },
        flyer: { name: 'RED WISP', sprite: 'mars_flyer', base: 'flyer', hue: 160, speed: 0.55 },
      },
    },
    {
      name: 'FROSTBITE COMET', music: 2, gravity: 1, slippery: true,
      sky: ['#020814', '#061633', '#0b2a52', '#134172'], stars: 0.8, nebula: ['#1de9b6', '#2979ff'],
      planet: { kind: 'aurora' },
      land: { style: 'peaks', far: '#1d3b5c', near: '#2d5a82' },
      terrain: 'ice', surface: ['#f2fbff', '#c9ecff', '#8fcdf0'], ground: ['#8fcdf0', '#5ea6d6', '#b9e3fa'],
      panel: ['#a9dcf5', '#4f8fb8', '#e6f7ff'], block: ['#7fb9dc', '#3f76a0', '#c4e6f8'], tube: ['#b8e6ff', '#ffffff', '#6aaed6', '#1d3b5c'],
      decor: 'icicle',
      enemies: {
        walker: { name: 'FROST BLOB', sprite: 'frost_walker', base: 'walker', hue: 120, speed: 0.4 },
        hopper: { name: 'SNOW BOUNCER', sprite: 'frost_hopper', base: 'hopper', hue: 60, speed: 0.6 },
        flyer: { name: 'ICE WING', sprite: 'frost_flyer', base: 'flyer', hue: 0, speed: 0.55 },
      },
    },
    {
      name: 'VERDANIA JUNGLE', music: 0, gravity: 1,
      sky: ['#0a0418', '#1d0b3a', '#341463', '#4b2088', '#6b3aa8'], stars: 0.5, nebula: ['#ff4fd8', '#7a3cff'],
      planet: { kind: 'ringed', x: 310, y: 50, r: 22, color: '#ffb35a', ring: '#ffe2a8' },
      land: { style: 'spires', far: '#2a1052', near: '#3d1a6e' },
      terrain: 'moss', surface: ['#7dffb0', '#2fd67a', '#16934d'], ground: ['#5a2f7a', '#3d1d57', '#7a4a9e'],
      panel: ['#3fb87a', '#1d6b44', '#7debb0'], block: ['#7a4a9e', '#4a2a66', '#a87ccc'], tube: ['#ff6fb5', '#ffc0e0', '#b8327a', '#4a0f30'],
      decor: 'mushroom',
      enemies: {
        walker: { name: 'SPORE BLOB', sprite: 'verdania_walker', base: 'walker', hue: 60, speed: 0.45 },
        hopper: { name: 'VINE HOPPER', sprite: 'verdania_hopper', base: 'hopper', hue: 270, speed: 0.6 },
        flyer: { name: 'PETAL BAT', sprite: 'verdania_flyer', base: 'flyer', hue: 100, speed: 0.55 },
      },
    },
    {
      name: 'ASTEROID BELT', music: 1, gravity: 0.85,
      sky: ['#04030a', '#0b0818', '#140f28', '#1c1638'], stars: 1, nebula: ['#ff8a3c', '#b23cff'],
      planet: { kind: 'asteroids' },
      land: { style: 'none' },
      terrain: 'rock', surface: ['#9a8a7a', '#7a6a5a', '#56483c'], ground: ['#56483c', '#3d332a', '#6e5e50'],
      panel: ['#8a7a6a', '#4a3e34', '#b0a090'], block: ['#6e5e50', '#3d332a', '#988878'], tube: ['#ff9a3c', '#ffd0a0', '#b85a14', '#4a2208'],
      decor: 'none',
      enemies: {
        walker: { name: 'ROCK CRAB', sprite: 'asteroid_walker', base: 'walker', hue: 20, speed: 0.4 },
        hopper: { name: 'METEOR MITE', sprite: 'asteroid_hopper', base: 'hopper', hue: 200, speed: 0.65 },
        flyer: { name: 'COMET FLY', sprite: 'asteroid_flyer', base: 'flyer', hue: 220, speed: 0.6 },
      },
    },
    {
      name: 'ORBITAL STATION', music: 2, gravity: 1,
      sky: ['#0b0f1a'], stars: 0.6, nebula: null,
      planet: { kind: 'station' },
      land: { style: 'none' },
      terrain: 'metal', surface: ['#d0d8e4', '#9aa6b8', '#6a768a'], ground: ['#5a6474', '#3e4654', '#78849a'],
      panel: ['#7f8ca3', '#46506a', '#b5c0d4'], block: ['#e0a03a', '#8a5a14', '#ffd27a'], tube: ['#3ad0ff', '#b0f0ff', '#1a7aa8', '#0a2a3a'],
      decor: 'dish',
      enemies: {
        walker: { name: 'SECURITY BOT', sprite: 'station_walker', base: 'walker', hue: 240, speed: 0.5 },
        hopper: { name: 'SPRING BOT', sprite: 'station_hopper', base: 'hopper', hue: 180, speed: 0.65 },
        flyer: { name: 'DRONE', sprite: 'station_flyer', base: 'flyer', hue: 280, speed: 0.6 },
      },
    },
    {
      name: 'MAGMARA', music: 0, gravity: 1,
      sky: ['#140303', '#2e0806', '#521108', '#80200a', '#b0360c'], stars: 0.3, nebula: ['#ff5a1a', '#ffb01a'],
      planet: { kind: 'sun', x: 80, y: 60, r: 30 },
      land: { style: 'peaks', far: '#3a0d08', near: '#5a160a' },
      terrain: 'basalt', surface: ['#5a4a48', '#3e3230', '#2a2020'], ground: ['#2a2020', '#1a1414', '#3e3230'],
      panel: ['#4a3a38', '#2a2020', '#6e5a56'], block: ['#3e3230', '#1a1414', '#5a4a48'], tube: ['#ff7a1a', '#ffd06a', '#b03a08', '#3a0d02'],
      decor: 'vent',
      enemies: {
        walker: { name: 'MAGMA SLUG', sprite: 'magmara_walker', base: 'walker', hue: 330, speed: 0.4 },
        hopper: { name: 'EMBER IMP', sprite: 'magmara_hopper', base: 'hopper', hue: 300, speed: 0.7 },
        flyer: { name: 'FIRE MOTH', sprite: 'magmara_flyer', base: 'flyer', hue: 190, speed: 0.6 },
      },
    },
    {
      name: 'NIMBUS GIANT', music: 1, gravity: 0.9,
      sky: ['#ffd3a8', '#ffb98a', '#f08aa0', '#b46ab8', '#6a4aa8'], stars: 0, nebula: null,
      planet: { kind: 'clouds' },
      land: { style: 'none' },
      terrain: 'cloud', surface: ['#ffffff', '#f2e8ff', '#cbb8e8'], ground: ['#e8dcfa', '#c9b4ea', '#f8f2ff'],
      panel: ['#e8c0ff', '#a070c8', '#fbeaff'], block: ['#ffd27a', '#b8862a', '#fff0c0'], tube: ['#8ad0ff', '#e0f4ff', '#4a90c0', '#1a3a5a'],
      decor: 'none',
      enemies: {
        walker: { name: 'PUFF BLOB', sprite: 'nimbus_walker', base: 'walker', hue: 230, speed: 0.45 },
        hopper: { name: 'STORM SPRITE', sprite: 'nimbus_hopper', base: 'hopper', hue: 40, speed: 0.65 },
        flyer: { name: 'SKY RAY', sprite: 'nimbus_flyer', base: 'flyer', hue: 310, speed: 0.65 },
      },
    },
    {
      name: 'PRISMA', music: 2, gravity: 1,
      sky: ['#04010c', '#0e0424', '#1a0a3e', '#260f58'], stars: 1, nebula: ['#3cf0ff', '#ff3cf0'],
      planet: { kind: 'galaxy', x: 290, y: 52 },
      land: { style: 'crystals', far: '#2a1260', near: '#3f1c88' },
      terrain: 'crystal', surface: ['#c8fffb', '#6ff0ea', '#2ab0c8'], ground: ['#3a1c78', '#26104e', '#52309a'],
      panel: ['#ff8af0', '#a03a9a', '#ffd0fa'], block: ['#6ff0ea', '#1e8a9a', '#d0fffb'], tube: ['#ffe46b', '#fff8c8', '#c8a020', '#4a3a08'],
      decor: 'crystal',
      enemies: {
        walker: { name: 'CRYSTAL GOLEM', sprite: 'prisma_walker', base: 'walker', hue: 140, speed: 0.4 },
        hopper: { name: 'SHARD HOPPER', sprite: 'prisma_hopper', base: 'hopper', hue: 250, speed: 0.7 },
        flyer: { name: 'GLIMMER', sprite: 'prisma_flyer', base: 'flyer', hue: 120, speed: 0.65 },
      },
    },
    {
      name: 'THE MOTHERSHIP', music: 0, gravity: 1,
      sky: ['#020a06', '#04140c', '#082414', '#0c341c'], stars: 0.7, nebula: ['#3cff7a', '#1ab0ff'],
      planet: { kind: 'ship' },
      land: { style: 'none' },
      terrain: 'hull', surface: ['#7affb0', '#3ad07a', '#1a8a4a'], ground: ['#2a3a34', '#18241f', '#3e5248'],
      panel: ['#3a5a4a', '#1a2e24', '#5a8a72'], block: ['#7affb0', '#1a8a4a', '#d0ffe4'], tube: ['#b03aff', '#e0b0ff', '#6a1aa8', '#2a0a44'],
      decor: 'vent',
      enemies: {
        walker: { name: 'BLOB GUARD', sprite: 'mothership_walker', base: 'walker', hue: 0, speed: 0.55 },
        hopper: { name: 'BLOB TROOPER', sprite: 'mothership_hopper', base: 'hopper', hue: 0, speed: 0.75 },
        flyer: { name: 'BLOB SCOUT', sprite: 'mothership_flyer', base: 'flyer', hue: 0, speed: 0.7 },
      },
    },
  ],
}

export default config
