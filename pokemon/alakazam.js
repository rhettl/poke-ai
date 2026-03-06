import { mon, move } from './helpers.js';
// timid, magicguard | spa 252 / spe 252 / hp 4 | focus_sash
export const alakazam = mon(
  'Alakazam', ['psychic'],
  { hp: 55, attack: 50, defense: 45, spAttack: 135, spDefense: 95, speed: 120 },
  4,
  [
    move('psychic',       'psychic',  90,  'special'),
    move('shadowball',    'ghost',    80,  'special'),
    move('focusblast',    'fighting', 120, 'special'),
    move('dazzlinggleam', 'fairy',    80,  'special'),
  ],
  { ability: 'magicguard' },
);