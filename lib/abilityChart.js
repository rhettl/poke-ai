/**
 * Ability property registry — data-driven ability tags for AI decision-making.
 *
 * The AI queries this chart rather than hardcoding ability string comparisons.
 * Custom abilities added to Cobblemon can be registered here; no AI code changes needed.
 *
 * Property reference:
 *   absorbsType      {string}              Move type this ability absorbs (negates damage)
 *   onAbsorb         {'heal'|'boost_<stat>'} Effect triggered on absorption
 *   immuneToType     {string}              Single type the pokemon is immune to
 *   immuneToNonSuperEffective {boolean}    Wonder Guard — only SE moves deal damage
 *   curesStatusOnSwitch {boolean}          Status clears on switch-out (Natural Cure)
 *   ignoresBurnAttackDrop {boolean}        Burn does not halve Attack (Guts)
 *   stabMultiplier   {number}              Override STAB bonus (Adaptability → 2.0)
 *   statMultiplier   {{stat,factor}}       Multiply a base stat (Huge Power → attack × 2)
 *   technicianBoost  {boolean}             ×1.5 to moves with base power ≤ 60
 *   halvesAtFullHp   {boolean}             Incoming damage halved at full HP (Multiscale)
 *   reducesSuperEffective {number}         Multiplier applied to SE hits (Filter → 0.75)
 *   survivesOHKO     {boolean}             Cannot be KO'd from full HP in one hit (Sturdy)
 *   lowersOnEntry    {{stat,stages,target}} Stat drop applied on switch-in (Intimidate)
 *   weatherSpeedBoost {string}             Weather condition that doubles Speed
 */

/** @type {Record<string, Record<string, any>>} */
export const abilityChart = {

  // ── Type absorbers ─────────────────────────────────────────────────────────
  voltabsorb:   { absorbsType: 'electric', onAbsorb: 'heal' },
  waterabsorb:  { absorbsType: 'water',    onAbsorb: 'heal' },
  flashfire:    { absorbsType: 'fire',     onAbsorb: 'boost_spAttack' },
  sapsipper:    { absorbsType: 'grass',    onAbsorb: 'boost_attack' },
  motordrive:   { absorbsType: 'electric', onAbsorb: 'boost_speed' },
  lightningrod: { absorbsType: 'electric', onAbsorb: 'boost_spAttack' },
  stormdrain:   { absorbsType: 'water',    onAbsorb: 'boost_spAttack' },
  // Dry Skin heals in rain but also takes extra fire damage — simplified to absorb water
  dryskin:      { absorbsType: 'water',    onAbsorb: 'heal' },

  // ── Type immunities ────────────────────────────────────────────────────────
  levitate:     { immuneToType: 'ground' },
  wonderguard:  { immuneToNonSuperEffective: true },

  // ── Status / switch ────────────────────────────────────────────────────────
  naturalcure:  { curesStatusOnSwitch: true },
  shedskin:     { curesStatusOnSwitch: true },   // different proc chance, same AI implication

  // ── Burn / status interaction ──────────────────────────────────────────────
  guts:         { ignoresBurnAttackDrop: true },
  marvelscale:  { defenseBoostWhenStatused: true },

  // ── Offensive stat multipliers ─────────────────────────────────────────────
  hugpower:     { statMultiplier: { stat: 'attack', factor: 2.0 } },
  purepower:    { statMultiplier: { stat: 'attack', factor: 2.0 } },
  adaptability: { stabMultiplier: 2.0 },
  technician:   { technicianBoost: true },

  // ── Damage reduction ───────────────────────────────────────────────────────
  multiscale:   { halvesAtFullHp: true },
  shadowshield: { halvesAtFullHp: true },
  filter:       { reducesSuperEffective: 0.75 },
  solidrock:    { reducesSuperEffective: 0.75 },
  prismarmor:   { reducesSuperEffective: 0.75 },
  sturdy:       { survivesOHKO: true },

  // ── Entry effects ──────────────────────────────────────────────────────────
  intimidate:   { lowersOnEntry: { stat: 'attack', stages: 1, target: 'foe' } },

  // ── Speed modifiers ────────────────────────────────────────────────────────
  swiftswim:      { weatherSpeedBoost: 'rain' },
  chlorophyll:    { weatherSpeedBoost: 'sunny' },
  sandrush:       { weatherSpeedBoost: 'sand' },
  slushrush:      { weatherSpeedBoost: 'hail' },
  // Gen 9 paradox abilities — simplified to weather boost
  protosynthesis: { weatherSpeedBoost: 'sunny' },
  quarkdrive:     { weatherSpeedBoost: 'electric' },
};

/**
 * Returns the ability property record for a given ability ID.
 * Returns an empty object for unknown or undefined abilities — safe to destructure.
 *
 * @param {string | undefined} abilityId
 * @returns {Record<string, any>}
 */
export function getAbility(abilityId) {
  return abilityChart[abilityId ?? ''] ?? {};
}
