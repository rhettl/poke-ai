import { mon, move } from './helpers.js';
export const raichu = mon(
  'Raichu', ['electric'],
  { hp: 60, attack: 90, defense: 55, spAttack: 90, spDefense: 80, speed: 110 },
  0,
  [
    move('thunderbolt', 'electric', 90, 'special'),
    move('focusblast',  'fighting', 120, 'special'),
    move('nastyplot',   'dark',     0,  'status', { effect: 'boost_spa', target: 'self' }),
    move('quickattack', 'normal',   40, 'physical', { priority: 1 }),
  ],
);
