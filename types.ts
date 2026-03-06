// ---------------------------------------------------------------------------
// Core types for the battle AI prototype
// These mirror the shapes used in StrongBattleAI and the Emerald AI logic.
// ---------------------------------------------------------------------------

export type ElementalType =
  | 'normal' | 'fire' | 'water' | 'grass' | 'electric' | 'ice'
  | 'fighting' | 'poison' | 'ground' | 'flying' | 'psychic' | 'bug'
  | 'rock' | 'ghost' | 'dragon' | 'dark' | 'steel' | 'fairy';

export type MoveCategory = 'physical' | 'special' | 'status';

export type StatusCondition = 'burn' | 'poison' | 'badly_poisoned' | 'paralysis' | 'sleep' | 'freeze' | null;

export type Weather = 'sunny' | 'rain' | 'sand' | 'hail' | 'snow' | null;

export type StatKey = 'attack' | 'defense' | 'spAttack' | 'spDefense' | 'speed' | 'accuracy' | 'evasion';

// ---------------------------------------------------------------------------
// Move
// ---------------------------------------------------------------------------

export interface Move {
  id: string;
  name: string;
  type: ElementalType;
  power: number;       // 0 for status moves
  category: MoveCategory;
  accuracy: number;    // 0-100, 0 = never misses
  pp: number;
  currentPp: number;
  effect?: MoveEffect;
  priority?: number;   // default 0
  target: MoveTarget;
  disabled?: boolean;
  mustBeUsed?: boolean; // e.g. recharge turn
}

export type MoveEffect =
  | 'sleep' | 'burn' | 'poison' | 'badly_poison' | 'paralyze' | 'freeze'
  | 'flinch' | 'confuse'
  | 'boost_atk' | 'boost_def' | 'boost_spa' | 'boost_spd' | 'boost_spe' | 'boost_all'
  | 'drop_atk' | 'drop_def' | 'drop_spa' | 'drop_spd' | 'drop_spe' | 'drop_acc'
  | 'heal' | 'healingwish' | 'explosion'
  | 'setup_swords_dance' | 'setup_nasty_plot' | 'setup_calm_mind'
  | 'screen_reflect' | 'screen_lightscreen' | 'screen_auroraveil'
  | 'weather_sunnyday' | 'weather_raindance' | 'weather_sandstorm' | 'weather_hail'
  | 'hazard_stealth_rock' | 'hazard_spikes' | 'hazard_toxic_spikes'
  | 'pivot' | 'fakeout' | 'trick_room' | 'tailwind'
  | 'ohko' | 'recharge' | 'wonder_guard_counter';

export type MoveTarget = 'opponent' | 'self' | 'all_opponents' | 'all' | 'ally';

// ---------------------------------------------------------------------------
// Pokemon
// ---------------------------------------------------------------------------

export interface BaseStats {
  hp: number;
  attack: number;
  defense: number;
  spAttack: number;
  spDefense: number;
  speed: number;
}

export interface Boosts {
  attack?: number;
  defense?: number;
  spAttack?: number;
  spDefense?: number;
  speed?: number;
  accuracy?: number;
  evasion?: number;
}

export interface Pokemon {
  id: string;
  name: string;
  types: ElementalType[];
  baseStats: BaseStats;
  currentHp: number;
  maxHp: number;
  moves: Move[];
  status: StatusCondition;
  boosts: Boosts;
  ability?: string;
  // battle state flags
  firstTurn: boolean;      // true = just switched in this turn
  lastMoveUsed?: string;
}

// ---------------------------------------------------------------------------
// Battle context passed to AI each turn
// ---------------------------------------------------------------------------

export interface BattleState {
  turn: number;
  weather: Weather;
  terrain: string | null;
  room: string | null;     // 'trickroom', etc.
  alliedSideHazards: string[];
  opponentSideHazards: string[];
  trapped: boolean;        // is the active pokemon unable to switch?
}

// ---------------------------------------------------------------------------
// AI decision output
// ---------------------------------------------------------------------------

export type AIDecision =
  | { type: 'move';   moveId: string }
  | { type: 'switch'; pokemon: Pokemon }
  | { type: 'pass' };

// ---------------------------------------------------------------------------
// Common AI interface — both classes implement this
// ---------------------------------------------------------------------------

export interface BattleAI {
  /**
   * Top-level decision: what should this pokemon do this turn?
   */
  chooseMoveOrSwitch(
    active: Pokemon,
    bench: Pokemon[],
    opponent: Pokemon,
    state: BattleState,
    forceSwitch?: boolean,
  ): AIDecision;

  /**
   * Should we voluntarily switch out? Used internally by chooseMoveOrSwitch
   * but exposed so callers can inspect the reasoning independently.
   */
  shouldSwitchOut(
    active: Pokemon,
    bench: Pokemon[],
    opponent: Pokemon,
    state: BattleState,
  ): boolean;
}