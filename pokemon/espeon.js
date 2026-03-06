import { mon, move } from './helpers.js';
// timid, magicbounce | spa 252 / spe 252 / hp 4 | leftovers
export const espeon = mon(
  'Espeon', ['psychic'],
  { hp: 65, attack: 65, defense: 60, spAttack: 130, spDefense: 95, speed: 110 },
  4,
  [
    move('psychic',       'psychic', 90, 'special'),
    move('shadowball',    'ghost',   80, 'special'),
    move('dazzlinggleam', 'fairy',   80, 'special'),
    move('calmmind',      'psychic', 0,  'status', { effect: 'setup_calm_mind', target: 'self' }),
  ],
  { ability: 'magicbounce' },
);
