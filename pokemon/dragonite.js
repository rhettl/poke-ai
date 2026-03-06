import { mon, move } from './helpers.js';
// adamant, multiscale | atk 252 / spe 252 / hp 4 | lum_berry
export const dragonite = mon(
  'Dragonite', ['dragon', 'flying'],
  { hp: 91, attack: 134, defense: 95, spAttack: 100, spDefense: 100, speed: 80 },
  4,
  [
    move('dragonclaw',   'dragon',  80,  'physical'),
    move('earthquake',   'ground',  100, 'physical'),
    move('extremespeed', 'normal',  80,  'physical', { priority: 2 }),
    move('dragondance',  'dragon',  0,   'status',   { effect: 'setup_swords_dance', target: 'self' }),
  ],
  { ability: 'multiscale' },
);