import { mon, move } from './helpers.js';
export const blissey = mon(
  'Blissey', ['normal'],
  { hp: 255, attack: 10, defense: 10, spAttack: 75, spDefense: 135, speed: 55 },
  252,
  [
    move('softboiled',   'normal',   0,  'status',   { effect: 'heal', target: 'self' }),
    move('seismictoss',  'normal',   1,  'physical'),
    move('thunderwave',  'electric', 0,  'status',   { effect: 'paralyze', target: 'opponent' }),
    move('flamethrower', 'fire',     90, 'special'),
  ],
);
