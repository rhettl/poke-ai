import { mon, move } from './helpers.js';
export const salamence = mon(
  'Salamence', ['dragon', 'flying'],
  { hp: 95, attack: 135, defense: 80, spAttack: 110, spDefense: 80, speed: 100 },
  4,
  [
    move('outrage',     'dragon', 120, 'physical'),
    move('earthquake',  'ground', 100, 'physical'),
    move('fireblast',   'fire',   110, 'special'),
    move('dragondance', 'dragon', 0,   'status', { effect: 'setup_swords_dance', target: 'self' }),
  ],
);
