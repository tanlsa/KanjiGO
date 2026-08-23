# Audio Event Specification

This document maps audio opportunities to actual KanjiGO gameplay boundaries. It is a specification only; no events or audio playback are implemented here.

**Status vocabulary:** `EXISTING` means a plausible repository asset exists; `NEEDS_REVIEW` means an asset may fit but content/behavior is unverified; `MISSING` means no dedicated asset is currently available; `UNKNOWN` means the need or mapping cannot be determined yet.

| Event | Audio ID | Category | Trigger | Priority | Asset Status |
|---|---|---|---|---|---|
| Button/menu click | `UI_BUTTON_CLICK_01` | UI | Touch/DOM action or accepted Canvas menu action | P1 | EXISTING |
| Pool interaction click | `UI_POOL_CLICK_01` | UI | Water/pool interaction if confirmed by content review | P2 | NEEDS_REVIEW |
| Countdown | `UI_COUNTDOWN_01` | UI | Timed quiz or battle countdown, if used | P1 | NEEDS_REVIEW |
| Confirm action | `UI_CONFIRM` | UI | Accepted menu, lesson, Dex, or result confirmation | P1 | MISSING |
| Cancel/back | `UI_CANCEL` | UI | `onBack()`, Escape handlers, or back button | P1 | MISSING |
| Selection navigation | `UI_NAVIGATE` | UI | `onDexKey()`, `onLectureKey()`, menu movement | P2 | MISSING |
| Dialog advance | `UI_DIALOG_ADVANCE` | UI | `onSpace()` while `dialog.active` | P2 | MISSING |
| Invalid/unavailable action | `UI_ERROR` | Notifications | `showToast()` for blocked or unavailable actions | P2 | MISSING |
| Normal movement | `WORLD_STEP` | Movement | `tryMove()` and completed player movement in `updateOverworld()` | P2 | MISSING |
| Running movement | `WORLD_RUN` | Movement | `player.running` while moving | P2 | MISSING |
| Board boat | `WORLD_BOARD_BOAT` | World | `board()` | P1 | NEEDS_REVIEW |
| Disembark | `WORLD_DISEMBARK` | World | `disembark()` | P2 | NEEDS_REVIEW |
| Tall-grass movement | `WORLD_GRASS_RUSTLE_01` | Environment | `onStepComplete()` on `K.TALLGRASS` | P1 | EXISTING |
| Water movement | `WORLD_WATER_WADE_01` | Environment | Water travel/boat behavior in `updateOverworld()` | P2 | NEEDS_REVIEW |
| Pond ambience | `WORLD_POND_01` | Fishing / Pond | Overworld near pond or fishing area | P2 | NEEDS_REVIEW |
| Fishing cast | `WORLD_FISH_CAST` | Fishing / Pond | `fish()` creates `fishing.phase = 'cast'` | P1 | MISSING |
| Fishing wait/bite | `WORLD_FISH_BITE` | Fishing / Pond | `updateFishing()` changes cast to wait/reel | P1 | MISSING |
| Fishing result | `WORLD_FISH_REEL` | Fishing / Pond | `updateFishing()` resolves caught/missed result | P2 | MISSING |
| Wild encounter | `BATTLE_ENCOUNTER_01` / `02` | Battle | `startBattle(kind)` after tall grass, surf, or fishing | P0 | EXISTING |
| Battle begins | `BGM_BATTLE` | Battle | `startBattle()` sets `state = 'battle'` | P0 | MISSING |
| Correct answer | `KANJI_CORRECT` | Kanji / Creature | `answer()` with correct index; analogous capture/PvE handlers | P0 | MISSING |
| Incorrect answer | `KANJI_INCORRECT` | Kanji / Creature | `answer()`, `answerCapture()`, or `answerPve()` with incorrect index | P0 | MISSING |
| Perfect answer | `BATTLE_PERFECT` | Battle | Correct `answer()` within `perfectMs` | P1 | NEEDS_REVIEW |
| Player attack | `BATTLE_ATTACK_01`-`04` | Battle | Correct `answer()` applies damage and starts `petAttackT` | P0 | EXISTING |
| Attack impact | `BATTLE_HIT` | Battle | Monster HP is reduced in `answer()` | P0 | MISSING |
| Special attack | `BATTLE_LIGHTNING_STRIKE_01` | Battle | `answer()` reaches full energy and creates skill effect | P1 | EXISTING |
| Energy full | `BATTLE_ENERGY_FULL` | Battle | `battle.energy` reaches `energyMax` | P1 | MISSING |
| Enemy attack | `BATTLE_ATTACK_01`-`04` | Battle | `enemyAttack()` or attack gauge timeout | P0 | NEEDS_REVIEW |
| Player damage | `BATTLE_PLAYER_DAMAGE` | Battle | `enemyAttack()` reduces `player.hp` | P0 | MISSING |
| Stun | `BATTLE_STUN_01` | Battle | Incorrect answer sets `battle.stun` | P1 | EXISTING |
| Question timeout | `BATTLE_TIMEOUT` | Battle | `timeoutQuestion()` | P1 | MISSING |
| Escape succeeds | `BATTLE_ESCAPE_SUCCESS` | Battle | `tryRun()` passes `runChance` | P2 | MISSING |
| Escape fails | `BATTLE_ESCAPE_FAIL` | Battle | `tryRun()` fails `runChance` | P2 | MISSING |
| Creature defeated | `BATTLE_DEFEATED_01`-`05` | Battle | `win()` after pending win resolves | P0 | EXISTING |
| Player defeated | `BATTLE_GAME_OVER_01` | System / Notification | `lose()` after pending loss resolves | P1 | EXISTING |
| Battle ends | `SCENE_TRANSITION` | Scene transitions | `endBattle()` or result completion | P1 | NEEDS_REVIEW |
| Open Knowledge Hall | `WORLD_KNOWLEDGE_HALL_01` | Knowledge Hall / Lecture | `enterLecture()` / `openAcademyLobby()` | P1 | EXISTING |
| Lecture scene BGM | `BGM_LECTURE` | Knowledge Hall / Lecture | `state = 'lecture'` | P1 | MISSING |
| Lesson step advance | `LECTURE_STEP` | Knowledge Hall / Lecture | `academyNextStep()` changes lecture phase | P2 | NEEDS_REVIEW |
| Lecture check correct | `LECTURE_CHECK_CORRECT` | Knowledge Hall / Lecture | `answerLecture()` correct result | P1 | MISSING |
| Lecture check incorrect | `LECTURE_CHECK_INCORRECT` | Knowledge Hall / Lecture | `answerLecture()` incorrect result | P1 | MISSING |
| Start capture ritual | `CAPTURE_START` | Capture | `startCapture()` sets `state = 'capture'` | P1 | MISSING |
| Capture correct answer | `CAPTURE_CORRECT` | Capture | `answerCapture()` correct answer | P1 | MISSING |
| Capture incorrect answer | `CAPTURE_INCORRECT` | Capture | `answerCapture()` incorrect answer | P1 | MISSING |
| Capture success | `CAPTURE_SUCCESS` | Capture | `finishCapture()` sets `captured = true` | P0 | NEEDS_REVIEW |
| Capture failure | `CAPTURE_FAILURE` | Capture | `finishCapture()` fails required score | P1 | MISSING |
| Capture summary | `SCENE_TRANSITION` | Scene transitions | `onCaptureKey()` returns to lecture summary or lesson | P2 | NEEDS_REVIEW |
| Feed creature | `CREATURE_FEED_KANJI_01` | Feeding | Future feeding boundary; no current gameplay function | P2 | EXISTING |
| Eating result | `CREATURE_EAT_01` | Feeding | Future feeding completion; no current gameplay function | P2 | EXISTING |
| Open arena | `WORLD_OPEN_ARENA_01` | Arena | `startPve()` after arena NPC interaction | P1 | EXISTING |
| Arena BGM | `BGM_PVE` | Arena | `state = 'pve'` | P1 | MISSING |
| PvE correct answer | `KANJI_CORRECT` | Arena | `answerPve()` correct result | P1 | MISSING |
| PvE incorrect answer | `KANJI_INCORRECT` | Arena | `answerPve()` incorrect result | P1 | MISSING |
| Arena result | `ARENA_RESULT` | Arena | `finishPve()` creates `pveResult` | P2 | NEEDS_REVIEW |
| Dex opened | `BGM_DEX` | Scene transitions | `openDex()` sets `state = 'dex'` | P2 | MISSING |
| Overworld resumed | `BGM_OVERWORLD` | Scene transitions | State returns to `overworld` | P0 | MISSING |
| Mastery level up | `PROGRESSION_LEVELUP_01` | Progression | `awardWin()` returns `leveledUp` | P0 | EXISTING |
| MP reward | `PROGRESSION_BONUS_01` | Progression / Reward | `awardWin()` returns MP gain | P2 | NEEDS_REVIEW |
| Unlock/capture achievement | `PROGRESSION_ACHIEVEMENT_01` | Achievement | Successful `finishCapture()` / new collection | P1 | EXISTING |
| Stamina restored | `PROGRESSION_BONUS_01` | Progression / Reward | `win()` after grass battle restores stamina | P2 | NEEDS_REVIEW |
| Toast notification | `NOTIFICATION_TOAST` | Notifications | `showToast()` creates timed message | P2 | MISSING |
| Asset loading failure | `SYSTEM_ASSET_ERROR` | System | `Promise.all(toLoad)` detects `loadError` | P1 | MISSING |
| Audio load failure | `SYSTEM_AUDIO_ERROR` | System | Future audio preload failure | P1 | MISSING |
| Mute/settings change | `SYSTEM_AUDIO_SETTINGS` | System | Future Audio Settings control change | P1 | MISSING |

## Boundary Notes

The current game has no event bus. These triggers are direct function boundaries and state transitions in `js/game.js`. A future implementation should avoid firing sounds from every animation frame; transient sounds should attach to the function or state change that starts the animation.
