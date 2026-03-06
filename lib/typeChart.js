/**
 * Gen 6+ type effectiveness chart.
 * chart[attackType][defendType] = multiplier (0, 0.5, 1, 2)
 *
 * Only non-1.0 entries are listed; everything else defaults to 1.0.
 */

const IMMUNE   = 0;
const RESIST   = 0.5;
const NEUTRAL  = 1;
const SUPER    = 2;

/** @type {Record<string, Record<string, number>>} */
export const typeChart = {
  normal:   { rock: RESIST, steel: RESIST, ghost: IMMUNE },
  fire:     { fire: RESIST, water: RESIST, rock: RESIST, dragon: RESIST, grass: SUPER, ice: SUPER, bug: SUPER, steel: SUPER },
  water:    { water: RESIST, grass: RESIST, dragon: RESIST, fire: SUPER, ground: SUPER, rock: SUPER },
  grass:    { fire: RESIST, grass: RESIST, poison: RESIST, flying: RESIST, bug: RESIST, dragon: RESIST, steel: RESIST, water: SUPER, ground: SUPER, rock: SUPER },
  electric: { grass: RESIST, electric: RESIST, dragon: RESIST, ground: IMMUNE, water: SUPER, flying: SUPER },
  ice:      { water: RESIST, ice: RESIST, fire: SUPER, fighting: SUPER, rock: SUPER, steel: SUPER, grass: SUPER, ground: SUPER, flying: SUPER, dragon: SUPER },
  fighting: { poison: RESIST, bug: RESIST, psychic: RESIST, flying: RESIST, fairy: RESIST, ghost: IMMUNE, normal: SUPER, ice: SUPER, rock: SUPER, dark: SUPER, steel: SUPER },
  poison:   { poison: RESIST, ground: RESIST, rock: RESIST, ghost: RESIST, steel: IMMUNE, grass: SUPER, fairy: SUPER },
  ground:   { grass: RESIST, bug: RESIST, flying: IMMUNE, fire: SUPER, electric: SUPER, poison: SUPER, rock: SUPER, steel: SUPER },
  flying:   { electric: RESIST, rock: RESIST, steel: RESIST, grass: SUPER, fighting: SUPER, bug: SUPER },
  psychic:  { psychic: RESIST, steel: RESIST, dark: IMMUNE, fighting: SUPER, poison: SUPER },
  bug:      { fire: RESIST, fighting: RESIST, flying: RESIST, ghost: RESIST, steel: RESIST, fairy: RESIST, grass: SUPER, psychic: SUPER, dark: SUPER },
  rock:     { fighting: RESIST, ground: RESIST, steel: RESIST, fire: SUPER, ice: SUPER, flying: SUPER, bug: SUPER },
  ghost:    { normal: IMMUNE, dark: RESIST, psychic: SUPER, ghost: SUPER },
  dragon:   { steel: RESIST, fairy: IMMUNE, dragon: SUPER },
  dark:     { fighting: RESIST, dark: RESIST, fairy: RESIST, psychic: SUPER, ghost: SUPER },
  steel:    { fire: RESIST, water: RESIST, electric: RESIST, steel: RESIST, ice: SUPER, rock: SUPER, fairy: SUPER },
  fairy:    { fire: RESIST, poison: RESIST, steel: RESIST, fighting: SUPER, dragon: SUPER, dark: SUPER },
};

/**
 * Returns the damage multiplier for a move of the given type against a defender.
 * Handles dual-typing (multiplies both).
 *
 * @param {string} moveType
 * @param {string[]} defenderTypes
 * @returns {number}
 */
export function typeEffectiveness(moveType, defenderTypes) {
  const row = typeChart[moveType] ?? {};
  return defenderTypes.reduce((mult, defType) => mult * (row[defType] ?? NEUTRAL), 1);
}

/**
 * Returns the best possible type effectiveness any of the attacker's moves
 * can achieve against the defender.
 *
 * @param {import('../types.js').Pokemon} attacker
 * @param {import('../types.js').Pokemon} defender
 * @returns {number}
 */
export function bestTypeEffectiveness(attacker, defender) {
  const moveMults = attacker.moves
    .filter(m => m.power > 0)
    .map(m => typeEffectiveness(m.type, defender.types));
  return moveMults.length > 0 ? Math.max(...moveMults) : 1;
}

/**
 * Offensive type matchup score for a pokemon's own typing against a defender.
 * Picks the best multiplier among the attacker's types (as if the attacker used
 * a STAB move of each of its own types).
 *
 * @param {import('../types.js').Pokemon} attacker
 * @param {import('../types.js').Pokemon} defender
 * @returns {number}
 */
export function typeMatchupScore(attacker, defender) {
  const mults = attacker.types.map(t => typeEffectiveness(t, defender.types));
  return Math.max(...mults);
}