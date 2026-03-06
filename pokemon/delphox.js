import { mon, move } from './helpers.js';
// timid, blaze | spa 252 / spe 252 / hp 4 | choice_specs
export const delphox = mon(
  'Delphox', ['fire', 'psychic'],
  { hp: 75, attack: 69, defense: 72, spAttack: 114, spDefense: 100, speed: 104 },
  4,
  [
    move('flamethrower', 'fire',    90, 'special'),
    move('psychic',      'psychic', 90, 'special'),
    move('shadowball',   'ghost',   80, 'special'),
    move('grassknot',    'grass',   0,  'special'), // power varies by target weight
  ],
  { ability: 'blaze' },
);
