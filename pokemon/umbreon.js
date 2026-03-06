import { mon, move } from './helpers.js';
// calm, synchronize | hp 252 / def 252 / spd 4 | leftovers
export const umbreon = mon(
  'Umbreon', ['dark'],
  { hp: 95, attack: 65, defense: 110, spAttack: 60, spDefense: 130, speed: 65 },
  252,
  [
    move('foulplay',  'dark',   95, 'physical'),
    move('toxic',     'poison', 0,  'status', { effect: 'badly_poison', target: 'opponent' }),
    move('yawn',      'normal', 0,  'status', { effect: 'sleep',        target: 'opponent' }),
    move('moonlight', 'fairy',  0,  'status', { effect: 'heal',         target: 'self' }),
  ],
  { ability: 'synchronize' },
);