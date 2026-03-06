import { mon, move } from './helpers.js';
export const blaziken = mon(
  'Blaziken', ['fire', 'fighting'],
  { hp: 80, attack: 120, defense: 70, spAttack: 110, spDefense: 70, speed: 80 },
  4,
  [
    move('closecombat', 'fighting', 120, 'physical'),
    move('flareblitz',  'fire',     120, 'physical'),
    move('stoneedge',   'rock',     100, 'physical'),
    move('swordsdance', 'normal',   0,   'status', { effect: 'setup_swords_dance', target: 'self' }),
  ],
);
