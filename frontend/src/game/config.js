// ============================================================================
//  GAME CONFIG: the main file to edit when making a new game from this kit.
//  Everything here is plain data. Keep the structure, change the values.
//  Colors are hex strings like '#3fa34d'. Text is shown in a pixel font:
//  use CAPITAL letters, numbers and basic punctuation (. , ! ? ' - : / &).
// ============================================================================

const config = {
  title: 'SPACE CATS', // big title on the start screen (max ~12 characters per word looks best)
  subtitle: 'A PLATFORM ADVENTURE', // small line under the title
  story: [
    // 1-2 short lines on the start screen
    'THE GALAXY IS UNDER THREAT FROM ALIEN BLOBS!',
    'RESCUE THE SPACE STATION AND SAVE THE UNIVERSE!',
  ],
  winText: ['YOU DID IT!', 'THE WORLD IS SAFE AGAIN'], // shown after the last level

  // ---------------------------------------------------------------- characters
  // sprite: folder name in public/sprites made by sprite-forge (e.g. 'player' -> public/sprites/player/).
  // fallback: built-in art used until the sprite exists: 'player', 'aphid' (bug), 'mite' (red bug), 'moth'.
  player: {
    name: 'HERO', // shown in the HUD
    sprite: 'player',
    fallback: 'player',
    glow: '#ffe066', // outline color when powered up
  },

  // Enemy types. The key (e.g. 'walker') is what levels.js uses: L.enemy('walker', x).
  // behavior: 'walk' (walks, turns at walls, falls off edges), 'hop' (walks and jumps),
  //           'fly' (floats in a wave, ignores walls; place it in the air: L.enemy('flyer', x, 5))
  // speed: 0.3 (slow) to 1.0 (fast). stompable: false = hurts when jumped on (use rarely).
  enemies: {
    walker: { name: 'GRUB', sprite: 'walker', fallback: 'aphid', behavior: 'walk', speed: 0.45, stompable: true },
    hopper: { name: 'HOPPER', sprite: 'hopper', fallback: 'mite', behavior: 'hop', speed: 0.6, stompable: true },
    flyer: { name: 'FLAPPER', sprite: 'flyer', fallback: 'moth', behavior: 'fly', speed: 0.55, stompable: true },
  },

  // ---------------------------------------------------------------- items
  // shape: 'coin', 'gem', 'star', 'heart' or 'leaf'
  collectible: { name: 'COINS', shape: 'star', colors: { dark: '#8a5a0a', light: '#ffd84d', mid: '#e0a020' } },
  powerUp: { name: 'POWER STAR', shape: 'star', colors: { dark: '#b8860b', light: '#fff2a8', mid: '#ffd84d' } },

  // ---------------------------------------------------------------- goal at the end of each level
  goal: {
    building: 'castle', // 'castle', 'house' or 'greenhouse'
    flag: '#ff0000', // flag color
  },

  // ---------------------------------------------------------------- level looks
  // One theme per level (same order as LEVELS in levels.js).
  // background: 'hills' (day sky, clouds, hills), 'cave' (dark, hanging lamps), 'sunset' (sun, mountains),
  //             'night' (stars, moon, mountains)
  // sky: 3-7 colors from top to bottom.  far / near: colors of hills or mountains [fill, outline].
  // decoration: 'bush', 'plant', 'rock' or 'none' with [dark, light, shade] colors.
  // grass/dirt/brick/stone: [main, dark, light] (grass is [light, main, dark]).  block: [main, light, dark].
  // pipe: [main, light, dark, outline].  music: 0, 1 or 2 (three different tunes).
  themes: [
    {
      background: 'hills',
      sky: ['#5fb7ff', '#70c2ff', '#83ccff', '#97d6ff', '#acdfff'],
      far: ['#4fae3a', '#2f6e22'],
      near: ['#5cbf47', '#2f6e22'],
      decoration: 'bush', decorationColors: ['#2f6e22', '#5cbf47', '#3f8f2f'],
      grass: ['#9be564', '#5cbf3a', '#3b8a26'], dirt: ['#8a5a32', '#6e4424', '#a8743f'],
      brick: ['#b5652e', '#7a3d17', '#d98a4a'], stone: ['#9aa0a6', '#5f656b', '#c9cdd1'],
      block: ['#f2b632', '#ffdb70', '#7a4a12'], pipe: ['#2e8b3d', '#7fd36b', '#1b5e27', '#0d2b12'],
      music: 0,
    },
    {
      background: 'cave',
      sky: ['#140d22'],
      far: ['#2a2240', '#1a1430'],
      near: ['#f08cff', '#4a4466'], // cave: [lamp light color, lamp body color]
      decoration: 'rock', decorationColors: ['#2a2440', '#544a75', '#3d3557'],
      grass: ['#7ee0b0', '#3fae7a', '#21704b'], dirt: ['#3d3557', '#2a2440', '#544a75'],
      brick: ['#5e4a8a', '#382a5e', '#8370b8'], stone: ['#6c6a85', '#45435c', '#9a98b5'],
      block: ['#f2b632', '#ffdb70', '#7a4a12'], pipe: ['#2e8b3d', '#7fd36b', '#1b5e27', '#0d2b12'],
      music: 1,
    },
    {
      background: 'sunset',
      sky: ['#2b1b4a', '#4a2160', '#7a2a6b', '#b8406a', '#e8685a', '#f69a5a', '#ffc46b'],
      far: ['#6b3f7a', '#8a5a9e'],
      near: ['#4a2a5a', '#6b4a7e'],
      decoration: 'bush', decorationColors: ['#3a5c18', '#7fb83a', '#4f7d22'],
      grass: ['#c2e86a', '#7fb83a', '#4f7d22'], dirt: ['#7a3f48', '#5a2a33', '#9a5560'],
      brick: ['#c0563a', '#80301d', '#e57d58'], stone: ['#a88fb0', '#6e5a78', '#d0bed6'],
      block: ['#f2b632', '#ffdb70', '#7a4a12'], pipe: ['#2e8b3d', '#7fd36b', '#1b5e27', '#0d2b12'],
      music: 2,
    },
  ],
}

export default config
