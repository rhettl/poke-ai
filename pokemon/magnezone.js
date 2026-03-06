import { mon, move } from './helpers.js';
// modest, magnetpull | hp 252 / spa 252 / spd 4 | assault_vest
export const magnezone = mon(
  'Magnezone', ['electric', 'steel'],
  { hp: 70, attack: 70, defense: 115, spAttack: 130, spDefense: 90, speed: 60 },
  252,
  [
    move('thunderbolt',  'electric', 90, 'special'),
    move('flashcannon',  'steel',    80, 'special'),
    move('voltswitch',   'electric', 70, 'special', { effect: 'pivot' }),
    move('bodypress',    'fighting', 80, 'physical'),
  ],
  { ability: 'magnetpull' },
);