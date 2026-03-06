import { mon, move } from './helpers.js';
export const tyranitar = mon(
  'Tyranitar', ['rock', 'dark'],
  { hp: 100, attack: 134, defense: 110, spAttack: 95, spDefense: 100, speed: 61 },
  0,
  [
    move('stoneedge',  'rock',   100, 'physical'),
    move('crunch',     'dark',   80,  'physical'),
    move('earthquake', 'ground', 100, 'physical'),
    move('icebeam',    'ice',    90,  'special'),
  ],
);
