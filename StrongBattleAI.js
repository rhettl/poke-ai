/**
 * StrongBattleAI — JavaScript port of Cobblemon's StrongBattleAI.kt
 *
 * Mirrors the decision tree as faithfully as possible, including the known
 * bugs (dead considerSwitching call, repeated shouldSwitchOut evaluations).
 * Bugs are annotated with NOTE comments.
 */

import {
  estimateMatchup,
  chooseBestSwitch,
  bestDamagingMove,
  canBeSentOut,
  roll,
  randomFrom,
  effectiveStat,
} from './lib/common.js';

// Thresholds — all match StrongBattleAI.kt constants
const SWITCH_OUT_MATCHUP_THRESHOLD  = -2;    // primary switch trigger. (-7 "never switches" per todo)
const HP_SWITCH_OUT_THRESHOLD       = 0.30;  // min HP% to be a switch candidate
const RECOVERY_MOVE_THRESHOLD       = 0.50;
const SELF_KO_MOVE_THRESHOLD        = 0.30;
const STATUS_DAMAGE_CONSIDERATION   = 0.80;
const RANDOM_PROTECT_CHANCE         = 0.30;
const TRICK_ROOM_SPEED_THRESHOLD    = 85;

const SETUP_MOVES    = new Set(['swordsdance','nastyplot','calmind','quiverdance','dragondance','shellsmash','bulkup','coil','growth','workup']);
const RECOVERY_MOVES = new Set(['recover','softboiled','roost','moonlight','synthesis','morningsun','slackoff','milkdrink','healorder','lifedew','wish','junglehealing']);
const PIVOT_MOVES    = new Set(['uturn','voltswitch','flipturn','partingshot','teleport']);
const PROTECT_MOVES  = new Set(['protect','detect','kingsshield','obstruct','silktrap','spikyshield','banefulbunker']);
const HAZARD_MOVES   = new Set(['stealthrock','spikes','toxicspikes','stickyweb']);
const ANTI_HAZARDS   = new Set(['rapidspin','defog','courtchange']);
const ANTI_BOOST     = new Set(['haze','clearsmog','encore','whirlwind','roar']);
const STATUS_MOVES   = new Set(['thunderwave','toxic','willowisp','glare','nuzzle','spore','sleeppowder','hypnosis','darkervoid']);

export class StrongBattleAI {
  /** @param {number} skill  0–5 */
  constructor(skill = 5) {
    this.skill = Math.max(0, Math.min(5, skill));
    /** @type {Map<string, number>} pokemon id → protectCount */
    this._protectCounts = new Map();
    /** @type {Set<string>} pokemon ids that just switched in this turn */
    this._firstTurnIds  = new Set();
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * @param {import('./types.ts').Pokemon} active
   * @param {import('./types.ts').Pokemon[]} bench
   * @param {import('./types.ts').Pokemon} opponent
   * @param {import('./types.ts').BattleState} state
   * @param {boolean} forceSwitch
   * @returns {import('./types.ts').AIDecision}
   */
  chooseMoveOrSwitch(active, bench, opponent, state, forceSwitch = false) {
    const available = bench.filter(canBeSentOut);

    // -- Forced switch -------------------------------------------------------
    if (forceSwitch || active.currentHp <= 0) {
      const best = chooseBestSwitch(available, opponent, state);
      if (!best) return { type: 'pass' };
      this._firstTurnIds.add(best.id);
      return { type: 'switch', pokemon: best };
    }

    // -- No moveset ----------------------------------------------------------
    const usableMoves = active.moves.filter(m => !m.disabled && m.currentPp > 0);
    if (usableMoves.length === 0) return { type: 'pass' };

    // -- Must-use move (recharge) --------------------------------------------
    const forced = usableMoves.find(m => m.mustBeUsed);
    if (forced) return { type: 'move', moveId: forced.id };

    // -- Decay protect count -------------------------------------------------
    const protCount = this._protectCounts.get(active.id) ?? 0;
    if (protCount > 0) {
      this._protectCounts.set(active.id, Math.max(0, protCount - (roll(RANDOM_PROTECT_CHANCE) ? 2 : 1)));
    }

    // -- Skill gate ----------------------------------------------------------
    if (!this._checkSkillLevel()) {
      const move = randomFrom(usableMoves);
      return move ? { type: 'move', moveId: move.id } : { type: 'pass' };
    }

    // -- Switch check --------------------------------------------------------
    // NOTE: Mirrors the dead-code bug in the original.
    // considerSwitching() return value is discarded here — no switch happens.
    if (this._checkSwitchOutSkill() && this.shouldSwitchOut(active, available, opponent, state)) {
      /* BUG (mirrors original): return value of _considerSwitching() is discarded.
         In the real code this sets willBeSwitchedIn but never returns a switch action.
         We replicate the bug for accuracy. The actual switch happens further down. */
      this._considerSwitching(active, available, opponent, state, usableMoves);
    }

    const hpPercent = active.currentHp / active.maxHp;

    // -- Low HP + not switching: go damage -----------------------------------
    if (hpPercent < HP_SWITCH_OUT_THRESHOLD && !this.shouldSwitchOut(active, available, opponent, state)) {
      const best = bestDamagingMove(active, opponent, state);
      if (best) return { type: 'move', moveId: best.id };
    }

    // -- Main move-selection block (skipped entirely when shouldSwitchOut) ---
    if (!this.shouldSwitchOut(active, available, opponent, state)) {
      const move = this._selectMove(active, available, opponent, state, usableMoves, hpPercent);
      if (move) return move;
    }

    // -- Healing wish --------------------------------------------------------
    const healWish = usableMoves.find(m => m.id === 'healingwish');
    if (healWish && hpPercent < SELF_KO_MOVE_THRESHOLD) {
      return { type: 'move', moveId: 'healingwish' };
    }

    // -- Actual switch exit (4th shouldSwitchOut call this turn) -------------
    if (this.shouldSwitchOut(active, available, opponent, state)) {
      const best = chooseBestSwitch(available, opponent, state);
      if (best) {
        this._firstTurnIds.add(best.id);
        return { type: 'switch', pokemon: best };
      }
    }

    // -- Final fallback: random move -----------------------------------------
    const move = randomFrom(usableMoves);
    return move ? { type: 'move', moveId: move.id } : { type: 'pass' };
  }

  /**
   * Core switch decision. Mirrors shouldSwitchOut() from StrongBattleAI.kt.
   *
   * @param {import('./types.ts').Pokemon} active
   * @param {import('./types.ts').Pokemon[]} bench
   * @param {import('./types.ts').Pokemon} opponent
   * @param {import('./types.ts').BattleState} state
   * @returns {boolean}
   */
  shouldSwitchOut(active, bench, opponent, state) {
    if (state.trapped) return false;
    if (active.firstTurn || this._firstTurnIds.has(active.id)) return false;

    const available = bench.filter(canBeSentOut);

    const currentScore = estimateMatchup(active, opponent, state);
    const bestSwitchScore = available.length > 0
      ? Math.max(...available.map(p => estimateMatchup(p, opponent, state)))
      : currentScore;

    const improvementThreshold = Math.abs(currentScore) * 0.5 + 3;

    // Not worth switching — best bench isn't significantly better
    if (bestSwitchScore <= currentScore + improvementThreshold) return false;

    // Best switch option is still bad
    if (bestSwitchScore < 1) return false;

    // Too low HP and slower — can't safely switch (will take a hit first)
    const hpPercent = active.currentHp / active.maxHp;
    const aiSpeed   = effectiveStat(active, 'speed');
    const oppSpeed  = effectiveStat(opponent, 'speed');
    if (hpPercent < HP_SWITCH_OUT_THRESHOLD && oppSpeed > aiSpeed) return false;

    // Nothing viable on bench
    if (available.length === 0 || available.every(p => estimateMatchup(p, opponent, state) <= 0)) {
      return false;
    }

    // Opponent has heavy debuffs — switch to exploit
    const oppBoosts = opponent.boosts;
    if ((oppBoosts.accuracy ?? 0)  <= -3) return true;
    if ((oppBoosts.defense ?? 0)   <= -3) return true;
    if ((oppBoosts.spDefense ?? 0) <= -3) return true;
    if ((oppBoosts.attack ?? 0)    <= -3) return true;
    if ((oppBoosts.spAttack ?? 0)  <= -3) return true;

    // PRIMARY SWITCH TRIGGER: bad matchup score + enough HP to survive the switch
    return estimateMatchup(active, opponent, state) < SWITCH_OUT_MATCHUP_THRESHOLD
        && hpPercent > HP_SWITCH_OUT_THRESHOLD;
  }

  // ---------------------------------------------------------------------------
  // Skill checks
  // ---------------------------------------------------------------------------

  _checkSkillLevel() {
    if (this.skill === 5) return true;
    return Math.random() * 100 < this.skill * 20;
  }

  _checkSwitchOutSkill() {
    const chances = [0, 0, 0, 0.20, 0.60, 1.0];
    return Math.random() <= (chances[this.skill] ?? 0);
  }

  // ---------------------------------------------------------------------------
  // Move selection waterfall (runs only when shouldSwitchOut == false)
  // ---------------------------------------------------------------------------

  /**
   * @returns {import('./types.ts').AIDecision | null}  null = fall through to switch/fallback
   */
  _selectMove(active, bench, opponent, state, usableMoves, hpPercent) {
    const nBench    = bench.filter(canBeSentOut).length;

    // 1. Sleep + Sleep Talk
    if (active.status === 'sleep') {
      const st = usableMoves.find(m => m.id === 'sleeptalk');
      if (st) return { type: 'move', moveId: 'sleeptalk' };
    }

    // 2. Fake Out (first turn only)
    const fakeOut = usableMoves.find(m => m.id === 'fakeout');
    if (fakeOut && (active.firstTurn || this._firstTurnIds.has(active.id))) {
      if (!opponent.types.includes('ghost')) {
        this._firstTurnIds.delete(active.id);
        return { type: 'move', moveId: 'fakeout' };
      }
    }

    // 3. Explosion / Self-destruct
    const boom = usableMoves.find(m => m.id === 'explosion' || m.id === 'selfdestruct');
    if (boom && hpPercent < SELF_KO_MOVE_THRESHOLD) {
      const oppHp = opponent.currentHp / opponent.maxHp;
      if (oppHp > 0.5 && !opponent.types.includes('ghost')) {
        return { type: 'move', moveId: boom.id };
      }
    }

    // 4. Recovery move
    if (hpPercent < RECOVERY_MOVE_THRESHOLD) {
      const rec = usableMoves.find(m => RECOVERY_MOVES.has(m.id));
      if (rec) return { type: 'move', moveId: rec.id };
    }

    // 5-9. Field effects (tailwind, trick room, screens)
    const tailwind = usableMoves.find(m => m.id === 'tailwind');
    if (tailwind && !state.alliedSideHazards?.includes('tailwind') && nBench > 2) {
      return { type: 'move', moveId: 'tailwind' };
    }

    const trickRoom = usableMoves.find(m => m.id === 'trickroom');
    if (trickRoom && state.room !== 'trickroom') {
      const slowBench = bench.filter(p => effectiveStat(p, 'speed') <= TRICK_ROOM_SPEED_THRESHOLD);
      if (slowBench.length >= 2) return { type: 'move', moveId: 'trickroom' };
    }

    const lightScreen = usableMoves.find(m => m.id === 'lightscreen');
    if (lightScreen && nBench > 1 && opponent.baseStats.spAttack > opponent.baseStats.attack) {
      return { type: 'move', moveId: 'lightscreen' };
    }

    const reflect = usableMoves.find(m => m.id === 'reflect');
    if (reflect && nBench > 1 && opponent.baseStats.attack > opponent.baseStats.spAttack) {
      return { type: 'move', moveId: 'reflect' };
    }

    // 10-11. Entry hazards
    const allBench = bench.filter(canBeSentOut);
    for (const move of usableMoves) {
      if (HAZARD_MOVES.has(move.id) && allBench.length >= 3) {
        return { type: 'move', moveId: move.id };
      }
      if (ANTI_HAZARDS.has(move.id) && state.alliedSideHazards?.length > 0 && allBench.length >= 2) {
        return { type: 'move', moveId: move.id };
      }
    }

    // 12. Anti-boost (clear opponent boosts)
    const oppBoosted = Object.values(opponent.boosts).some(b => b > 0);
    if (oppBoosted) {
      const anti = usableMoves.find(m => ANTI_BOOST.has(m.id));
      if (anti) return { type: 'move', moveId: anti.id };
    }

    // 13. Pivot moves (when should switch out — handled in considerSwitching, but
    //     here we're in the NOT-switching block, so pivot only if tactically good)

    // 14. Belly Drum
    const bellyDrum = usableMoves.find(m => m.id === 'bellydrum');
    if (bellyDrum && hpPercent > 0.8 && (active.boosts.attack ?? 0) < 1) {
      return { type: 'move', moveId: 'bellydrum' };
    }

    // 15. Setup moves (only when full HP and winning matchup)
    if (hpPercent === 1.0 && estimateMatchup(active, opponent, state) > 0) {
      const setup = usableMoves.find(m => SETUP_MOVES.has(m.id));
      if (setup) return { type: 'move', moveId: setup.id };
    }

    // 16. Status infliction
    const canStatus = !opponent.status;
    if (canStatus) {
      const statusMove = usableMoves.find(m => STATUS_MOVES.has(m.id));
      if (statusMove) return { type: 'move', moveId: statusMove.id };
    }

    // 17. Protect stall
    const protMove = usableMoves.find(m => PROTECT_MOVES.has(m.id));
    const protCount = this._protectCounts.get(active.id) ?? 0;
    if (protMove && protCount === 0) {
      const shouldProtect =
        opponent.status === null &&                       // stall a statused opponent
        !opponent.moves.some(m => m.id === 'feint');
      if (shouldProtect) {
        this._protectCounts.set(active.id, 3);
        return { type: 'move', moveId: protMove.id };
      }
    }

    // 20. Most damaging move (fallback)
    const best = bestDamagingMove(active, opponent, state);
    if (best) return { type: 'move', moveId: best.id };

    return null;
  }

  // ---------------------------------------------------------------------------
  // considerSwitching — mirrors the dead-code block in the original
  // NOTE: return value intentionally not used by chooseMoveOrSwitch (bug replicated)
  // ---------------------------------------------------------------------------

  _considerSwitching(active, bench, opponent, state, usableMoves) {
    // Pivot moves: U-turn, Volt Switch, etc. — deal damage then switch
    for (const move of usableMoves.filter(m => PIVOT_MOVES.has(m.id))) {
      return { type: 'move', moveId: move.id };
    }

    const best = chooseBestSwitch(bench, opponent, state);
    if (best) {
      this._firstTurnIds.add(best.id);
      return { type: 'switch', pokemon: best };
    }
    return null;
    // NOTE: caller discards this return value — see chooseMoveOrSwitch
  }
}