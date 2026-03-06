/**
 * EmeraldE4AI — JavaScript approximation of the Emerald Elite 4 AI.
 *
 * Architecture: multi-pass move scoring.
 * Every move gets an additive score from each active script. Highest score wins.
 * Switching is a separate binary check evaluated before move selection.
 *
 * Flag reference (pret/pokeemerald include/constants/battle_ai.h):
 *
 *   Scoring scripts (affect move selection):
 *     Bit 0  CHECK_BAD_MOVE      — veto moves with no effect
 *     Bit 1  TRY_TO_FAINT        — reward KO opportunities
 *     Bit 2  CHECK_VIABILITY     — situational scoring (100+ effects)
 *     Bit 3  SETUP_FIRST_TURN    — bonus for setup moves on turn 1
 *     Bit 4  RISKY               — bonus for high-risk moves (50% chance)
 *     Bit 5  PREFER_POWER_EXTREMES — reward unusual-power moves (0 or very high)
 *     Bit 6  PREFER_BATON_PASS   — strongly reward setup when Baton Pass is available
 *     Bit 7  DOUBLE_BATTLE       — penalise ally-hitting moves, reward partner synergy
 *     Bit 8  HP_AWARE            — adjust scores based on HP thresholds
 *     Bit 9  TRY_SUNNY_DAY       — +5 to Sunny Day on turn 1
 *
 *   Flee scripts (handled via shouldFlee(), not move scoring):
 *     Bit 29 ROAMING             — roaming legendary flee logic
 *     Bit 30 SAFARI              — safari zone flee logic
 *     Bit 31 FIRST_BATTLE        — tutorial battle, flee when opponent is low HP
 *
 * Source: pret/pokeemerald src/battle_ai_script_commands.c
 *         pret/pokeemerald src/battle_ai_switch_items.c
 */

import {
  typeEffectiveness,
  bestTypeEffectiveness,
  estimateDamage,
  roll,
  randomFrom,
  effectiveStat,
} from './lib/common.js';
import { getAbility } from './lib/abilityChart.js';

const BAD_MOVE_VETO = -10;

/**
 * Bitmask flags matching pret/pokeemerald include/constants/battle_ai.h.
 * Pass any combination to EmeraldE4AI to replicate different trainer tiers.
 *
 * Elite 4 uses all flags. Weaker trainers use fewer.
 * Example — youngster AI: CHECK_BAD_MOVE only
 * Example — gym leader AI: CHECK_BAD_MOVE | TRY_TO_FAINT | CHECK_VIABILITY | HP_AWARE
 */
export const AIFlags = {
  CHECK_BAD_MOVE:        1 << 0,  // veto moves that have no effect
  TRY_TO_FAINT:          1 << 1,  // reward KO opportunities
  CHECK_VIABILITY:       1 << 2,  // situational move scoring (100+ effects)
  SETUP_FIRST_TURN:      1 << 3,  // bonus for setup moves on turn 1
  RISKY:                 1 << 4,  // bonus for high-risk moves (50% chance)
  PREFER_POWER_EXTREMES: 1 << 5,  // reward 0-power or very high-power moves
  PREFER_BATON_PASS:     1 << 6,  // strongly reward setup when Baton Pass is available
  DOUBLE_BATTLE:         1 << 7,  // penalise ally-hitting moves, reward partner synergy
  HP_AWARE:              1 << 8,  // adjust scores based on HP thresholds
  TRY_SUNNY_DAY:         1 << 9,  // +5 to Sunny Day on turn 1

  // flee scripts (used in shouldFlee(), not move scoring)
  ROAMING:     1 << 29,  // roaming legendary flee logic
  SAFARI:      1 << 30,  // safari zone flee logic
  FIRST_BATTLE: 1 << 31, // tutorial battle flee when opponent is low HP

  // convenience presets
  ELITE_FOUR: (1<<0)|(1<<1)|(1<<2)|(1<<3)|(1<<4)|(1<<5)|(1<<6)|(1<<7)|(1<<8)|(1<<9),
  GYM_LEADER: (1 << 0) | (1 << 1) | (1 << 2) | (1 << 8),
  YOUNGSTER:  (1 << 0),
};

export class EmeraldE4AI {
  /** @param {number} flags  bitmask of AIFlags (default: ELITE_FOUR) */
  constructor(flags = AIFlags.ELITE_FOUR) {
    this.flags = flags;
    /** @type {string | null} last move the opponent used */
    this._opponentLastMove = null;
    /** @type {boolean} is this the first turn of the battle? */
    this._isFirstTurn = true;
  }

  /** @param {number} flag  single AIFlags value */
  _has(flag) { return (this.flags & flag) !== 0; }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * @param {import('./types.ts').Pokemon} active
   * @param {import('./types.ts').Pokemon[]} bench
   * @param {import('./types.ts').Pokemon} opponent
   * @param {import('./types.ts').BattleState} state
   * @param {boolean} forceSwitch
   * @param {import('./types.ts').Pokemon[]} allies  — allied pokemon present in doubles (empty in singles)
   * @returns {import('./types.ts').AIDecision}
   */
  chooseMoveOrSwitch(active, bench, opponent, state, forceSwitch = false, allies = []) {
    // Forced switch — pick best type-coverage replacement
    if (forceSwitch || active.currentHp <= 0) {
      const best = this._getBestReplacement(bench, opponent);
      if (!best) return { type: 'pass' };
      return { type: 'switch', pokemon: best };
    }

    // Voluntary switch check — separate from move scoring
    if (this.shouldSwitchOut(active, bench, opponent, state)) {
      const best = this._getBestReplacement(bench, opponent);
      if (best) return { type: 'switch', pokemon: best };
    }

    // Score all moves
    const usable = active.moves.filter(m => !m.disabled && m.currentPp > 0);
    if (usable.length === 0) return { type: 'pass' };

    const scores = this._scoreAllMoves(active, usable, opponent, state, allies);

    // Pick highest score; random tiebreak
    const maxScore = Math.max(...scores);
    const candidates = usable.filter((_, i) => scores[i] === maxScore);
    const chosen = randomFrom(candidates);

    this._isFirstTurn = false;
    return chosen ? { type: 'move', moveId: chosen.id } : { type: 'pass' };
  }

  /**
   * Emerald switch logic — discrete situational checks, not a score comparison.
   *
   * @param {import('./types.ts').Pokemon} active
   * @param {import('./types.ts').Pokemon[]} bench
   * @param {import('./types.ts').Pokemon} opponent
   * @param {import('./types.ts').BattleState} state
   * @returns {boolean}
   */
  shouldSwitchOut(active, bench, opponent, state) {
    if (state.trapped) return false;

    const available = bench.filter(p => p.currentHp > 0);
    if (available.length === 0) return false;

    // 1. Perish Song — switch before timer hits 0
    // (approximated: if we have a perishsong effect tracked)
    // Omitted — requires game-state tracking beyond this prototype's scope

    // 2. Wonder Guard: can't hit the opponent at all
    if (getAbility(opponent.ability).immuneToNonSuperEffective) {
      const hasSuperEffective = active.moves.some(
        m => m.power > 0 && typeEffectiveness(m.type, opponent.types) >= 2
      );
      if (!hasSuperEffective) return true;
    }

    // 3. Ability absorption: bench has a counter to opponent's last move type
    if (this._opponentLastMove) {
      const absorbers = available.filter(p =>
        getAbility(p.ability).absorbsType === this._opponentLastMove
      );
      if (absorbers.length > 0) return true;
    }

    // 4. Status-curing ability: asleep — switch to cure (50% random)
    if (active.status === 'sleep' && getAbility(active.ability).curesStatusOnSwitch) {
      if (roll(0.5)) return true;
    }

    // 5. If current mon has super-effective coverage — stay and fight
    const hasSuperEffectiveMoves = active.moves.some(
      m => m.power > 0 && typeEffectiveness(m.type, opponent.types) >= 2
    );
    if (hasSuperEffectiveMoves) return false;

    // 6. If current mon has significant stat boosts — don't waste them
    const totalBoosts = Object.values(active.boosts).reduce((s, b) => s + (b > 0 ? b : 0), 0);
    if (totalBoosts >= 2) return false;

    // 7. Bad type matchup: opponent's last move was NVE/immune against us
    //    AND a bench replacement has super-effective coverage against opponent (33% chance)
    if (this._opponentLastMove) {
      const opponentMovePair = opponent.moves.find(m => m.id === this._opponentLastMove);
      if (opponentMovePair) {
        const effectivenessVsUs = typeEffectiveness(opponentMovePair.type, active.types);
        if (effectivenessVsUs <= 0.5) {
          // Opponent's move was NVE or immune — but do we have a better counter?
          const betterReplacement = available.find(p =>
            p.moves.some(m => m.power > 0 && typeEffectiveness(m.type, opponent.types) >= 2)
          );
          if (betterReplacement && roll(0.33)) return true;
        }
      }
    }

    return false;
  }

  // ---------------------------------------------------------------------------
  // Scoring pipeline
  // ---------------------------------------------------------------------------

  /**
   * Runs all AI scripts for each move. Returns an array of scores
   * parallel to the `moves` array.
   *
   * @param {import('./types.ts').Pokemon} active
   * @param {import('./types.ts').Move[]} moves
   * @param {import('./types.ts').Pokemon} opponent
   * @param {import('./types.ts').BattleState} state
   * @param {import('./types.ts').Pokemon[]} allies
   * @returns {number[]}
   */
  _scoreAllMoves(active, moves, opponent, state, allies = []) {
    return moves.map(move => {
      let score = 0;
      if (this._has(AIFlags.CHECK_BAD_MOVE))        score += this._checkBadMove(move, active, opponent, state);
      if (this._has(AIFlags.TRY_TO_FAINT))          score += this._tryToFaint(move, active, opponent, state);
      if (this._has(AIFlags.CHECK_VIABILITY))       score += this._checkViability(move, active, opponent, state);
      if (this._has(AIFlags.SETUP_FIRST_TURN))      score += this._setupFirstTurn(move);
      if (this._has(AIFlags.RISKY))                 score += this._risky(move, active, opponent);
      if (this._has(AIFlags.PREFER_POWER_EXTREMES)) score += this._preferPowerExtremes(move);
      if (this._has(AIFlags.PREFER_BATON_PASS))     score += this._preferBatonPass(move, active);
      if (this._has(AIFlags.DOUBLE_BATTLE))         score += this._doubleBattle(move, active, allies, opponent);
      if (this._has(AIFlags.HP_AWARE))              score += this._hpAware(move, active, opponent);
      if (this._has(AIFlags.TRY_SUNNY_DAY))         score += this._trySunnyDay(move, state);
      return Math.max(0, score); // floor at 0
    });
  }

  // ---------------------------------------------------------------------------
  // Script 1: CHECK_BAD_MOVE — hard vetoes for ineffective moves
  // ---------------------------------------------------------------------------

  _checkBadMove(move, active, opponent, state) {
    let score = 0;

    // Immune type
    const effectiveness = typeEffectiveness(move.type, opponent.types);
    if (effectiveness === 0) return BAD_MOVE_VETO;

    // Ability-based immunities (data-driven via abilityChart)
    const oppAbility = getAbility(opponent.ability);
    if (oppAbility.absorbsType   === move.type) return BAD_MOVE_VETO;
    if (oppAbility.immuneToType  === move.type) return BAD_MOVE_VETO;
    if (oppAbility.immuneToNonSuperEffective && effectiveness < 2) return -12;

    // Status moves that are redundant
    if (move.effect === 'sleep'  && opponent.status === 'sleep')  score += BAD_MOVE_VETO;
    if (move.effect === 'poison' && opponent.status != null)      score += BAD_MOVE_VETO;
    if (move.effect === 'burn'   && opponent.status != null)      score += BAD_MOVE_VETO;

    // Stat drops already at minimum
    if (move.effect?.startsWith('drop_')) {
      const stat = move.effect.replace('drop_', '');
      if ((opponent.boosts[stat] ?? 0) <= -6) score += BAD_MOVE_VETO;
    }

    return score;
  }

  // ---------------------------------------------------------------------------
  // Script 2: TRY_TO_FAINT — reward KO opportunities
  // ---------------------------------------------------------------------------

  _tryToFaint(move, active, opponent, state) {
    if (move.power === 0) return 0;

    const damage = estimateDamage(move, active, opponent, state);
    if (damage >= opponent.currentHp) {
      let bonus = move.priority > 0 ? 3 : 2;
      // Prefer decisive KOs — more overkill means more reliable even with variance
      if (damage >= opponent.currentHp * 1.5) bonus += 1;
      return bonus;
    }

    // x4 effectiveness even without KO: 80% chance of +2
    const effectiveness = typeEffectiveness(move.type, opponent.types);
    if (effectiveness >= 4 && roll(0.8)) return 2;

    return 0;
  }

  // ---------------------------------------------------------------------------
  // Script 3: CHECK_VIABILITY — contextual move scoring
  // ---------------------------------------------------------------------------

  _checkViability(move, active, opponent, state) {
    const hpPercent = active.currentHp / active.maxHp;
    const effect = move.effect;

    // Healing moves
    if (effect === 'heal') {
      if (hpPercent < 0.5)  return  1;
      if (hpPercent >= 0.75) return -1;
      return 0;
    }

    // Sleep moves
    if (effect === 'sleep') {
      return opponent.status == null ? 1 : -10;
    }

    // Status infliction
    if (['burn', 'poison', 'badly_poison', 'paralyze'].includes(effect ?? '')) {
      return opponent.status == null ? 1 : -10;
    }

    // Stat boost (self)
    if (effect?.startsWith('boost_') && move.target === 'self') {
      const stat = effect.replace('boost_', '');
      const current = active.boosts[stat] ?? 0;
      return current < 6 ? 1 : -1;
    }

    // Stat drop (opponent)
    if (effect?.startsWith('drop_')) {
      const stat = effect.replace('drop_', '');
      const current = opponent.boosts[stat] ?? 0;
      return current > -6 ? 1 : -10;
    }

    // Screens
    if (['screen_reflect', 'screen_lightscreen', 'screen_auroraveil'].includes(effect ?? '')) {
      return 1;
    }

    // Weather
    if (effect?.startsWith('weather_')) {
      const target = effect.replace('weather_', '');
      return state.weather !== target ? 1 : -1;
    }

    // Entry hazards
    if (effect?.startsWith('hazard_')) return 1;

    // OHKO moves — risky but occasionally tried
    if (effect === 'ohko') return roll(0.25) ? 1 : 0;

    return 0;
  }

  // ---------------------------------------------------------------------------
  // Script 4: SETUP_FIRST_TURN — turn 1 setup bonus
  // ---------------------------------------------------------------------------

  _setupFirstTurn(move) {
    if (!this._isFirstTurn) return 0;
    const isSetup = move.effect?.startsWith('setup_') || move.effect?.startsWith('boost_');
    return isSetup && roll(0.8) ? 2 : 0;
  }

  // ---------------------------------------------------------------------------
  // Script 5: RISKY — high-risk high-reward bonus
  // ---------------------------------------------------------------------------

  _risky(move, active, opponent) {
    const riskyEffects = new Set([
      'sleep', 'explosion', 'ohko', 'confuse', 'destiny_bond',
      'swagger', 'attract', 'setup_belly_drum', 'mirror_coat',
      'focus_punch', 'revenge',
    ]);
    const riskyIds = new Set([
      'explosion', 'selfdestruct', 'destinybond', 'swagger',
      'bellydrum', 'mirrorcoat', 'focuspunch', 'revenge', 'teeterdance',
    ]);
    const isRisky = riskyEffects.has(move.effect ?? '') || riskyIds.has(move.id);
    return isRisky && roll(0.5) ? 2 : 0;
  }

  // ---------------------------------------------------------------------------
  // Script 6: PREFER_POWER_EXTREMES — reward 0-power or very high-power moves
  // ---------------------------------------------------------------------------

  _preferPowerExtremes(move) {
    // 60% chance to reward moves with unusual power: status (0) or very hard-hitting (120+)
    if (!roll(0.6)) return 0;
    if (move.power === 0)    return 2;  // status moves count as "extreme low"
    if (move.power >= 120)   return 2;  // nukes preferred
    return 0;
  }

  // ---------------------------------------------------------------------------
  // Script 7: PREFER_BATON_PASS — setup bonus when Baton Pass is in moveset
  // ---------------------------------------------------------------------------

  _preferBatonPass(move, active) {
    const hasBatonPass = active.moves.some(m => m.id === 'batonpass');
    if (!hasBatonPass) return 0;

    // Already have boosts — strongly prefer Baton Pass itself
    if (move.id === 'batonpass') {
      const totalBoosts = Object.values(active.boosts).reduce((s, b) => s + (b > 0 ? b : 0), 0);
      return totalBoosts >= 2 ? 5 : 3;
    }

    // Otherwise prefer setup moves to build boosts before passing
    const isSetup = move.effect?.startsWith('setup_') || move.effect?.startsWith('boost_');
    return isSetup ? 3 : 0;
  }

  // ---------------------------------------------------------------------------
  // Script 8: DOUBLE_BATTLE — penalise spread/ally-hit moves, reward partner synergy
  // ---------------------------------------------------------------------------

  /**
   * @param {import('./types.ts').Move} move
   * @param {import('./types.ts').Pokemon} active
   * @param {import('./types.ts').Pokemon[]} allies  partner pokemon on the AI's side
   * @param {import('./types.ts').Pokemon} opponent
   * @returns {number}
   */
  _doubleBattle(move, active, allies, opponent) {
    let score = 0;

    // Penalise moves that target all pokemon (including allies): Earthquake, Surf, etc.
    const hitsAllies = move.target === 'all' || move.target === 'adjacentAlly';
    if (hitsAllies && allies.length > 0) {
      score -= 2;
      // Extra penalty if the move would be super-effective against an ally
      const wouldHurtAlly = allies.some(
        ally => typeEffectiveness(move.type, ally.types) >= 2
      );
      if (wouldHurtAlly) score -= 3;
    }

    // Reward moves that benefit allies
    if (move.id === 'helpinghand') score += 3;
    if (move.id === 'followme' || move.id === 'ragepowder') score += 2;

    // Reward weather setters if ally benefits (has a weather-boosted move)
    if (move.effect === 'weather_sunny') {
      const allyLikesSum = allies.some(a => a.moves.some(m => m.type === 'fire' || m.type === 'grass'));
      if (allyLikesSum) score += 2;
    }
    if (move.effect === 'weather_rain') {
      const allyLikesRain = allies.some(a => a.moves.some(m => m.type === 'water'));
      if (allyLikesRain) score += 2;
    }

    return score;
  }

  // ---------------------------------------------------------------------------
  // Script 10: TRY_SUNNY_DAY — +5 to Sunny Day on turn 1
  // ---------------------------------------------------------------------------

  _trySunnyDay(move, state) {
    if (!this._isFirstTurn) return 0;
    if (move.effect === 'weather_sunny' && state.weather !== 'sunny') return 5;
    return 0;
  }

  // ---------------------------------------------------------------------------
  // Script 11: HP_AWARE — adjustments based on both sides' HP
  // ---------------------------------------------------------------------------

  _hpAware(move, active, opponent) {
    const myHp  = active.currentHp   / active.maxHp;
    const oppHp = opponent.currentHp / opponent.maxHp;
    let score = 0;

    // When I'm healthy: discourage healing
    if (myHp >= 0.7 && move.effect === 'heal') score -= 1;

    // When I'm low: discourage setup, encourage damage
    if (myHp < 0.3) {
      if (move.effect?.startsWith('setup_') || move.effect?.startsWith('boost_')) score -= 1;
      if (move.power > 0) score += 1;
    }

    // When opponent is healthy and move is weak
    if (oppHp >= 0.7 && move.power > 0 && move.power < 50) score -= 1;

    // When opponent is low: prefer finishing moves
    if (oppHp < 0.3 && move.power > 0) score += 1;

    return score;
  }

  // ---------------------------------------------------------------------------
  // Replacement selection — type coverage based (not matchup score)
  // ---------------------------------------------------------------------------

  /**
   * Picks the bench mon with the best super-effective coverage against opponent,
   * falling back to highest estimated damage output.
   *
   * @param {import('./types.ts').Pokemon[]} bench
   * @param {import('./types.ts').Pokemon} opponent
   * @returns {import('./types.ts').Pokemon | null}
   */
  _getBestReplacement(bench, opponent) {
    const available = bench.filter(p => p.currentHp > 0);
    if (available.length === 0) return null;

    // Prefer one with a super-effective move
    const withSE = available.filter(p =>
      p.moves.some(m => m.power > 0 && typeEffectiveness(m.type, opponent.types) >= 2)
    );
    if (withSE.length > 0) return randomFrom(withSE);

    // Otherwise best type effectiveness
    return available.reduce((best, p) =>
      bestTypeEffectiveness(p, opponent) > bestTypeEffectiveness(best, opponent) ? p : best
    );
  }

  // ---------------------------------------------------------------------------
  // State update — call this when the opponent uses a move
  // ---------------------------------------------------------------------------

  /**
   * @param {string} moveType  e.g. 'electric'
   */
  recordOpponentMove(moveType) {
    this._opponentLastMove = moveType;
  }

  // ---------------------------------------------------------------------------
  // Flee logic — ROAMING / SAFARI / FIRST_BATTLE (separate from move scoring)
  // ---------------------------------------------------------------------------

  /**
   * Returns true if the AI should attempt to flee this turn.
   * Only meaningful when at least one flee flag is set.
   *
   * ROAMING:      roaming legendary — flees at any HP level (random 50% each turn)
   * SAFARI:       safari zone pokemon — flees based on bait/rock state (simplified: 30% per turn)
   * FIRST_BATTLE: tutorial battle — flee once opponent drops below 20% HP
   *
   * @param {import('./types.ts').Pokemon} active    the wild/roaming pokemon
   * @param {import('./types.ts').Pokemon} opponent  the player's active pokemon
   * @param {import('./types.ts').BattleState} state
   * @returns {boolean}
   */
  shouldFlee(active, opponent, state) {
    if (this._has(AIFlags.ROAMING)) {
      return roll(0.5);
    }

    if (this._has(AIFlags.SAFARI)) {
      return roll(0.3);
    }

    if (this._has(AIFlags.FIRST_BATTLE)) {
      const oppHpPercent = opponent.currentHp / opponent.maxHp;
      return oppHpPercent < 0.2;
    }

    return false;
  }
}