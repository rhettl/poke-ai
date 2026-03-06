import { mon, move } from './helpers.js';
export const machamp = mon(
  'Machamp', ['fighting'],
  { hp: 90, attack: 130, defense: 80, spAttack: 65, spDefense: 85, speed: 55 },
  0,
  [
    move('closecombat', 'fighting', 120, 'physical'),
    move('stoneedge',   'rock',     100, 'physical'),
    move('icepunch',    'ice',      75,  'physical'),
    move('bulletpunch', 'steel',    40,  'physical', { priority: 1 }),
  ],
);
