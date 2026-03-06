import { mon, move } from './helpers.js';
// bold, regenerator | hp 252 / def 252 / spa 4 | rocky_helmet
export const slowbro = mon(
  'Slowbro', ['water', 'psychic'],
  { hp: 95, attack: 75, defense: 110, spAttack: 100, spDefense: 80, speed: 30 },
  252,
  [
    move('scald',   'water',   80, 'special'),
    move('psychic', 'psychic', 90, 'special'),
    move('icebeam', 'ice',     90, 'special'),
    move('slackoff','normal',  0,  'status', { effect: 'heal', target: 'self' }),
  ],
  { ability: 'regenerator' },
);
