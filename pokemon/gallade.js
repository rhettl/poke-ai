import { mon, move } from './helpers.js';
// jolly, justified | atk 252 / spe 252 / hp 4 | lum_berry
export const gallade = mon(
  'Gallade', ['psychic', 'fighting'],
  { hp: 68, attack: 125, defense: 65, spAttack: 65, spDefense: 115, speed: 80 },
  4,
  [
    move('closecombat', 'fighting', 120, 'physical'),
    move('psychocut',   'psychic',  70,  'physical'),
    move('knockoff',    'dark',     65,  'physical'),
    move('swordsdance', 'normal',   0,   'status', { effect: 'setup_swords_dance', target: 'self' }),
  ],
  { ability: 'justified' },
);