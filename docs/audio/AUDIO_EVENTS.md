# Audio Event Specification

This document maps audio opportunities to actual KanjiGO gameplay boundaries. Connected events are marked `IMPLEMENTED`; remaining rows describe planned or missing coverage.

**Status vocabulary:** `EXISTING` means a plausible repository asset exists; `NEEDS_REVIEW` means an asset may fit but content/behavior is unverified; `MISSING` means no dedicated asset is currently available; `UNKNOWN` means the need or mapping cannot be determined yet.

| Event | Audio ID | Category | Trigger | Priority | Asset Status |
|---|---|---|---|---|---|
| Button/menu click | `UI_BUTTON_CLICK` | UI | Touch action, accepted Canvas action, or quiz/Academy pointer action | P1 | IMPLEMENTED |
| Pool interaction click | `UI_POOL_CLICK_01` | UI | Water/pool interaction if confirmed by content review | P2 | NEEDS_REVIEW |
| Countdown | `UI_COUNTDOWN_01` | UI | Timed quiz or battle countdown, if used | P1 | NEEDS_REVIEW |
| Confirm action | `UI_CONFIRM` | UI | Accepted menu, lesson, Dex, or result confirmation | P1 | MISSING |
| Cancel/back | `UI_CANCEL` | UI | `onBack()`, Escape handlers, or back button | P1 | MISSING |
| Selection navigation | `UI_NAVIGATE` | UI | `onDexKey()`, `onLectureKey()`, menu movement | P2 | MISSING |
| Dialog advance | `UI_DIALOG_ADVANCE` | UI | `onSpace()` while `dialog.active` | P2 | MISSING |
| Invalid/unavailable action | `UI_ERROR` | Notifications | `showToast()` for blocked or unavailable actions | P2 | MISSING |
| Normal movement | `WORLD_STEP` | Movement | `tryMove()` and completed player movement in `updateOverworld()` | P2 | MISSING |
| Running movement | `WORLD_RUN` | Movement | `player.running` while moving | P2 | MISSING |
| Board boat | `WORLD_TRANSIT` | World SFX | `board()` | P1 | IMPLEMENTED |
| Disembark | `WORLD_TRANSIT` | World SFX | `disembark()` | P2 | IMPLEMENTED |
| Tall-grass movement | `WORLD_GRASS_RUSTLE` | Environment | `onStepComplete()` on `K.TALLGRASS` | P1 | IMPLEMENTED |
| Water movement | `WORLD_WATER_WADE` | Environment SFX | `onStepComplete()` after water movement | P2 | IMPLEMENTED |
| Pond ambience | `WORLD_POND_01` | Fishing / Pond | Overworld near pond or fishing area | P2 | NEEDS_REVIEW |
| Fishing cast | `WORLD_FISH_CAST` | Fishing / Pond | `fish()` creates `fishing.phase = 'cast'` | P1 | IMPLEMENTED_GENERATED |
| Fishing wait/bite | `WORLD_FISH_BITE` | Fishing / Pond | `updateFishing()` changes cast to wait/reel | P1 | IMPLEMENTED_GENERATED |
| Fishing success | `WORLD_FISH_SUCCESS` | Fishing / Pond | `updateFishing()` resolves a caught fish | P2 | IMPLEMENTED_GENERATED |
| Fishing failure | `WORLD_FISH_FAILURE` | Fishing / Pond | `updateFishing()` resolves a missed catch | P2 | IMPLEMENTED_GENERATED |
| Wild encounter | `BATTLE_ENCOUNTER` | Battle | `startBattle(kind)` after tall grass, surf, or fishing | P0 | IMPLEMENTED |
| Battle begins | `BGM_BATTLE` | Battle | `startBattle()` sets `state = 'battle'` | P0 | MISSING |
| Correct answer | `KANJI_CORRECT` | Kanji / Creature | `answer()`, `answerCapture()`, or `answerPve()` with correct index | P0 | IMPLEMENTED_GENERATED |
| Incorrect answer | `KANJI_INCORRECT` | Kanji / Creature | `answer()`, `answerCapture()`, or `answerPve()` with incorrect index | P0 | IMPLEMENTED_GENERATED |
| Perfect answer | `PROGRESSION_BONUS` | Battle | Correct `answer()` within `perfectMs` | P1 | IMPLEMENTED_REUSE |
| Player attack | `BATTLE_ATTACK` | Battle | Correct `answer()` applies damage and starts `petAttackT` | P0 | IMPLEMENTED |
| Attack impact | `BATTLE_CUT` | Battle | Monster HP is reduced in `answer()` | P0 | IMPLEMENTED_REUSE |
| Special attack | `BATTLE_LIGHTNING_STRIKE` | Battle | `answer()` reaches full energy and creates skill effect | P1 | IMPLEMENTED |
| Energy full | `BATTLE_ENERGY_FULL` | Battle | `battle.energy` reaches `energyMax` | P1 | MISSING |
| Enemy attack | `BATTLE_ATTACK` | Battle | `enemyAttack()` or attack gauge timeout | P0 | IMPLEMENTED |
| Player damage | `BATTLE_PLAYER_DAMAGE` | Battle | `enemyAttack()` reduces `player.hp` | P0 | IMPLEMENTED_GENERATED |
| Stun | `BATTLE_STUN` | Battle | Incorrect answer sets `battle.stun` | P1 | IMPLEMENTED |
| Question timeout | `BATTLE_STUN` | Battle | `timeoutQuestion()` | P1 | IMPLEMENTED_REUSE |
| Escape succeeds | `BATTLE_ESCAPE_SUCCESS` | Battle | `tryRun()` passes `runChance` | P2 | IMPLEMENTED_GENERATED |
| Escape fails | `BATTLE_ESCAPE_FAIL` | Battle | `tryRun()` fails `runChance` | P2 | IMPLEMENTED_GENERATED |
| Creature defeated | `BATTLE_DEFEATED` | Battle | `win()` after pending win resolves | P0 | IMPLEMENTED |
| Player defeated | `BATTLE_GAME_OVER` | System / Notification | `lose()` after pending loss resolves | P1 | IMPLEMENTED |
| Battle ends | `SCENE_TRANSITION` | Scene transitions | `endBattle()` or result completion | P1 | NEEDS_REVIEW |
| Open Knowledge Hall | `WORLD_KNOWLEDGE_HALL` | Knowledge Hall / Lecture SFX | `enterLecture()` / `openAcademyLobby()` | P1 | IMPLEMENTED |
| Lecture scene BGM | `BGM_LECTURE` | Knowledge Hall / Lecture | `state = 'lecture'` | P1 | MISSING |
| Lesson step advance | `LECTURE_STEP` | Knowledge Hall / Lecture | `academyNextStep()` changes lecture phase | P2 | NEEDS_REVIEW |
| Lecture check correct | `LECTURE_CHECK_CORRECT` | Knowledge Hall / Lecture | `answerLecture()` correct result | P1 | MISSING |
| Lecture check incorrect | `LECTURE_CHECK_INCORRECT` | Knowledge Hall / Lecture | `answerLecture()` incorrect result | P1 | MISSING |
| Start capture ritual | `CAPTURE_START` | Capture | `startCapture()` sets `state = 'capture'` | P1 | MISSING_ASSET |
| Capture correct answer | `CAPTURE_CORRECT` | Capture | `answerCapture()` correct answer | P1 | MISSING |
| Capture incorrect answer | `CAPTURE_INCORRECT` | Capture | `answerCapture()` incorrect answer | P1 | MISSING |
| Capture success | `PROGRESSION_ACHIEVEMENT` | Capture | `finishCapture()` sets `captured = true` | P0 | IMPLEMENTED_REUSE |
| Capture failure | `CAPTURE_FAILURE` | Capture | `finishCapture()` fails required score | P1 | IMPLEMENTED_GENERATED |
| Capture summary | `SCENE_TRANSITION` | Scene transitions | `onCaptureKey()` returns to lecture summary or lesson | P2 | NEEDS_REVIEW |
| Feed creature | `CREATURE_FEED_KANJI_01` | Feeding | Future feeding boundary; no current gameplay function | P2 | EXISTING |
| Eating result | `CREATURE_EAT_01` | Feeding | Future feeding completion; no current gameplay function | P2 | EXISTING |
| Open arena | `WORLD_OPEN_ARENA` | Arena SFX | `startPve()` after arena NPC interaction | P1 | IMPLEMENTED |
| Arena BGM | `BGM_PVE` | Arena | `state = 'pve'` | P1 | MISSING |
| PvE correct answer | `KANJI_CORRECT` | Arena | `answerPve()` correct result | P1 | MISSING |
| PvE incorrect answer | `KANJI_INCORRECT` | Arena | `answerPve()` incorrect result | P1 | MISSING |
| Arena result | `ARENA_RESULT` | Arena | `finishPve()` creates `pveResult` | P2 | NEEDS_REVIEW |
| Dex opened | `BGM_DEX` | Scene transitions | `openDex()` sets `state = 'dex'` | P2 | MISSING |
| Overworld resumed | `BGM_OVERWORLD` | Scene transitions | State returns to `overworld` | P0 | MISSING |
| Mastery level up | `PROGRESSION_LEVELUP` | Progression | `awardWin()` returns `leveledUp` | P0 | IMPLEMENTED |
| MP reward | `PROGRESSION_BONUS` | Progression / Reward | `win()` after grass battle restores stamina | P2 | IMPLEMENTED |
| Unlock/capture achievement | `PROGRESSION_ACHIEVEMENT` | Achievement | New collection in `win()` | P1 | IMPLEMENTED |
| Stamina restored | `PROGRESSION_BONUS` | Progression / Reward | `win()` after grass battle restores stamina | P2 | IMPLEMENTED |
| Toast notification | `NOTIFICATION_TOAST` | Notifications | `showToast()` creates timed message | P2 | MISSING |
| Asset loading failure | `SYSTEM_ASSET_ERROR` | System | `Promise.all(toLoad)` detects `loadError` | P1 | MISSING |
| Audio load failure | `SYSTEM_AUDIO_ERROR` | System | Future audio preload failure | P1 | MISSING |
| Mute/settings change | `SYSTEM_AUDIO_SETTINGS` | System | Future Audio Settings control change | P1 | MISSING |

## Boundary Notes

The current game has no event bus. These triggers are direct function boundaries and state transitions in `js/game.js`. A future implementation should avoid firing sounds from every animation frame; transient sounds should attach to the function or state change that starts the animation.
