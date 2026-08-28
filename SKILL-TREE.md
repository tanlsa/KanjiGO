# KanjiGO Progression & Skill Tree — Implementation Spec V2

> Status: **Phases 1–3 complete; Phase 5 exploration integration in progress**
>
> This document replaces the previous progression/Ascension architecture.
> Last updated: 2026-08-23

## 1. Product goal

KanjiGO must make this relationship obvious to the player:

```text
I learned something
        ↓
My Kanji became stronger
        ↓
I unlocked a useful ability or a new way to play
        ↓
I encountered deeper vocabulary and Japanese context
```

The player should become stronger because they are becoming better at Japanese. Progression must reward both:

- **Breadth:** capturing and learning new Kanji.
- **Depth:** reviewing Kanji across readings, vocabulary, question modes, and time.

The system must not reward repeatedly farming one easy Kanji or one familiar question.

---

## 2. Current architecture to preserve

The implementation must extend the current systems instead of creating parallel replacements.

### Existing Kanji progression

Each Kanji already stores progress in `learning.mastery[char]`:

```js
{
  correct,
  wrong,
  box,
  nextReview,
  mp,
  level,
  recall,
  winStreak,
  lossStreak,
  bestWinStreak,
  captured,
  lectured
}
```

Existing meanings:

- `mp` is the investment/progression value.
- `level` is derived from MP and currently ranges from 1 to 10.
- `recall`, Leitner `box`, accuracy, and review timing represent parts of learning confidence.
- `captured` means the Kanji is unlocked and usable.
- `lectured` means the Academy lesson has been completed.

### Existing gameplay progression

```text
Academy lesson
    ↓
Capture ritual
    ↓
Kanji unlocked in KanjiDex
    ↓
Grass/water review battles
    ↓
MP, Level, Recall and SRS progress
    ↓
50 N5 captured + 20 at Lv.5
    ↓
N5 Gym
    ↓
N5 badge unlocks N4
```

### Existing persistence

- `KANJIGO_LEARNING_V1`: learning, mastery, Academy draft, capture attempts, badges.
- `KANJIGO_GAME_V1`: pet collection, current pet, bicycle, auto-ride, and radar state.

Do not introduce a third save key. Knowledge progression belongs under the existing learning save.

### Existing question/content system

- Kanji metadata and questions live in `js/kanji.js`.
- Curriculum order and JLPT gates live in `js/content-catalog.js`.
- Gameplay configuration and monsters live in `js/config.js`.
- Questions already support reading, meaning, whole-word, and compound-oriented modes.
- Admin import and CSV templates must remain compatible with future schema additions.

---

## 3. Frozen architecture decisions

### 3.1 No new Kanji XP

Do not introduce a separate XP value.

```text
MP → Kanji Level
```

Continue using the current MP and Level system.

### 3.2 Mastery is computed knowledge quality

```text
Level   = how much the player has invested in a Kanji
Mastery = how reliably and broadly the player knows that Kanji
```

Mastery must eventually be computed from learning evidence. It must not be another manually incremented XP bar.

### 3.3 Vocabulary is core progression

Vocabulary, compounds, and context are available to every player. They are not locked behind an optional skill.

Skill Tree nodes may improve vocabulary discovery, filtering, encounter frequency, or relationship visualization, but they must not remove access to essential learning content.

### 3.4 Two skill types

```text
PERMANENT UNLOCK
Radar, Bicycle, new mode, new route
→ Purchased once
→ Never removed by reset

RESETTABLE PERK
Focus, Vitality, Combo Guard, Meaning Lens
→ Can be refunded and selected again
```

### 3.5 Gym is Tier Promotion

The existing N5 Gym is the knowledge challenge that promotes the player from N5 to N4.

- Do not add a second Ascension gate between N5 and N4.
- Do not reset learned Kanji, mastery, vocabulary, map access, or skills during Tier Promotion.
- Ascension is an endgame idea and is explicitly out of scope.

### 3.6 Existing convenience is not revoked

- Basic running remains available.
- Current fishing and boat access remain available.
- Future skills upgrade these systems instead of taking them away from existing players.

---

## 4. Frozen progression model

```text
                 KANJI PROGRESSION
               ┌────────┴────────┐
               │                 │
         MP → Level      Computed Mastery
               │                 │
               ├──── Vocabulary ─┤
               │                 │
               └────── KP ───────┘
                        ↓
                   SKILL TREE
            ┌───────────┴───────────┐
            │                       │
     Permanent Unlock        Resettable Perk
            │                       │
     Radar / Bicycle       Focus / Combo Guard
     Modes / Routes        Meaning Lens / Vitality
            └───────────┬───────────┘
                        ↓
              Better learning gameplay
                        ↓
                 N5 Gym → N4
```

---

## 5. Knowledge Points (KP)

KP is the only new progression currency in the MVP.

### 5.1 Initial milestone economy

All values must be configurable in `js/config.js`.

| One-time milestone | Initial reward |
|---|---:|
| Capture a Kanji | 1 KP |
| Reach Level 3 | 1 KP |
| Reach Level 5 | 1 KP |
| Reach Level 7 | 1 KP |
| Reach Level 10 | 1 KP |

Mastery Challenge rewards are deferred until the computed Mastery and vocabulary coverage systems exist.

### 5.2 KP rules

- Every milestone is claimable once per Kanji.
- A Level jump may claim every crossed milestone exactly once.
- Existing saves receive eligible historical milestones once during migration.
- Migration grants are summarized in one message; do not display one popup per Kanji.
- KP is not granted for walking, idling, repeating the same answer, or automatic travel.
- Starter/configured initial pets receive their eligible one-time milestones; the ledger prevents these grants from repeating.
- Available KP equals total earned KP minus the recorded cost of current purchases.
- Costs paid for permanent unlocks are never refunded.
- Costs paid for perks are refunded by Skill Reset.

### 5.3 Milestone identity

Use stable keys:

```text
capture:日
level3:日
level5:日
level7:日
level10:日
```

Do not identify milestones by array position or localized display text.

---

## 6. Save model and migration

Extend the existing `learning` object:

```js
learning.progression = {
  version: 1,
  earnedKP: 0,
  claimedMilestones: {
    'capture:日': { claimedAt: 0, migrated: true, reward: 1 }
  },
  skillPurchases: {
    radar_1: {
      type: 'permanent',
      cost: 4,
      purchasedAt: 0
    }
  }
}
```

Derived values must not be duplicated in the save:

```js
availableKP = earnedKP - sum(skillPurchases[*].cost)
permanentUnlocks = purchases where type === 'permanent'
activePerks = purchases where type === 'perk'
```

### Migration requirements

1. Missing or malformed `learning.progression` must fall back safely.
2. Scan captured state and current Level for every known Kanji.
3. Claim every historically earned milestone not already in the ledger.
4. Preserve all current MP, Level, Recall, SRS, badges, pets, and Academy state.
5. Save the upgraded structure once.
6. Running migration repeatedly must not change KP after the first run.
7. Unknown skill IDs remain ignored safely and must not crash loading.

---

## 7. Data-driven Skill Tree

Skill definitions belong in configuration, not inside rendering or save code.

Conceptual schema:

```js
{
  id: 'focus_1',
  name: 'Focus I',
  branch: 'combat',
  type: 'perk',
  costKP: 5,
  prerequisites: [],
  requirements: {
    capturedKanji: 10,
    kanjiAtLevel: { level: 5, count: 1 }
  },
  effect: {
    id: 'attackGaugeMultiplier',
    value: 0.95
  },
  description: 'Enemy Attack Gauge charges 5% slower.'
}
```

### Definition rules

- Skill IDs are permanent and language-independent.
- Every prerequisite references an existing skill ID.
- No circular prerequisite graphs.
- Requirements and costs are visible in the UI.
- A skill can be purchased only when every prerequisite and requirement passes.
- Definitions never contain executable functions.
- Effects must reference a registered effect handler.
- Unknown effects fail validation in automated tests.
- Balance values remain configurable.

### Effect registry

Use a small allow-listed registry in the engine:

```js
SKILL_EFFECTS = {
  attackGaugeMultiplier,
  playerHpMultiplier,
  comboGuardCharges,
  meaningHintCharges,
  reviewWeightMultiplier,
  radarMode,
  bicycleAccess,
  compoundEncounterMultiplier
}
```

Do not scatter checks such as `if (hasSkill('focus_1'))` throughout unrelated render functions. Resolve active effects through shared helpers.

---

## 8. MVP Skill Tree

The following values are initial balance targets and may be tuned through config.

| ID | Node | Type | Initial cost | Initial requirements | Intended effect |
|---|---|---|---:|---|---|
| `radar_1` | Radar I | Permanent | 4 | 5 captured | Show weak/due encounter information |
| `radar_2` | Radar II | Permanent | 10 | Radar I; 20 captured; 3 at Lv5 | Select Weak, Due, or specific Kanji priority |
| `bicycle` | Bicycle | Permanent | 18 | 15 captured; 3 at Lv5 | Faster travel and future patrol routes |
| `bicycle_gear` | Bicycle Gear II | Permanent | 9 | Bicycle; 25 captured; 5 at Lv5 | Reduce Bicycle movement time by another 15% |
| `auto_ride` | Auto Ride | Permanent | 14 | Bicycle Gear II; Radar I; 35 captured; 10 at Lv5 | Path safely to tall grass and resume patrol after battle |
| `meaning_lens` | Meaning Lens | Perk | 5 | 8 captured | Limited semantic hint after player request |
| `meaning_lens_2` | Meaning Lens II | Perk | 7 | Meaning Lens; 18 captured | Add a second safe semantic-hint charge per battle |
| `review_focus` | Review Focus | Perk | 8 | 12 captured | Increase weight of weak/due encounters |
| `review_focus_2` | Review Focus II | Perk | 10 | Review Focus; 25 captured; 5 at Lv5 | Increase weak/due weighting within the shared cap |
| `compound_sense` | Compound Sense | Perk | 10 | Vocabulary foundation available | Increase unlocked compound frequency |
| `focus_1` | Focus I | Perk | 5 | 10 captured | Attack Gauge charges 5% slower |
| `focus_2` | Focus II | Perk | 9 | Focus I; 20 captured; 5 at Lv5 | Stack another 5% gauge modifier within the 15% cap |
| `combo_guard` | Combo Guard | Perk | 8 | Focus I; 3 at Lv5 | Preserve part of combo once per battle |
| `combo_guard_2` | Combo Guard II | Perk | 11 | Combo Guard; 30 captured; 8 at Lv5 | Add a second partial-combo protection charge |
| `vitality_1` | Vitality I | Perk | 7 | 10 captured | Increase player max HP by 8% |
| `vitality_2` | Vitality II | Perk | 10 | Vitality I; 22 captured; 5 at Lv5 | Stack another 8% HP modifier within the 25% cap |

The expanded sixteen-node budget is 145 KP, of which 135 KP is currently released. N5 capture-only progress deliberately cannot buy every branch: Level milestones and meaningful perk choices remain part of progression. The temporary QA seed supplies enough real milestone-ledger KP to test all released paths.

### Node availability by implementation phase

- Released now: Radar I/II, Bicycle, Bicycle Gear II, and Auto Ride; Meaning Lens I/II and Review Focus I/II; Focus I/II, Combo Guard I/II, and Vitality I/II.
- Radar II cycles between Balanced, Due, Weak, and current-pet targeting without excluding other valid encounters.
- Compound Sense stays hidden until vocabulary metadata exists.
- Bicycle reuses normal tile collision and encounters, with a canonical transparent four-direction turnaround sheet.

### Skill Reset

- Reset is free in the MVP.
- Only perk purchases are removed and refunded.
- Permanent unlocks and their recorded costs remain.
- Reset requires confirmation and clearly shows refunded KP.
- Reset is blocked during battle, capture, and PvE; changing Vitality never acts as healing.

---

## 9. Pedagogy rules for skill effects

### Meaning Lens

- Existing semantic monster animation remains available to everyone.
- Meaning Lens adds an explicit contextual hint with limited charges or cooldown.
- It cannot reveal the correct option directly.
- If a strong hint is used, Perfect eligibility may be disabled for that question.

### Review Focus

- Builds on the existing Recall, SRS due state, and encounter weighting.
- It must not completely exclude new or healthy Kanji.
- Weight multipliers require a configured maximum.

### Focus I/II

- Modifies Attack Gauge timing only.
- Initial effect: 5% slower gauge.
- Total future Focus bonuses must remain capped around 15%.

### Combo Guard I/II

- One charge per purchased tier per battle, capped by the released definitions.
- A wrong answer still causes damage and records the learning mistake.
- It preserves only part of combo/energy; it never converts an incorrect answer into a correct answer.

### Vitality I/II

- Initial bonus: 5–8% max HP.
- Total future Vitality bonus must stay below approximately 25%.
- HP bonuses cannot make repeated wrong answers consequence-free.

### Radar

- Radar I surfaces information already used internally by SRS weighting.
- Radar II lets the player express learning intent.
- Radar changes encounter priority, not answer correctness or automatic rewards.

### Bicycle

- Increases travel speed.
- Bicycle Gear II reduces movement duration by another 15% without changing collision or encounter rules.
- Does not automatically battle, answer, or award MP/KP.
- Auto Ride is explicit opt-in automation: it paths through normal collision to tall grass, pauses for manual battle, and resumes after win/loss.
- Any run-away attempt immediately disables and persists Auto Ride off, whether escape succeeds or fails.
- Auto Ride never selects answers and stops when no valid grass encounter is available.

---

## 10. Vocabulary progression

Vocabulary is a core system, not a Skill Tree gate.

Target flow:

```text
Kanji Level 1 → basic words
Kanji Level 3 → common words
Kanji Level 5 → compounds
Kanji Level 7 → broader vocabulary family
Kanji Level 10 + Mastery → contextual challenge
```

This flow is aspirational until enough content exists. Do not hide existing questions during migration.

### Required question metadata

```js
{
  id: 'n5-hi-mainichi-001',
  word: '毎日',
  target: '日',
  answer: 'にち',
  category: 'common',
  unlockLevel: 1,
  difficulty: 1,
  // existing reading, meaning, furigana and parts fields remain
}
```

### Stable ID rules

- IDs are unique across the complete question catalog.
- IDs never depend on array order.
- Editing display text does not change an existing ID.
- Admin import validates duplicate and missing IDs after the schema migration.
- CSV templates and the synchronization script must support the new fields.

### Safe content migration

- Existing questions default to `unlockLevel: 1` so no content disappears.
- Existing questions receive stable generated-and-reviewed IDs.
- Category defaults to `basic` or `common` until manually curated.
- Level gating is enabled per Kanji only after that Kanji has enough vocabulary at multiple levels.
- Every captured Kanji must always retain at least one valid question.

### Coverage tracking

Future mastery evidence should track:

```js
mastery[char].questionCoverage[questionId]
mastery[char].modeCoverage[modeId]
mastery[char].vocabularyCoverage[questionId]
```

Each entry may contain attempts, correct answers, last result, and last seen time. Avoid storing complete answer history indefinitely.

---

## 11. Computed Mastery

Computed Mastery is implemented only after stable question IDs and coverage tracking exist.

Initial conceptual weights:

| Component | Weight |
|---|---:|
| Retention: Recall, SRS box, due performance | 30% |
| Accuracy with Bayesian smoothing | 30% |
| Vocabulary/question coverage | 25% |
| Question-mode variety | 15% |

Requirements:

- Result is clamped to 0–100.
- Accuracy cannot become 100% from one correct answer.
- Repeating one question has sharply diminishing coverage value.
- A Kanji can have high Level but moderate Mastery.
- Mastery may decline when review is overdue; Level must not decline.
- Exact formula requires tests with representative learner profiles before release.

Mastery Stars and Mastery-based KP are out of scope until this formula is validated.

---

## 12. UI and UX requirements

Add a new canvas state only when Phase 2 begins:

```text
state = 'skills'
```

The Skill Tree UI uses a connected node graph rather than a card list:

- A central KP Core connects to Exploration, Learning, and Combat branch hubs.
- Circular nodes use semantic icons and branch colors.
- Connections glow when a node is available or unlocked; locked and preview paths remain muted.
- A fixed detail panel shows the selected node without covering the graph.
- Desktop uses spatial keyboard navigation plus mouse-wheel panning.
- Touch devices drag to pan and tap nodes; the graph is intentionally wider than a phone viewport.

Every node displays:

- Name and branch.
- Permanent or Perk type.
- Cost.
- Current state: `LOCKED`, `AVAILABLE`, or `UNLOCKED`.
- Exact unmet prerequisites.
- Exact gameplay effect.
- Confirmation before purchase.

KP feedback must explain why it was earned:

```text
Knowledge Point +1
「食」 reached Level 5.
New skill available: Review Focus
```

Migration should use one summary:

```text
Existing learning progress converted: +24 KP
3 new skills are now available.
```

Do not display dozens of sequential milestone dialogs.

---

## 13. Execution plan and tracker

Only one phase should be in active implementation at a time. Every phase must leave the game playable and all automated tests green.

### Phase 0 — Spec freeze and validation

Status: **COMPLETE — APPROVED 2026-08-23**
Complexity: Small

- [x] Remove the duplicate Kanji XP concept.
- [x] Define MP/Level, computed Mastery, and KP separately.
- [x] Define Permanent Unlock versus resettable Perk.
- [x] Make vocabulary core progression.
- [x] Keep Gym as Tier Promotion.
- [x] Move Ascension out of scope.
- [x] Approve initial KP milestone values.
- [x] Approve MVP node costs and requirements.
- [x] Open the Skill Tree from the overworld with `K` or the mobile `SKILL` action.
- [x] Use a temporary canvas treatment for Bicycle before commissioning a final asset.

Exit criteria:

- Product decisions above are approved.
- No unresolved decision changes the Phase 1 save model.

### Phase 1 — KP Foundation

Status: **COMPLETE — IMPLEMENTED 2026-08-23**
Complexity: Medium

Deliverables:

- [x] Add configurable KP milestone rewards.
- [x] Add `learning.progression` schema.
- [x] Implement idempotent migration for existing saves.
- [x] Implement milestone evaluation after capture and Level changes.
- [x] Implement available-KP calculation.
- [x] Add a compact KP notification and migration summary.
- [x] Expose progression state through the QA debug API.
- [x] Add automated tests for fresh, legacy, malformed, and repeated migrations.

Exit criteria:

- Existing save data remains intact.
- Every eligible milestone grants once.
- Reopening the game does not grant duplicate KP.
- No Skill Tree UI is required yet.

Likely files:

- `js/config.js`
- `js/game.js`
- `tests/game-smoke.test.js`
- `README.md`

### Phase 2 — Skill Tree Foundation

Status: **COMPLETE — IMPLEMENTED 2026-08-23**
Complexity: Medium–High

Deliverables:

- [x] Add data-driven skill definitions.
- [x] Add definition validation and prerequisite-cycle tests.
- [x] Add the allow-listed effect registry.
- [x] Implement purchase validation and persistence.
- [x] Implement free Perk Reset without resetting Permanent Unlocks.
- [x] Add `skills` canvas state with graph panning and touch support.
- [x] Show KP, costs, requirements, node type, and node state.
- [x] Add keyboard/touch entry and exit flow.

Exit criteria:

- Dummy/test nodes can be purchased and restored from save.
- Invalid definitions fail automated tests.
- Reset refunds only perks.
- Existing gameplay behavior is unchanged before real effects are enabled.

Likely files:

- `js/config.js`
- `js/game.js`
- `index.html`
- `tests/project.test.js`
- `tests/game-smoke.test.js`

### Phase 3 — Immediately usable MVP skills

Status: **COMPLETE — FIFTEEN NODES RELEASED**
Complexity: High

Deliverables:

- [x] Radar I.
- [x] Radar II targeting policy.
- [x] Meaning Lens with one charge per battle and answer-reveal protection.
- [x] Review Focus with capped weighting.
- [x] Focus I Attack Gauge modifier.
- [x] Combo Guard once per battle.
- [x] Vitality I max-HP modifier.
- [x] Bicycle Gear II with collision-safe speed stacking.
- [x] Auto Ride with explicit toggle, safe grass pathfinding, and battle pause/resume.
- [x] Meaning Lens II and Review Focus II.
- [x] Focus II, Combo Guard II, and Vitality II with hard balance caps.
- [x] Clear effect feedback in HUD/battle.
- [x] Balance and regression tests for every released effect.

Exit criteria:

- Every shipped node has a visible, testable effect.
- No effect reveals an answer or generates automatic learning rewards.
- Combat remains winnable without buying combat perks.
- Encounter pools never become empty because of Radar filtering.

### Phase 4 — Vocabulary foundation and computed Mastery

Status: **IN PROGRESS — RADAR II AND BICYCLE COMPLETE**
Complexity: High; content migration required

Deliverables:

- [ ] Add stable question IDs.
- [ ] Add category, difficulty, and `unlockLevel` metadata.
- [ ] Update Admin parser, preview, generated JS, and validation.
- [ ] Update CSV templates and synchronization tooling.
- [ ] Add per-question and per-mode coverage tracking.
- [ ] Preserve all existing questions at Level 1 during migration.
- [ ] Implement vocabulary availability helpers.
- [ ] Implement and test the first computed Mastery formula.
- [ ] Enable Compound Sense after its dependency exists.

Exit criteria:

- No captured Kanji loses all valid questions.
- Existing browser imports migrate or fail with a clear actionable message.
- Question IDs are unique and stable.
- Repetition of one question cannot produce full Mastery.

Likely files:

- `js/kanji.js`
- `js/data-loader.js`
- `js/game.js`
- `admin.html`
- `data/kanji-template.csv`
- `data/questions-template.csv`
- `scripts/sync-content-csv.js`
- automated tests

### Phase 5 — Exploration integration

Status: **NOT STARTED**
Complexity: Medium–High

Deliverables:

- [x] Add Radar controls and world feedback.
- [x] Apply Radar II policy to eligible encounter weighting.
- [x] Add Bicycle state and faster movement.
- [x] Ensure bicycle collision, camera, encounter, fishing, and interaction behavior is valid.
- [x] Add and validate the canonical Bicycle turnaround resource.
- [x] Add Auto Ride controls, persistence, pathfinding, and automatic resume after win/loss.
- [ ] Derive pedal-cycle frames from the approved canonical poses without changing identity or proportions.
- [ ] Add vocabulary-aware encounter weighting.
- [ ] Add gameplay and save regression tests.

Exit criteria:

- Bicycle never auto-answers or grants rewards from movement.
- Radar respects JLPT locks and captured/content availability.
- Movement cannot pass through blocked tiles or NPCs.
- Pet follow and performance remain stable at bicycle speed.

### Phase 6 — Compound Boss

Status: **NOT STARTED**
Complexity: High

Target learning sequence:

```text
Kanji recognition
    ↓
Individual reading
    ↓
Compound recognition
    ↓
Whole-word reading
    ↓
Meaning/context
```

Deliverables:

- [ ] Define compound encounter/boss data.
- [ ] Implement phased boss question flow.
- [ ] Require actual unlocked vocabulary coverage.
- [ ] Add rewards that favor breadth and variety.
- [ ] Add failure/retry behavior that supports learning.
- [ ] Add at least one complete vertical-slice boss.

Exit criteria:

- The first boss proves the transition from isolated Kanji to whole vocabulary.
- Repeating one phase cannot farm KP.
- Battle remains readable on desktop and mobile.

### Phase 7 — Future features

Status: **BACKLOG — DO NOT IMPLEMENT WITH MVP**

- [ ] Auto Cruise on water.
- [ ] Additional routes and regions.
- [ ] Word Chain.
- [ ] Delivery Quest.
- [ ] Memory Match.
- [ ] Kanji Dungeon.
- [ ] Speed Review.
- [ ] Tier Promotion expansion for N3 and beyond.
- [ ] Re-evaluate Ascension only after a real endgame exists.

---

## 14. Testing requirements

### Automated data tests

- Skill IDs are unique.
- Prerequisites exist and contain no cycles.
- Effect IDs are registered.
- Costs and numeric effect values are valid.
- Question IDs are unique after Phase 4.
- Every curriculum Kanji retains valid content and monster assets.

### Save and migration tests

- Fresh save initializes with zero earned KP before milestones are evaluated.
- Legacy saves receive historical KP once.
- A second migration grants zero additional KP.
- Malformed progression state falls back without losing mastery.
- Permanent purchases survive reset.
- Perk purchases are refunded correctly.
- Unknown removed skills do not crash loading.

### Gameplay tests

- Focus modifies only configured gauge timing.
- Vitality modifies max HP without repeated compounding after reload.
- Combo Guard has the configured charge limit.
- Radar never selects locked or unavailable Kanji.
- Bicycle obeys collision and encounter rules.
- Automatic movement never answers questions or grants passive rewards.

### Manual UX checklist

- Desktop keyboard navigation.
- Touch navigation and scrolling.
- Small-screen node readability.
- Clear reason for locked state.
- Clear KP earn and spend feedback.
- Save/reload after purchase and reset.
- No regressions in Academy, Capture, KanjiDex, battle, fishing, or Gym.

---

## 15. Risks and mitigations

| Risk | Mitigation |
|---|---|
| KP inflation makes choices meaningless | Gate with breadth/depth requirements; tune costs from N5 progression simulations |
| Existing saves receive duplicate KP | Stable milestone ledger and idempotent migration tests |
| Skill checks spread throughout the engine | Central effect registry and derived-effect helpers |
| Vocabulary levels hide current content | Default legacy questions to Level 1; enable gating gradually |
| Helpful pedagogy becomes paywalled | Keep vocabulary and corrective furigana as baseline features |
| Automation becomes AFK farming | Stop for every quiz; no passive MP/KP or automatic answers |
| Combat perks replace learning ability | Keep bonuses small and capped |
| Canvas Skill Tree becomes slow | Clip rendering to the graph viewport and keep node/connection definitions data-driven |
| Bicycle breaks pet follow/collision | Reuse tile movement and distance-based pet trail; add speed regression tests |
| Ascension duplicates Gym | Keep Ascension out of scope until endgame exists |

---

## 16. Explicitly out of scope

Do not implement these during Phases 1–6 unless this document is deliberately revised:

- A second Kanji XP system.
- Player Level.
- Ascension Points or Ascension Tree.
- Prestige resets.
- Resetting learned Kanji, vocabulary, Recall, MP, or Level.
- Locking basic running, fishing, or current boat access.
- Automatic quiz answers or passive learning rewards.
- N3/N2/N1 content.
- A framework rewrite or a second save system.
- Hundreds of hard-coded skill conditions.

---

## 17. Approval gates

Before Phase 1:

- [x] KP milestone rewards approved.
- [x] Save model approved.

Before Phase 2:

- [x] Skill Tree access point approved.
- [x] MVP node costs and requirements approved.
- [x] Permanent/Perk reset UX approved.

Before Phase 4:

- [ ] Stable question-ID convention approved.
- [ ] Vocabulary category convention approved.
- [ ] Computed Mastery formula reviewed with sample learner profiles.

Before Phase 5:

- [x] Dedicated Bicycle sprite direction approved and integrated.
- [ ] Radar targeting UX approved.

Before Phase 6:

- [ ] First Compound Boss word and learning flow approved.

---

## 18. Definition of success

The feature is successful when players can answer all three questions clearly:

1. **Why did I earn this KP?**
2. **What learning or gameplay capability did this skill add?**
3. **What should I learn next to reach the next meaningful unlock?**

The player should feel:

> I want to learn and master this Kanji because it opens a meaningful new possibility.

They should not feel:

> I am repeating an easy question because the game requires more XP.
