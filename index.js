/**
 * Runner — feeds mock Pokemon scenarios through both AIs and prints decisions.
 *
 * Usage:  node --input-type=module < index.js
 *    or:  node index.js  (if package.json has "type": "module")
 */

import { StrongBattleAI }  from './StrongBattleAI.js';
import { EmeraldE4AI }     from './EmeraldE4AI.js';
import {
  metagross, magnezone,
  scizor, scizorAdmin, scizorArchitect,
  dragonite, skarmory, ferrothorn, forretress,
  gardevoir, gardevoirAdmin, gardevoirArchitect,
  alakazam, nidoking, umbreon, espeon, gallade,
  slowbro, starmie, lapras, arcanine, delphox,
  pikachu, raichu, tyranitar, machamp,
  gengar, blissey, blaziken, swampert, togekiss, salamence,
} from './pokemon/index.js';

// Convenience aliases matching the ALL_CAPS names used in scenarios below
const PIKACHU   = pikachu,  RAICHU    = raichu,   TYRANITAR = tyranitar;
const GARDEVOIR = gardevoir, MACHAMP  = machamp,   STARMIE   = starmie;
const SCIZOR    = scizor,   GENGAR    = gengar,    BLISSEY   = blissey;
const DRAGONITE = dragonite, BLAZIKEN = blaziken,  SWAMPERT  = swampert;
const TOGEKISS  = togekiss, SALAMENCE = salamence;

// ---------------------------------------------------------------------------
// Legacy inline factory — kept so spread overrides in scenarios still work
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Default battle state
// ---------------------------------------------------------------------------

/** @returns {import('./types.ts').BattleState} */
function defaultState(overrides = {}) {
  return {
    turn:                  1,
    weather:               null,
    terrain:               null,
    room:                  null,
    trapped:               false,
    alliedSideHazards:     [],
    opponentSideHazards:   [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Runner utilities
// ---------------------------------------------------------------------------

function printDecision(aiName, scenario, decision) {
  const d = decision.type === 'switch'
    ? `SWITCH → ${decision.pokemon.name}`
    : decision.type === 'move'
    ? `MOVE   → ${decision.moveId}`
    : 'PASS';
  console.log(`  [${aiName.padEnd(12)}] ${d}`);
}

function runScenario(title, active, bench, opponent, stateOverrides = {}, emeraldOpts = {}) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`SCENARIO: ${title}`);
  console.log(`  Active:   ${active.name} (${active.types.join('/')})  HP ${active.currentHp}/${active.maxHp}`);
  console.log(`  Opponent: ${opponent.name} (${opponent.types.join('/')})  HP ${opponent.currentHp}/${opponent.maxHp}`);
  if (bench.length) console.log(`  Bench:    ${bench.map(p => p.name).join(', ')}`);
  console.log('');

  const state = defaultState(stateOverrides);

  const strong  = new StrongBattleAI(5);
  const emerald = new EmeraldE4AI();

  if (emeraldOpts.opponentLastMove) {
    emerald.recordOpponentMove(emeraldOpts.opponentLastMove);
  }

  printDecision('StrongAI(5)', title, strong.chooseMoveOrSwitch(active, bench, opponent, state));
  printDecision('EmeraldE4',   title, emerald.chooseMoveOrSwitch(active, bench, opponent, state));
}

// ---------------------------------------------------------------------------
// Scenarios
// ---------------------------------------------------------------------------

console.log('BATTLE AI DECISION COMPARISON');
console.log('StrongBattleAI(skill=5) vs Emerald Elite 4 AI');
console.log('='.repeat(60));

// 1. AI is slower and at type disadvantage — the over-switch trigger
runScenario(
  '1. Slow pokemon in bad matchup (StrongAI over-switches here)',
  TYRANITAR,         // slow, weak to fighting
  [GARDEVOIR, STARMIE, BLISSEY],
  MACHAMP,           // fighting, faster, super effective
);

// 2. KO opportunity — both should go for it
runScenario(
  '2. Can KO opponent this turn',
  STARMIE,
  [BLISSEY, TOGEKISS],
  { ...TYRANITAR, currentHp: 30 },  // Tyranitar at low HP, Surf would KO
);

// 3. AI is faster and winning — should stay and fight
runScenario(
  '3. Winning matchup — should NOT switch',
  GENGAR,
  [BLISSEY, SWAMPERT],
  MACHAMP,  // ghost immune to fighting, Gengar wins this
);

// 4. Status opportunity — opponent has no status
runScenario(
  '4. Status move opportunity (opponent healthy, no status)',
  BLISSEY,
  [TOGEKISS, SCIZOR],
  { ...SALAMENCE, currentHp: 80 },
);

// 5. Setup move on turn 1 — EmeraldE4 bonuses this, StrongAI may too
runScenario(
  '5. Turn 1 — setup move available',
  SCIZOR,
  [DRAGONITE, SWAMPERT],
  TOGEKISS,
  { turn: 1 },
);

// 6. Low HP, bad matchup — StrongAI should NOT switch (slower + low HP guard)
runScenario(
  '6. Low HP + slower — shouldSwitchOut HP guard should block switch',
  { ...TYRANITAR, currentHp: 20 },   // 20% HP
  [GARDEVOIR, SALAMENCE],
  BLAZIKEN,   // faster fighting type
);

// 7. Opponent used electric last turn, AI has a Water Absorb bench mon
runScenario(
  '7. Ability counter switch (EmeraldE4 unique behaviour)',
  STARMIE,
  [
    { ...SWAMPERT, ability: 'waterabsorb' },
    BLISSEY,
  ],
  RAICHU,
  {},
  { opponentLastMove: 'electric' },
);

// 8. Opponent has Wonder Guard — only Emerald catches this
runScenario(
  '8. Opponent has Wonder Guard, active mon has no SE moves',
  BLISSEY,   // Normal type — can't hit Ghost/Wonder Guard
  [GENGAR, SCIZOR],
  { ...GENGAR, ability: 'wonderguard' },
);

// 9. Forced switch after faint
runScenario(
  '9. Forced switch (active pokemon fainted)',
  { ...PIKACHU, currentHp: 0 },
  [SCIZOR, SWAMPERT, DRAGONITE],
  TYRANITAR,
  { turn: 3 },
);

// 10. AI has stat boosts — both should stay and use them
runScenario(
  '10. AI has +2 Swords Dance — should not throw away boosts',
  { ...SCIZOR, boosts: { attack: 2 } },
  [BLISSEY, TOGEKISS],
  TOGEKISS,
);

// 11. Opponent heavily debuffed — StrongAI unique switch trigger
runScenario(
  '11. Opponent at -3 defense — StrongAI wants to exploit',
  BLAZIKEN,
  [DRAGONITE, MACHAMP],
  { ...BLISSEY, boosts: { defense: -3 } },
);

// 12. KO with priority move — EmeraldE4 extra bonus for priority KO
runScenario(
  '12. Priority KO available (EmeraldE4 gives extra bonus)',
  SCIZOR,
  [BLISSEY, SWAMPERT],
  { ...GENGAR, currentHp: 35 },  // Bullet Punch should KO
);

// 13. Trick Room active — speed scoring reverses for StrongAI
runScenario(
  '13. Trick Room active — speed advantage flips',
  TYRANITAR,  // slow = good under trick room
  [BLISSEY, SWAMPERT],
  STARMIE,    // fast = bad under trick room
  { room: 'trickroom' },
);

// 14. Both AIs at full AI capability, balanced matchup — vary outputs
runScenario(
  '14. Balanced matchup, full bench — routine decision',
  DRAGONITE,
  [SWAMPERT, MACHAMP, BLISSEY],
  SALAMENCE,
  { turn: 4 },
);