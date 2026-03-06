import { mon, move } from './helpers.js';
// impish, sturdy | hp 252 / def 252 / spd 4 | leftovers
export const skarmory = mon(
  'Skarmory', ['steel', 'flying'],
  { hp: 65, attack: 80, defense: 140, spAttack: 40, spDefense: 70, speed: 70 },
  252,
  [
    move('stealthrock', 'rock',    0,  'status',   { effect: 'hazard_stealth_rock', target: 'opponent' }),
    move('bravebird',   'flying',  120, 'physical'),
    move('ironhead',    'steel',   80,  'physical'),
    move('roost',       'flying',  0,   'status',   { effect: 'heal', target: 'self' }),
  ],
  { ability: 'sturdy' },
);