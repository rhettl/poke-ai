import { mon, move } from './helpers.js';

// ADMIN: modest, trace | spa 252 / spe 252 / hp 4 | choice_specs
export const gardevoirAdmin = mon(
  'Gardevoir', ['psychic', 'fairy'],
  { hp: 68, attack: 65, defense: 65, spAttack: 125, spDefense: 115, speed: 80 },
  4,
  [
    move('moonblast',   'fairy',    95, 'special'),
    move('psychic',     'psychic',  90, 'special'),
    move('shadowball',  'ghost',    80, 'special'),
    move('thunderbolt', 'electric', 90, 'special'),
  ],
  { ability: 'trace' },
);

// ARCHITECT ACE: timid, trace | spa 252 / spe 252 / hp 4 | leftovers
export const gardevoirArchitect = mon(
  'Gardevoir', ['psychic', 'fairy'],
  { hp: 68, attack: 65, defense: 65, spAttack: 125, spDefense: 115, speed: 80 },
  4,
  [
    move('moonblast',  'fairy',   95, 'special'),
    move('psychic',    'psychic', 90, 'special'),
    move('shadowball', 'ghost',   80, 'special'),
    move('calmmind',   'psychic', 0,  'status', { effect: 'setup_calm_mind', target: 'self' }),
  ],
  { ability: 'trace' },
);

export const gardevoir = gardevoirArchitect;