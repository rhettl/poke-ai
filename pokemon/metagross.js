import { mon, move } from './helpers.js';
// adamant, clearbody | atk 252 / spe 252 / hp 4 | life_orb
export const metagross = mon(
  'Metagross', ['steel', 'psychic'],
  { hp: 80, attack: 135, defense: 130, spAttack: 95, spDefense: 90, speed: 70 },
  4,
  [
    move('meteormash',  'steel',   90,  'physical'),
    move('zenheadbutt', 'psychic', 80,  'physical'),
    move('earthquake',  'ground',  100, 'physical'),
    move('bulletpunch', 'steel',   40,  'physical', { priority: 1 }),
  ],
  { ability: 'clearbody' },
);