/**
 * Shared helpers for building mock Pokemon objects.
 * All HP values computed at level 65, 31 IVs.
 */

/**
 * HP stat at level 65 with 31 IVs.
 * @param {number} base  base HP stat
 * @param {number} evs   HP EVs (0–252)
 */
export function calcHp(base, evs = 0) {
  return Math.floor(((2 * base + 31 + Math.floor(evs / 4)) * 65) / 100) + 75;
}

/**
 * @param {string} id
 * @param {string} type
 * @param {number} power
 * @param {'physical'|'special'|'status'} category
 * @param {object} opts
 * @returns {import('../../types.ts').Move}
 */
export function move(id, type, power, category, opts = {}) {
  return {
    id, name: id, type, power, category,
    accuracy:   opts.accuracy   ?? 100,
    pp:         opts.pp         ?? 10,
    currentPp:  opts.pp         ?? 10,
    effect:     opts.effect     ?? null,
    priority:   opts.priority   ?? 0,
    target:     opts.target     ?? (power > 0 ? 'opponent' : 'self'),
    disabled:   false,
    mustBeUsed: false,
  };
}

/**
 * @param {string} name
 * @param {string[]} types
 * @param {import('../../types.ts').BaseStats} baseStats
 * @param {number} hpEvs
 * @param {import('../../types.ts').Move[]} moves
 * @param {object} opts
 * @returns {import('../../types.ts').Pokemon}
 */
export function mon(name, types, baseStats, hpEvs, moves, opts = {}) {
  const maxHp = calcHp(baseStats.hp, hpEvs);
  const currentHp = opts.hpPercent != null ? Math.floor(maxHp * opts.hpPercent) : maxHp;
  return {
    id:        name.toLowerCase().replace(/[\s-]/g, '_'),
    name,
    types,
    baseStats,
    currentHp,
    maxHp,
    moves,
    status:    opts.status    ?? null,
    boosts:    opts.boosts    ?? {},
    ability:   opts.ability   ?? null,
    firstTurn: opts.firstTurn ?? false,
  };
}