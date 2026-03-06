import { mon, move } from './helpers.js';
// modest, sheerforce | spa 252 / spe 252 / hp 4 | life_orb
export const nidoking = mon(
  'Nidoking', ['poison', 'ground'],
  { hp: 81, attack: 102, defense: 77, spAttack: 85, spDefense: 75, speed: 85 },
  4,
  [
    move('earthpower',  'ground',   90, 'special'),
    move('sludgewave',  'poison',   95, 'special'),
    move('icebeam',     'ice',      90, 'special'),
    move('thunderbolt', 'electric', 90, 'special'),
  ],
  { ability: 'sheerforce' },
);