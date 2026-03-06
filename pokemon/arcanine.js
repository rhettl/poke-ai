import { mon, move } from './helpers.js';
// adamant, intimidate | atk 252 / spe 252 / hp 4 | heavy_duty_boots
export const arcanine = mon(
  'Arcanine', ['fire'],
  { hp: 90, attack: 110, defense: 80, spAttack: 100, spDefense: 80, speed: 95 },
  4,
  [
    move('flareblitz',   'fire',     120, 'physical'),
    move('extremespeed', 'normal',   80,  'physical', { priority: 2 }),
    move('closecombat',  'fighting', 120, 'physical'),
    move('willowisp',    'fire',     0,   'status', { effect: 'burn', target: 'opponent' }),
  ],
  { ability: 'intimidate' },
);
