# poke-ai — Battle AI Prototype

## What This Is

A JavaScript prototype comparing two Pokemon battle AI decision trees:

- **StrongBattleAI** — JS port of Cobblemon's `StrongBattleAI.kt` (skill=5). Faithfully replicates all known bugs (dead `considerSwitching` call, repeated `shouldSwitchOut` evaluations, no caching).
- **EmeraldE4AI** — Approximation of the Emerald Elite 4 AI from pret/pokeemerald. Uses multi-pass move scoring with bitwise `AIFlags` controlling which scripts run.

This came out of research into why Cobblemon NPCs over-switch. The root cause: `switchOutMatchupThreshold = -2`, which the speed coefficient (-4.0) alone can exceed. Any slower pokemon with any type disadvantage triggers a switch every turn at skill=5.

## Running

```bash
node index.js
```

Requires Node.js 18+ (ESM modules, no bundler needed).

## Project Structure

```
.
├── index.js              # Runner — feeds 14 scenarios through both AIs, prints decisions
├── types.ts              # TypeScript type definitions (JSDoc reference only, not compiled)
├── StrongBattleAI.js     # Cobblemon StrongBattleAI port
├── EmeraldE4AI.js        # Emerald E4 AI with configurable AIFlags
├── lib/
│   ├── common.js         # Shared algorithms: estimateMatchup, estimateDamage, chooseBestSwitch
│   └── typeChart.js      # Gen 6+ 18-type effectiveness chart
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

### EmeraldE4AI

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

**Switch logic** — discrete situational checks (not a score):
1. Wonder Guard: no super-effective move → switch
2. Ability absorber on bench matches opponent's last move type → switch
3. Natural Cure + sleep → 50% switch
4. Has SE coverage → stay
5. Has +2 total boosts → stay
6. Opponent's last move was NVE against us + bench has SE counter → 33% switch

## Pokemon Files

Each pokemon file exports one or more objects matching the `Pokemon` type in `types.ts`.

Level-65 HP formula used throughout:
```js
Math.floor(((2 * base + 31 + Math.floor(evs / 4)) * 65) / 100) + 75
```

28 pokemon included: Rhett's architect party (Metagross, Magnezone, Scizor×2, Dragonite, Skarmory, Ferrothorn, Forretress, Gardevoir×2, Alakazam, Nidoking, Umbreon, Espeon, Gallade, Slowbro, Starmie, Lapras, Arcanine, Delphox) plus general test pokemon (Pikachu, Raichu, Tyranitar, Machamp, Gengar, Blissey, Blaziken, Swampert, Togekiss, Salamence).

## Intended Next Steps

- Port winning AI logic back to Kotlin as a `BattleAI` implementation for Cobblemon
- Inject via Mixin into `BattleBuilder.kt:365` (the `NPCBattleActor` constructor call)
- Raise `switchOutMatchupThreshold` from -2 to something in the -6 to -10 range, or add a switch cooldown
- Add double battle support to the runner (pass `allies` array to `chooseMoveOrSwitch`)

## Source References

- `pret/pokeemerald src/battle_ai_script_commands.c` — Emerald AI scripts
- `pret/pokeemerald src/battle_ai_switch_items.c` — Emerald switch logic
- `pret/pokeemerald include/constants/battle_ai.h` — AI flag constants
- Cobblemon `common/src/main/kotlin/com/cobblemon/mod/common/battles/ai/StrongBattleAI.kt`
