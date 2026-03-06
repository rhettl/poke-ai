import { mon, move } from './helpers.js';
// sassy, ironbarbs | hp 252 / spd 252 / def 4 | leftovers
export const ferrothorn = mon(
  'Ferrothorn', ['grass', 'steel'],
  { hp: 74, attack: 94, defense: 131, spAttack: 54, spDefense: 116, speed: 20 },
  252,
  [
    move('stealthrock', 'rock',   0,   'status',   { effect: 'hazard_stealth_rock', target: 'opponent' }),
    move('leechseed',   'grass',  0,   'status',   { effect: 'drain', target: 'opponent' }),
    move('powerwhip',   'grass',  120, 'physical'),
    move('gyroball',    'steel',  0,   'physical'), // power varies, treat as 80 avg
  ],
  { ability: 'ironbarbs' },
);