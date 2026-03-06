import { mon, move } from './helpers.js';
// timid, naturalcure | spa 252 / spe 252 / hp 4 | life_orb
export const starmie = mon(
  'Starmie', ['water', 'psychic'],
  { hp: 60, attack: 75, defense: 85, spAttack: 100, spDefense: 85, speed: 115 },
  4,
  [
    move('surf',        'water',    90, 'special'),
    move('psychic',     'psychic',  90, 'special'),
    move('icebeam',     'ice',      90, 'special'),
    move('thunderbolt', 'electric', 90, 'special'),
  ],
  { ability: 'naturalcure' },
);
