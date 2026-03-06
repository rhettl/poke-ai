# poke-ai

A JavaScript prototype for researching and comparing Pokemon battle AI decision trees, with a live interactive demo in the browser.

Built to answer: *why do Cobblemon NPCs switch out so aggressively?* — and to prototype a better AI to replace the default one.

**Live demo:** [rhettl.github.io/poke-ai](https://rhettl.github.io/poke-ai)

---

## What's in here

Two AIs run side-by-side across a set of test scenarios. You can also build your own scenario in the browser and inspect per-flag score breakdowns in real time.

### StrongBattleAI (reference)

A faithful JavaScript port of Cobblemon's built-in `StrongBattleAI.kt` at skill level 5. It replicates all known quirks — including the over-switching bug.

The root cause: `switchOutMatchupThreshold = -2`. The speed coefficient alone contributes ±4.0 to the matchup score, so any slower pokemon facing any type disadvantage exceeds the threshold and switches every single turn. The AI was calling `shouldSwitchOut` 3–4 times per turn with no caching, compounding the problem.

### EmeraldPlusAI (prototype replacement)

An enhanced approximation of the [pret/pokeemerald](https://github.com/pret/pokeemerald) Elite 4 AI, adapted and extended for Cobblemon. Uses multi-pass move scoring: every move gets an additive score from each enabled script, and the highest scorer wins.

**Key improvements over vanilla Emerald:**
- Configurable bias values per trainer (`moveBias`, `statusMoveBias`, `switchBias`, `maxSelectMargin`)
- Probabilistic switch execution — `shouldSwitchOut` returning true doesn't guarantee a switch, it competes at `switchBias` probability (default 50%)
- Turn-1 switch penalty — no speculative switches on the opener
- Average type effectiveness for replacement selection — avoids picking mons with one coverage move and three irrelevant ones
- Data-driven ability chart (`lib/abilityChart.js`) — immune types, absorb abilities, burn/boost interactions; adding a new ability is one line of data, not a code change

**AIFlags presets:**

| Preset | Flags | Behaviour |
|--------|-------|-----------|
| `ELITE_FOUR` | bits 0–9 | All scripts active |
| `GYM_LEADER` | bits 0, 1, 2, 8 | Competent but not exploity |
| `YOUNGSTER` | bit 0 only | Just avoids immune moves |

---

## Running

```bash
node index.js
```

Or open `index.html` in a browser for the interactive UI (no build step — plain ESM modules).

Requires Node.js 18+.

---

## Project structure

```
.
├── index.html          # Browser UI: Scenarios, Run Scenario, Settings tabs
├── index.js            # CLI runner — 14 test scenarios, side-by-side output
├── EmeraldPlusAI.js    # Prototype AI with configurable AIFlags and bias config
├── StrongBattleAI.js   # Cobblemon StrongBattleAI port (reference only — do not edit)
├── lib/
│   ├── common.js       # Shared: estimateDamage, estimateMatchup, effectiveStat, etc.
│   ├── typeChart.js    # Gen 6+ 18-type effectiveness chart
│   └── abilityChart.js # Data-driven ability property registry
└── pokemon/
    ├── helpers.js      # calcHp(), move(), mon() factory helpers
    ├── index.js        # Barrel re-export
    └── *.js            # 28 individual pokemon files
```

---

## Inspiration and sources

This project draws from three codebases:

### pret/pokeemerald
The Emerald disassembly at [github.com/pret/pokeemerald](https://github.com/pret/pokeemerald) is the primary design reference for `EmeraldPlusAI`. The multi-pass scoring architecture, AIFlags bitmask constants, and all 10 scoring scripts (`CHECK_BAD_MOVE`, `TRY_TO_FAINT`, `CHECK_VIABILITY`, etc.) are adapted from:

- `src/battle_ai_script_commands.c`
- `src/battle_ai_switch_items.c`
- `include/constants/battle_ai.h`

The Emerald AI was chosen because it's well-documented, tiered by trainer strength, and substantially less aggressive about switching than most modern implementations.

### Cobblemon
[Cobblemon](https://cobblemon.com) is the Minecraft mod this AI is ultimately intended to replace the default AI for. `StrongBattleAI.js` is a direct port of `StrongBattleAI.kt` and serves as the baseline to beat. Understanding Cobblemon's internal data structures (how types, abilities, and moves are stored and queried) shaped the data-driven design of `abilityChart.js` — since Cobblemon exposes ability names but not behaviour, the chart bridges that gap without requiring code changes per ability.

- `common/src/main/kotlin/com/cobblemon/mod/common/battles/ai/StrongBattleAI.kt`

### Radical Cobblemon Trainers (RCT API)
[RCT](https://gitlab.com/srcmc/rctmod) by HDainester is a Cobblemon addon that already ships an improved battle AI (`RCTBattleAI.java`). Studying it informed several key design decisions in `EmeraldPlusAI`:

- **Bias config system** — the `moveBias`, `statusMoveBias`, `switchBias`, `maxSelectMargin` structure mirrors `RCTBattleAIConfig`
- **Probabilistic switch execution** — RCT uses a `WeightedCollection` where switch competes against moves rather than being a binary gate; our `switchBias` probability gate captures the same spirit
- **Average type effectiveness** — RCT's `TypeChart.getAverageEffectiveness()` averages across all move types rather than taking the best-case; adopted in `_getBestReplacement`
- `com.gitlab.srcmc.rctapi.api.ai.RCTBattleAI`
- `com.gitlab.srcmc.rctapi.api.ai.utils.TypeChart`
- `com.gitlab.srcmc.rctapi.api.ai.config.RCTBattleAIConfig`

---

## Next steps

- Port `EmeraldPlusAI` to Kotlin as a `BattleAI` implementation
- Inject via Mixin at `BattleBuilder.kt:365` (the `NPCBattleActor` constructor)
- Hook into Cobblemon's GraalVM/Showdown context at init time to pull structured move effect data (`boosts`, `status`, `weather` fields) rather than maintaining manual `move.effect` tags
