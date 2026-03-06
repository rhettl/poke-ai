import { mon, move } from './helpers.js';
export const pikachu = mon(
  'Pikachu', ['electric'],
  { hp: 35, attack: 55, defense: 40, spAttack: 50, spDefense: 50, speed: 90 },
  0,
  [
    move('thunderbolt', 'electric', 90, 'special'),
    move('quickattack', 'normal',   40, 'physical', { priority: 1 }),
    move('irontail',    'steel',   100, 'physical'),
    move('voltswitch',  'electric', 70, 'special', { effect: 'pivot' }),
  ],
);
