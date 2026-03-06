import { mon, move } from './helpers.js';
export const gengar = mon(
  'Gengar', ['ghost', 'poison'],
  { hp: 60, attack: 65, defense: 60, spAttack: 130, spDefense: 75, speed: 110 },
  0,
  [
    move('shadowball',  'ghost',    80,  'special'),
    move('sludgebomb',  'poison',   90,  'special'),
    move('focusblast',  'fighting', 120, 'special'),
    move('willowisp',   'fire',     0,   'status', { effect: 'burn', target: 'opponent' }),
  ],
);
