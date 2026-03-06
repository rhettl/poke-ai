import { mon, move } from './helpers.js';
export const togekiss = mon(
  'Togekiss', ['normal', 'fairy'],
  { hp: 85, attack: 50, defense: 95, spAttack: 120, spDefense: 115, speed: 80 },
  4,
  [
    move('airslash',     'flying',   75, 'special'),
    move('moonblast',    'fairy',    95, 'special'),
    move('thunderwave',  'electric', 0,  'status', { effect: 'paralyze', target: 'opponent' }),
    move('roost',        'flying',   0,  'status', { effect: 'heal',     target: 'self' }),
  ],
);
