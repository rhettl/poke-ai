import { mon, move } from './helpers.js';
// modest, waterabsorb | hp 252 / spa 252 / spd 4 | assault_vest
export const lapras = mon(
  'Lapras', ['water', 'ice'],
  { hp: 130, attack: 85, defense: 80, spAttack: 85, spDefense: 95, speed: 60 },
  252,
  [
    move('surf',      'water',    90, 'special'),
    move('icebeam',   'ice',      90, 'special'),
    move('thunderbolt','electric',90, 'special'),
    move('freezedry', 'ice',      70, 'special'),
  ],
  { ability: 'waterabsorb' },
);
