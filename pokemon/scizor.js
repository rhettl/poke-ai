import { mon, move } from './helpers.js';

// adamant, technician | atk 252 / hp 252 / def 4 | choice_band (admin slot)
export const scizorAdmin = mon(
  'Scizor', ['bug', 'steel'],
  { hp: 70, attack: 130, defense: 100, spAttack: 55, spDefense: 80, speed: 65 },
  252,
  [
    move('bulletpunch', 'steel',    40,  'physical', { priority: 1 }),
    move('uturn',       'bug',      70,  'physical', { effect: 'pivot' }),
    move('superpower',  'fighting', 120, 'physical'),
    move('knockoff',    'dark',     65,  'physical'),
  ],
  { ability: 'technician' },
);

// adamant, technician | atk 252 / hp 252 / def 4 | life_orb (architect slot)
export const scizorArchitect = mon(
  'Scizor', ['bug', 'steel'],
  { hp: 70, attack: 130, defense: 100, spAttack: 55, spDefense: 80, speed: 65 },
  252,
  [
    move('bulletpunch', 'steel',    40,  'physical', { priority: 1 }),
    move('uturn',       'bug',      70,  'physical', { effect: 'pivot' }),
    move('swordsdance', 'normal',   0,   'status',   { effect: 'setup_swords_dance', target: 'self' }),
    move('superpower',  'fighting', 120, 'physical'),
  ],
  { ability: 'technician' },
);

// default export = architect variant
export const scizor = scizorArchitect;