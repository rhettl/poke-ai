# poke-ai — Battle AI Prototype

## What This Is

A JavaScript prototype comparing two Pokemon battle AI decision trees:

- **StrongBattleAI** — JS port of Cobblemon's `StrongBattleAI.kt` (skill=5). Faithfully replicates all known bugs (dead `considerSwitching` call, repeated `shouldSwitchOut` evaluations, no caching).
- **EmeraldPlusAI** — Enhanced approximation of the Emerald Elite 4 AI from pret/pokeemerald. Uses multi-pass move scoring with bitwise `AIFlags` controlling which scripts run. Adds configurable bias values, probabilistic switch execution, turn-1 switch penalty, and average-effectiveness replacement selection.

This came out of research into why Cobblemon NPCs over-switch. The root cause: `switchOutMatchupThreshold = -2`, which the speed coefficient (-4.0) alone can exceed. Any slower pokemon with any type disadvantage triggers a switch every turn at skill=5.

## Running

```bash
node index.js
```

Requires Node.js 18+ (ESM modules, no bundler needed).

## Project Structure

```
.
├── index.html            # Browser UI: Scenarios, Run Scenario, Settings tabs
├── index.js              # CLI runner — 14 scenarios, side-by-side output
├── types.ts              # TypeScript type definitions (JSDoc reference only, not compiled)
├── StrongBattleAI.js     # Cobblemon StrongBattleAI port (reference — do not edit)
├── EmeraldPlusAI.js      # Enhanced Emerald AI with AIFlags + EmeraldPlusAIConfig
├── lib/
│   ├── common.js         # Shared: estimateDamage, estimateMatchup, averageTypeEffectiveness
│   ├── typeChart.js      # Gen 6+ 18-type effectiveness chart
│   └── abilityChart.js   # Data-driven ability property registry; getAbility(id) → props
└── pokemon/
    ├── helpers.js        # calcHp(), move(), mon() factory helpers
    ├── index.js          # Barrel re-export of all pokemon
    └── *.js              # Individual pokemon files (28 total)
```

## Key Concepts

### StrongBattleAI

Single-pass waterfall: each move category is checked in order; first match wins.

**Switch logic** (called 3-4x per turn, uncached):
1. `trapped` → never switch
2. `firstTurn` → never switch
3. If best bench score isn't significantly better (`bestSwitchScore <= currentScore + |currentScore|*0.5 + 3`) → don't switch
4. If best bench score < 1 → don't switch
5. If HP < 30% AND slower → don't switch
6. If bench is empty or all bench <= 0 → don't switch
7. If opponent has debuffs <= -3 on any stat → switch (exploit)
8. **Primary trigger**: `estimateMatchup < -2 AND hp > 30%` → switch

The threshold of -2 is the bug. Speed alone contributes ±4.0, so any speed disadvantage + any type weakness triggers it.

### EmeraldPlusAI

Multi-pass scoring: every move gets an additive score from each enabled script. Highest score wins.

**AIFlags** (bitmask):

| Bit | Flag | Effect |
|-----|------|--------|
| 0 | `CHECK_BAD_MOVE` | Veto type-immune or redundant moves (-10) |
| 1 | `TRY_TO_FAINT` | +2/+3 for KO opportunities, priority KOs preferred |
| 2 | `CHECK_VIABILITY` | Contextual scoring: healing, status, screens, weather |
| 3 | `SETUP_FIRST_TURN` | +2 for setup moves on turn 1 (80% chance) |
| 4 | `RISKY` | +2 for high-risk moves (50% chance) |
| 5 | `PREFER_POWER_EXTREMES` | +2 for status (power=0) or nuke (120+) moves (60% chance) |
| 6 | `PREFER_BATON_PASS` | +3/+5 for Baton Pass and setup when BP is in moveset |
| 7 | `DOUBLE_BATTLE` | Penalise spread moves hitting allies; reward partner synergy |
| 8 | `HP_AWARE` | Adjust scores based on HP thresholds |
| 9 | `TRY_SUNNY_DAY` | +5 to Sunny Day on turn 1 |
| 29 | `ROAMING` | Flee logic: 50% per turn (use `shouldFlee()`) |
| 30 | `SAFARI` | Flee logic: 30% per turn |
| 31 | `FIRST_BATTLE` | Flee when opponent < 20% HP |

**Presets:**
- `ELITE_FOUR` — bits 0–9 (all scoring scripts)
- `GYM_LEADER` — bits 0, 1, 2, 8
- `YOUNGSTER` — bit 0 only

**`EmeraldPlusAIConfig`** (second constructor arg, all optional):

| Key | Default | Effect |
|-----|---------|--------|
| `moveBias` | `1.0` | Multiplier on all move scores |
| `statusMoveBias` | `0.85` | Additional multiplier for power=0 moves (stacked with moveBias) |
| `switchBias` | `0.5` | Probability that a voluntary switch is actually executed |
| `maxSelectMargin` | `0.25` | Any move scoring ≥ 75% of the best is a selection candidate |

`maxSelectMargin` is user-toggleable in the Settings UI (0.0 / 0.25 / 0.4).

**Switch logic** — discrete situational checks (not a score):
1. Wonder Guard: no super-effective move → always switch (even turn 1)
2. **Turn-1 penalty**: all checks below this line are suppressed on turn 1
3. Ability absorber on bench matches opponent's last move type → switch
4. Natural Cure + sleep → 50% switch
5. Has SE coverage → stay
6. Has +2 total boosts → stay
7. Opponent's last move was NVE against us + bench has SE counter → 33% switch

Even when `shouldSwitchOut()` returns true, the switch is only executed with probability `switchBias` (default 50%). This prevents the AI from robotically switching every time a marginal condition is met.

## Pokemon Files

Each pokemon file exports one or more objects matching the `Pokemon` type in `types.ts`.

Level-65 HP formula used throughout:
```js
Math.floor(((2 * base + 31 + Math.floor(evs / 4)) * 65) / 100) + 75
```

28 pokemon included: Rhett's architect party (Metagross, Magnezone, Scizor×2, Dragonite, Skarmory, Ferrothorn, Forretress, Gardevoir×2, Alakazam, Nidoking, Umbreon, Espeon, Gallade, Slowbro, Starmie, Lapras, Arcanine, Delphox) plus general test pokemon (Pikachu, Raichu, Tyranitar, Machamp, Gengar, Blissey, Blaziken, Swampert, Togekiss, Salamence).

## Design Decisions

- **Random tiebreak among equal-scoring moves is intentional.** Distributes PP usage across the moveset. Do not add a KO-margin bonus to break ties in favour of stronger moves.
- **0-PP moves are excluded from the decision loop but not from matchup estimation.** The AI shouldn't "know" the opponent is out of PP — it belongs to imperfect information.
- **`StrongBattleAI.js` is a reference port only.** Do not modify it. It exists to show what the default Cobblemon AI does, bugs included.
- **`abilityChart.js` is the extension point for new abilities.** Adding support for a modded ability = one entry in the chart, no code changes.

## Intended Next Steps

- Port `EmeraldPlusAI` to Kotlin as a `BattleAI` implementation for Cobblemon
- Inject via Mixin at `BattleBuilder.kt:365` (the `NPCBattleActor` constructor)
- Hook into GraalVM/Showdown at init time to pull structured move effect data (`boosts`, `status`, `weather` fields from `Dex.moves.get(id)`) instead of maintaining manual `move.effect` tags
- Raise `switchOutMatchupThreshold` in `StrongBattleAI` from -2 to ~-6 as a minimal patch if full replacement isn't viable

## Source References

- `pret/pokeemerald src/battle_ai_script_commands.c` — Emerald AI scripts
- `pret/pokeemerald src/battle_ai_switch_items.c` — Emerald switch logic
- `pret/pokeemerald include/constants/battle_ai.h` — AI flag constants
- Cobblemon `common/src/main/kotlin/com/cobblemon/mod/common/battles/ai/StrongBattleAI.kt`
