import { mon, move } from './helpers.js';
// relaxed, sturdy | hp 252 / def 252 / spd 4 | leftovers
export const forretress = mon(
  'Forretress', ['bug', 'steel'],
  { hp: 75, attack: 90, defense: 140, spAttack: 60, spDefense: 60, speed: 40 },
  252,
  [
    move('stealthrock', 'rock',     0,  'status',   { effect: 'hazard_stealth_rock', target: 'opponent' }),
    move('rapidspin',   'normal',   50, 'physical', { effect: 'hazard_remove' }),
    move('voltswitch',  'electric', 70, 'special',  { effect: 'pivot' }),
    move('gyroball',    'steel',    0,  'physical'),
  ],
  { ability: 'sturdy' },
);