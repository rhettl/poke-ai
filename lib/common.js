/**
 * Shared algorithms used by both StrongBattleAI and EmeraldE4AI.
 * Pure functions only — no side effects, no state.
 */

import { typeEffectiveness, bestTypeEffectiveness, typeMatchupScore } from './typeChart.js';
import { getAbility } from './abilityChart.js';

export { typeEffectiveness, bestTypeEffectiveness, typeMatchupScore };

// ---------------------------------------------------------------------------
// Stat estimation (mirrors StrongBattleAI.statEstimationActive)
// ---------------------------------------------------------------------------

/**
 * Returns the effective stat value after applying battle-stage boosts.
 * Boost stages -6 to +6 map to multipliers per the main-series formula.
 *
 * @param {import('../types.ts').Pokemon} pokemon
 * @param {keyof import('../types.ts').BaseStats} stat
 * @returns {number}
 */
export function effectiveStat(pokemon, stat) {
  const ability = getAbility(pokemon.ability);

  let base = pokemon.baseStats[stat] ?? 1;

  // Huge Power / Pure Power — double the base Attack before boost math
  if (stat === 'attack' && ability.statMultiplier?.stat === 'attack') {
    base *= ability.statMultiplier.factor;
  }

  const boost = pokemon.boosts[stat] ?? 0;
  let multiplier;
  if (boost >= 0) {
    multiplier = (2 + boost) / 2;
  } else {
    multiplier = 2 / (2 + Math.abs(boost));
  }

  // Burn halves Attack unless Guts
  if (stat === 'attack' && pokemon.status === 'burn' && !ability.ignoresBurnAttackDrop) {
    multiplier *= 0.5;
  }

  return base * multiplier;
}

// ---------------------------------------------------------------------------
// Damage estimation (simplified main-series formula)
// ---------------------------------------------------------------------------

/**
 * Estimates damage a single move does from attacker to defender.
 * Returns a value comparable to defender.maxHp (i.e. 50 = 50 HP damage).
 *
 * @param {import('../types.ts').Move} move
 * @param {import('../types.ts').Pokemon} attacker
 * @param {import('../types.ts').Pokemon} defender
 * @param {import('../types.ts').BattleState} state
 * @returns {number}
 */
export function estimateDamage(move, attacker, defender, state) {
  if (move.power === 0) return 0;

  const isPhysical = move.category === 'physical';
  const atkStat = isPhysical ? effectiveStat(attacker, 'attack') : effectiveStat(attacker, 'spAttack');
  const defStat = isPhysical ? effectiveStat(defender, 'defense') : effectiveStat(defender, 'spDefense');

  const level = 50; // assume level 50 for estimation
  let movePower = move.power;

  // Technician: ×1.5 to moves with base power ≤ 60
  const atkAbility = getAbility(attacker.ability);
  if (atkAbility.technicianBoost && movePower > 0 && movePower <= 60) {
    movePower *= 1.5;
  }

  const baseDamage = (((2 * level / 5) + 2) * movePower * (atkStat / defStat)) / 50 + 2;

  // STAB — Adaptability raises multiplier from 1.5 to 2.0
  const stabBonus = atkAbility.stabMultiplier ?? 1.5;
  const stab = attacker.types.includes(move.type) ? stabBonus : 1.0;

  // Type effectiveness
  const typeMultiplier = typeEffectiveness(move.type, defender.types);

  // Defender: Filter / Solid Rock / Prism Armor — reduce SE damage
  const defAbility = getAbility(defender.ability);
  const seReduction = (typeMultiplier >= 2 && defAbility.reducesSuperEffective)
    ? defAbility.reducesSuperEffective : 1.0;

  // Defender: Multiscale / Shadow Shield — halve damage at full HP
  const multiscale = (defAbility.halvesAtFullHp && defender.currentHp === defender.maxHp)
    ? 0.5 : 1.0;

  // Weather
  let weather = 1.0;
  if (state?.weather === 'sunny') {
    if (move.type === 'fire') weather = 1.5;
    if (move.type === 'water') weather = 0.5;
  }
  if (state?.weather === 'rain') {
    if (move.type === 'water') weather = 1.5;
    if (move.type === 'fire') weather = 0.5;
  }

  return baseDamage * stab * typeMultiplier * seReduction * multiscale * weather;
}

/**
 * Returns the highest estimated damage any of the attacker's moves can deal.
 *
 * @param {import('../types.ts').Pokemon} attacker
 * @param {import('../types.ts').Pokemon} defender
 * @param {import('../types.ts').BattleState} state
 * @returns {number}
 */
export function bestEstimatedDamage(attacker, defender, state) {
  const damages = attacker.moves
    .filter(m => !m.disabled && m.power > 0)
    .map(m => estimateDamage(m, attacker, defender, state));
  return damages.length > 0 ? Math.max(...damages) : 0;
}

/**
 * Returns the move with the highest estimated damage.
 *
 * @param {import('../types.ts').Pokemon} attacker
 * @param {import('../types.ts').Pokemon} defender
 * @param {import('../types.ts').BattleState} state
 * @returns {import('../types.ts').Move | null}
 */
export function bestDamagingMove(attacker, defender, state) {
  const usable = attacker.moves.filter(m => !m.disabled && m.power > 0);
  if (usable.length === 0) return null;
  return usable.reduce((best, move) =>
    estimateDamage(move, attacker, defender, state) > estimateDamage(best, attacker, defender, state)
      ? move : best
  );
}

// ---------------------------------------------------------------------------
// Matchup scoring (mirrors StrongBattleAI.estimateMatchup)
// ---------------------------------------------------------------------------

// Weights — mirrors StrongBattleAI constants
const SPEED_TIER_COEFFICIENT           = 4.0;
const TYPE_MATCHUP_WEIGHT              = 2.5;
const MOVE_DAMAGE_WEIGHT               = 0.8;
const ANTI_BOOST_WEIGHT                = 25;
const HP_FRACTION_COEFFICIENT          = 0.4;
const HP_WEIGHT_CONSIDERATION          = 0.25;

/**
 * Estimates how favourable the matchup is for `pokemon` against `opponent`.
 * Positive = good for AI. Negative = bad.
 * Mirrors StrongBattleAI.estimateMatchup().
 *
 * @param {import('../types.ts').Pokemon} pokemon   — the AI's pokemon (active or bench)
 * @param {import('../types.ts').Pokemon} opponent  — the player's active pokemon
 * @param {import('../types.ts').BattleState} state
 * @returns {number}
 */
export function estimateMatchup(pokemon, opponent, state) {
  let score = 1.0;

  const aiTypeScore  = typeMatchupScore(pokemon, opponent);
  const aiMoveScore  = bestTypeEffectiveness(pokemon, opponent);
  const oppTypeScore = typeMatchupScore(opponent, pokemon);
  const oppMoveScore = bestTypeEffectiveness(opponent, pokemon);

  // Offensive advantage
  score += (aiMoveScore  * MOVE_DAMAGE_WEIGHT) + (aiTypeScore  * TYPE_MATCHUP_WEIGHT);
  // Opponent's offensive advantage against us
  score -= (oppMoveScore * MOVE_DAMAGE_WEIGHT) + (oppTypeScore * TYPE_MATCHUP_WEIGHT);

  // Speed tier
  const aiSpeed  = effectiveStat(pokemon, 'speed');
  const oppSpeed = effectiveStat(opponent, 'speed');
  const trickRoom = state?.room === 'trickroom';
  const speedCoeff = trickRoom ? -SPEED_TIER_COEFFICIENT : SPEED_TIER_COEFFICIENT;

  if (aiSpeed > oppSpeed) score += speedCoeff;
  else if (oppSpeed > aiSpeed) score -= speedCoeff;

  // HP fraction
  const aiHpFrac  = pokemon.currentHp  / pokemon.maxHp;
  const oppHpFrac = opponent.currentHp / opponent.maxHp;
  score += (aiHpFrac  * HP_FRACTION_COEFFICIENT) * HP_WEIGHT_CONSIDERATION;
  score -= (oppHpFrac * HP_FRACTION_COEFFICIENT) * HP_WEIGHT_CONSIDERATION;

  // Anti-boost bonus — if opponent is boosted and AI has a boost-clearing move
  const oppBoosted = Object.values(opponent.boosts).some(b => b > 1);
  const hasAntiBoost = pokemon.moves.some(m =>
    ['haze', 'clearsmog', 'whirlwind', 'roar', 'encore'].includes(m.id)
  );
  if (oppBoosted && hasAntiBoost) score += ANTI_BOOST_WEIGHT;

  return score;
}

// ---------------------------------------------------------------------------
// Switch selection
// ---------------------------------------------------------------------------

/**
 * From a list of bench pokemon, returns the one with the best estimateMatchup
 * score against the given opponent. Returns null if bench is empty.
 *
 * @param {import('../types.ts').Pokemon[]} bench
 * @param {import('../types.ts').Pokemon} opponent
 * @param {import('../types.ts').BattleState} state
 * @returns {import('../types.ts').Pokemon | null}
 */
export function chooseBestSwitch(bench, opponent, state) {
  const available = bench.filter(p => p.currentHp > 0);
  if (available.length === 0) return null;
  return available.reduce((best, p) =>
    estimateMatchup(p, opponent, state) > estimateMatchup(best, opponent, state) ? p : best
  );
}

/**
 * Can the given pokemon be legally sent out?
 * (Alive and not already flagged as being switched in.)
 *
 * @param {import('../types.ts').Pokemon} pokemon
 * @returns {boolean}
 */
export function canBeSentOut(pokemon) {
  return pokemon.currentHp > 0;
}

// ---------------------------------------------------------------------------
// Misc helpers
// ---------------------------------------------------------------------------

/**
 * Returns true with the given probability (0.0 – 1.0).
 * @param {number} chance
 * @returns {boolean}
 */
export function roll(chance) {
  return Math.random() < chance;
}

/**
 * Returns a random element from an array, or null if empty.
 * @template T
 * @param {T[]} arr
 * @returns {T | null}
 */
export function randomFrom(arr) {
  if (arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}