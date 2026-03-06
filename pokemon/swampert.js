import { mon, move } from './helpers.js';
export const swampert = mon(
  'Swampert', ['water', 'ground'],
  { hp: 100, attack: 110, defense: 90, spAttack: 85, spDefense: 90, speed: 60 },
  4,
  [
    move('earthquake',  'ground', 100, 'physical'),
    move('waterfall',   'water',  80,  'physical'),
    move('icebeam',     'ice',    90,  'special'),
    move('stealthrock', 'rock',   0,   'status', { effect: 'hazard_stealth_rock', target: 'opponent' }),
  ],
);
