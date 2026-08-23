# Audio Asset Catalog

## Overview

KanjiGO currently contains **47 audio assets** under `assets/sounds/`, including 30 preserved assets and 17 newly generated MP3s. There are no clearly named BGM/music files.

Classification in this catalog is based on filename, directory path, extension, and filesystem size. No file was played or decoded for waveform/content analysis. Duration, channel count, and sample rate were not available from the repository or available local tools and are recorded as `N/A`.

Coverage is strongest for battle effects, especially attack, defeat, encounter, stun, and special-effect sounds. World/location sounds and progression sounds are partially covered. UI coverage is small. BGM, capture-specific feedback, broad Kanji reading/learning feedback, and several gameplay transitions are incomplete or absent.

Obvious variation groups:

- `KanjiGo_Attack_01` through `04`
- `KanjiGo_Defeated_01` through `05`
- `KanjiGo_Wild_Kanji_Encounter_1` and `_2`

All existing assets are marked `NEEDS_REVIEW`: they appear usable as files, but their actual content, loop behavior, quality, and provenance have not been verified.

## Metadata Limitations

- **Metadata obtained:** filename, relative path, MP3 extension, and byte size.
- **Inferred:** category, likely purpose, variation grouping, and filename ambiguity.
- **Not obtained:** duration, channels, sample rate, codec details, loudness, loop points, waveform characteristics, and actual sound content.
- **Source/license:** no source, license, attribution, or download record was found in the repository. See [AUDIO_LICENSES.md](AUDIO_LICENSES.md).

## Existing Assets

### BGM / Music

No assets are clearly identified as BGM or music.

### UI SFX

| ID | File | Category | Purpose | Duration | Status | Notes |
|---|---|---|---|---|---|---|
| `UI_BUTTON_CLICK_01` | [assets/sounds/click.mp3](../../assets/sounds/click.mp3) | UI SFX | Generic button/menu click | N/A | NEEDS_REVIEW | Filename is ambiguous; no apparent variation. |
| `UI_POOL_CLICK_01` | [assets/sounds/click_on_pool.mp3](../../assets/sounds/click_on_pool.mp3) | UI SFX | Pool/water interaction click | N/A | NEEDS_REVIEW | Purpose inferred from filename; no apparent variation. |
| `UI_COUNTDOWN_01` | [assets/sounds/countdown.mp3](../../assets/sounds/countdown.mp3) | UI SFX | Countdown or timed quiz feedback | N/A | NEEDS_REVIEW | Could also be battle/system feedback. |

### Battle SFX

| ID | File | Category | Purpose | Duration | Status | Notes |
|---|---|---|---|---|---|---|
| `BATTLE_ATTACK_01` | [assets/sounds/Attack/KanjiGo_Attack_01.mp3](../../assets/sounds/Attack/KanjiGo_Attack_01.mp3) | Battle SFX | Player/creature attack | N/A | NEEDS_REVIEW | Attack variation 1 of 4. |
| `BATTLE_ATTACK_02` | [assets/sounds/Attack/KanjiGo_Attack_02.mp3](../../assets/sounds/Attack/KanjiGo_Attack_02.mp3) | Battle SFX | Alternate attack | N/A | NEEDS_REVIEW | Attack variation 2 of 4. |
| `BATTLE_ATTACK_03` | [assets/sounds/Attack/KanjiGo_Attack_03.mp3](../../assets/sounds/Attack/KanjiGo_Attack_03.mp3) | Battle SFX | Alternate attack | N/A | NEEDS_REVIEW | Attack variation 3 of 4. |
| `BATTLE_ATTACK_04` | [assets/sounds/Attack/KanjiGo_Attack_04.mp3](../../assets/sounds/Attack/KanjiGo_Attack_04.mp3) | Battle SFX | Alternate attack | N/A | NEEDS_REVIEW | Attack variation 4 of 4. |
| `BATTLE_DEFEATED_01` | [assets/sounds/Defeated/KanjiGo_Defeated_01.mp3](../../assets/sounds/Defeated/KanjiGo_Defeated_01.mp3) | Battle SFX | Creature defeat | N/A | NEEDS_REVIEW | Defeat variation 1 of 5. |
| `BATTLE_DEFEATED_02` | [assets/sounds/Defeated/KanjiGo_Defeated_02.mp3](../../assets/sounds/Defeated/KanjiGo_Defeated_02.mp3) | Battle SFX | Alternate defeat | N/A | NEEDS_REVIEW | Defeat variation 2 of 5. |
| `BATTLE_DEFEATED_03` | [assets/sounds/Defeated/KanjiGo_Defeated_03.mp3](../../assets/sounds/Defeated/KanjiGo_Defeated_03.mp3) | Battle SFX | Alternate defeat | N/A | NEEDS_REVIEW | Defeat variation 3 of 5. |
| `BATTLE_DEFEATED_04` | [assets/sounds/Defeated/KanjiGo_Defeated_04.mp3](../../assets/sounds/Defeated/KanjiGo_Defeated_04.mp3) | Battle SFX | Alternate defeat | N/A | NEEDS_REVIEW | Defeat variation 4 of 5. |
| `BATTLE_DEFEATED_05` | [assets/sounds/Defeated/KanjiGo_Defeated_05.mp3](../../assets/sounds/Defeated/KanjiGo_Defeated_05.mp3) | Battle SFX | Alternate defeat | N/A | NEEDS_REVIEW | Defeat variation 5 of 5. |
| `BATTLE_CUT_01` | [assets/sounds/cut.mp3](../../assets/sounds/cut.mp3) | Battle SFX | Slash/cutting attack | N/A | NEEDS_REVIEW | Generic filename; no apparent variation. |
| `BATTLE_GAME_OVER_01` | [assets/sounds/game_over.mp3](../../assets/sounds/game_over.mp3) | Battle SFX | Defeat/game-over result | N/A | NEEDS_REVIEW | Could be a system notification. |
| `BATTLE_LIGHTNING_STRIKE_01` | [assets/sounds/lightning-strike.mp3](../../assets/sounds/lightning-strike.mp3) | Battle SFX | Lightning special attack | N/A | NEEDS_REVIEW | Clear effect name; no apparent variation. |
| `BATTLE_STUN_01` | [assets/sounds/stun.mp3](../../assets/sounds/stun.mp3) | Battle SFX | Stun/temporary incapacitation | N/A | NEEDS_REVIEW | Clear effect name; no apparent variation. |
| `BATTLE_ENCOUNTER_01` | [assets/sounds/KanjiGo_Wild_Kanji_Encounter_1.mp3](../../assets/sounds/KanjiGo_Wild_Kanji_Encounter_1.mp3) | Battle SFX | Wild Kanji encounter start | N/A | NEEDS_REVIEW | Encounter variation 1 of 2. |
| `BATTLE_ENCOUNTER_02` | [assets/sounds/KanjiGo_Wild_Kanji_Encounter_2.mp3](../../assets/sounds/KanjiGo_Wild_Kanji_Encounter_2.mp3) | Battle SFX | Alternate wild encounter start | N/A | NEEDS_REVIEW | Encounter variation 2 of 2. |

### World / Environment SFX

| ID | File | Category | Purpose | Duration | Status | Notes |
|---|---|---|---|---|---|---|
| `WORLD_GRASS_RUSTLE_01` | [assets/sounds/KanjiGo_Grass_Rustling.mp3](../../assets/sounds/KanjiGo_Grass_Rustling.mp3) | World / Environment SFX | Tall-grass movement or encounter cue | N/A | NEEDS_REVIEW | Directly matches the tall-grass mechanic. |
| `WORLD_POND_01` | [assets/sounds/KanjiGo_Kanji_Pond.mp3](../../assets/sounds/KanjiGo_Kanji_Pond.mp3) | World / Environment SFX | Pond/water-area ambience or interaction | N/A | NEEDS_REVIEW | Exact behavior is unknown. |
| `WORLD_KNOWLEDGE_HALL_01` | [assets/sounds/KanjiGo_Knowledge_Hall.mp3](../../assets/sounds/KanjiGo_Knowledge_Hall.mp3) | World / Environment SFX | Academy/Knowledge Hall scene | N/A | NEEDS_REVIEW | Scene asset; loop behavior unknown. |
| `WORLD_OPEN_ARENA_01` | [assets/sounds/KanjiGo_Open_Arena.mp3](../../assets/sounds/KanjiGo_Open_Arena.mp3) | World / Environment SFX | Arena opening/entrance | N/A | NEEDS_REVIEW | Could be UI or scene-transition SFX. |
| `WORLD_TRANSIT_01` | [assets/sounds/transit.mp3](../../assets/sounds/transit.mp3) | World / Environment SFX | Movement, boarding, or scene transition | N/A | NEEDS_REVIEW | Ambiguous filename. |
| `WORLD_WATER_WADE_01` | [assets/sounds/water_wade.mp3](../../assets/sounds/water_wade.mp3) | World / Environment SFX | Water movement/wading | N/A | NEEDS_REVIEW | Exact boat/wading applicability is unknown. |

### Kanji / Creature SFX

| ID | File | Category | Purpose | Duration | Status | Notes |
|---|---|---|---|---|---|---|
| `CREATURE_FEED_KANJI_01` | [assets/sounds/KanjiGo_Feed_Kanji.mp3](../../assets/sounds/KanjiGo_Feed_Kanji.mp3) | Kanji / Creature SFX | Feeding or Kanji-creature interaction | N/A | NEEDS_REVIEW | Clear filename; no current feeding gameplay boundary is implemented. |
| `CREATURE_EAT_01` | [assets/sounds/eat.mp3](../../assets/sounds/eat.mp3) | Kanji / Creature SFX | Creature eating/feeding confirmation | N/A | NEEDS_REVIEW | Generic filename; no apparent variation. |
| `CREATURE_JUMP_01` | [assets/sounds/jump.mp3](../../assets/sounds/jump.mp3) | Kanji / Creature SFX | Creature/player jump or movement action | N/A | NEEDS_REVIEW | Current architecture has no jump mechanic. |

### Progression / Reward SFX

| ID | File | Category | Purpose | Duration | Status | Notes |
|---|---|---|---|---|---|---|
| `PROGRESSION_ACHIEVEMENT_01` | [assets/sounds/achievement.mp3](../../assets/sounds/achievement.mp3) | Progression / Reward SFX | Achievement or major milestone | N/A | NEEDS_REVIEW | Generic filename; exact trigger unknown. |
| `PROGRESSION_BONUS_01` | [assets/sounds/bonus.mp3](../../assets/sounds/bonus.mp3) | Progression / Reward SFX | Bonus, combo, or reward | N/A | NEEDS_REVIEW | Generic filename; exact trigger unknown. |
| `PROGRESSION_LEVELUP_01` | [assets/sounds/levelup.mp3](../../assets/sounds/levelup.mp3) | Progression / Reward SFX | Kanji mastery level increase | N/A | NEEDS_REVIEW | Clear likely use; no current audio integration. |

### System / Notification SFX

No files are clearly dedicated to system notifications. `countdown.mp3` and `game_over.mp3` could serve system-like roles but are cataloged under their stronger inferred categories.

### Other / Unknown

No files remain unclassified. Several generic files remain semantically ambiguous even though they have been assigned to the closest likely category.

## File Size Inventory

| ID | Size |
|---|---:|
| `UI_BUTTON_CLICK_01` | 11,520 B |
| `UI_POOL_CLICK_01` | 54,334 B |
| `UI_COUNTDOWN_01` | 129,567 B |
| `BATTLE_ATTACK_01` | 50,991 B |
| `BATTLE_ATTACK_02` | 45,312 B |
| `BATTLE_ATTACK_03` | 98,638 B |
| `BATTLE_ATTACK_04` | 16,320 B |
| `BATTLE_DEFEATED_01` | 16,970 B |
| `BATTLE_DEFEATED_02` | 21,359 B |
| `BATTLE_DEFEATED_03` | 19,200 B |
| `BATTLE_DEFEATED_04` | 18,851 B |
| `BATTLE_DEFEATED_05` | 59,904 B |
| `BATTLE_CUT_01` | 46,811 B |
| `BATTLE_GAME_OVER_01` | 181,394 B |
| `BATTLE_LIGHTNING_STRIKE_01` | 35,108 B |
| `BATTLE_STUN_01` | 9,213 B |
| `BATTLE_ENCOUNTER_01` | 18,224 B |
| `BATTLE_ENCOUNTER_02` | 36,780 B |
| `WORLD_GRASS_RUSTLE_01` | 44,544 B |
| `WORLD_POND_01` | 61,784 B |
| `WORLD_KNOWLEDGE_HALL_01` | 70,604 B |
| `WORLD_OPEN_ARENA_01` | 15,360 B |
| `WORLD_TRANSIT_01` | 36,780 B |
| `WORLD_WATER_WADE_01` | 50,991 B |
| `CREATURE_FEED_KANJI_01` | 50,318 B |
| `CREATURE_EAT_01` | 50,991 B |
| `CREATURE_JUMP_01` | 25,077 B |
| `PROGRESSION_ACHIEVEMENT_01` | 37,616 B |
| `PROGRESSION_BONUS_01` | 47,616 B |
| `PROGRESSION_LEVELUP_01` | 36,780 B |

## Generated Assets

These assets were generated locally for KanjiGO as original short one-shot effects. They are registered in `js/audio-config.js`; actual sound content should still be manually reviewed in-game.

| ID | File | Category | Purpose | Status |
|---|---|---|---|---|
| `CAPTURE_START` | [Capture/KanjiGo_Capture_Start.mp3](../../assets/sounds/Capture/KanjiGo_Capture_Start.mp3) | Capture SFX | Begin capture attempt | GENERATED |
| `CAPTURE_FAILURE` | [Capture/KanjiGo_Capture_Failure.mp3](../../assets/sounds/Capture/KanjiGo_Capture_Failure.mp3) | Capture SFX | Failed capture attempt | GENERATED |
| `WORLD_FISH_CAST` | [Fishing/KanjiGo_Fishing_Cast.mp3](../../assets/sounds/Fishing/KanjiGo_Fishing_Cast.mp3) | Fishing SFX | Cast fishing line | GENERATED |
| `WORLD_FISH_BITE` | [Fishing/KanjiGo_Fishing_Bite.mp3](../../assets/sounds/Fishing/KanjiGo_Fishing_Bite.mp3) | Fishing SFX | Fish bites hook | GENERATED |
| `WORLD_FISH_SUCCESS` | [Fishing/KanjiGo_Fishing_Success.mp3](../../assets/sounds/Fishing/KanjiGo_Fishing_Success.mp3) | Fishing SFX | Successful catch | GENERATED |
| `WORLD_FISH_FAILURE` | [Fishing/KanjiGo_Fishing_Failure.mp3](../../assets/sounds/Fishing/KanjiGo_Fishing_Failure.mp3) | Fishing SFX | Missed catch | GENERATED |
| `KANJI_CORRECT` | [UI/KANJIGO_Kanji_Correct_01.mp3](../../assets/sounds/UI/KANJIGO_Kanji_Correct_01.mp3) | Quiz SFX | Correct answer, variant 1 | GENERATED |
| `KANJI_CORRECT` | [UI/KANJIGO_Kanji_Correct_02.mp3](../../assets/sounds/UI/KANJIGO_Kanji_Correct_02.mp3) | Quiz SFX | Correct answer, variant 2 | GENERATED |
| `KANJI_CORRECT` | [UI/KANJIGO_Kanji_Correct_03.mp3](../../assets/sounds/UI/KANJIGO_Kanji_Correct_03.mp3) | Quiz SFX | Correct answer, variant 3 | GENERATED |
| `KANJI_INCORRECT` | [UI/KANJIGO_Kanji_Incorrect_01.mp3](../../assets/sounds/UI/KANJIGO_Kanji_Incorrect_01.mp3) | Quiz SFX | Incorrect answer, variant 1 | GENERATED |
| `KANJI_INCORRECT` | [UI/KANJIGO_Kanji_Incorrect_02.mp3](../../assets/sounds/UI/KANJIGO_Kanji_Incorrect_02.mp3) | Quiz SFX | Incorrect answer, variant 2 | GENERATED |
| `KANJI_INCORRECT` | [UI/KANJIGO_Kanji_Incorrect_03.mp3](../../assets/sounds/UI/KANJIGO_Kanji_Incorrect_03.mp3) | Quiz SFX | Incorrect answer, variant 3 | GENERATED |
| `BATTLE_PLAYER_DAMAGE` | [Battle/KANJIGO_Player_Damage_01.mp3](../../assets/sounds/Battle/KANJIGO_Player_Damage_01.mp3) | Battle SFX | Player damage, variant 1 | GENERATED |
| `BATTLE_PLAYER_DAMAGE` | [Battle/KANJIGO_Player_Damage_02.mp3](../../assets/sounds/Battle/KANJIGO_Player_Damage_02.mp3) | Battle SFX | Player damage, variant 2 | GENERATED |
| `BATTLE_PLAYER_DAMAGE` | [Battle/KANJIGO_Player_Damage_03.mp3](../../assets/sounds/Battle/KANJIGO_Player_Damage_03.mp3) | Battle SFX | Player damage, variant 3 | GENERATED |
| `BATTLE_ESCAPE_SUCCESS` | [Battle/KanjiGo_Escape_Success.mp3](../../assets/sounds/Battle/KanjiGo_Escape_Success.mp3) | Battle SFX | Successful escape | GENERATED |
| `BATTLE_ESCAPE_FAIL` | [Battle/KanjiGo_Escape_Failure.mp3](../../assets/sounds/Battle/KanjiGo_Escape_Failure.mp3) | Battle SFX | Failed escape | GENERATED |

## Remaining Missing / Required Assets

No additional gameplay assets were generated in this task. The remaining entries below are future requirements.

| Audio ID | Category | Intended use | Suggested filename | Why existing assets are insufficient | Status |
|---|---|---|---|---|---|

The following requirements are derived from the current boundaries in `js/game.js`, `js/config.js`, `js/map.js`, and `index.html`. No audio was generated for these remaining requirements.

| Audio ID | Event | Category | Priority | Existing Asset | Status |
|---|---|---|---|---|---|
| `BGM_OVERWORLD` | Normal overworld play | BGM / Music | P0 | No | MISSING |
| `BGM_BATTLE` | Active battle | BGM / Music | P0 | No | MISSING |
| `BGM_LECTURE` | Knowledge Hall lesson | BGM / Music | P1 | No | MISSING |
| `BGM_DEX` | Kanji Dex screen | BGM / Music | P2 | No | MISSING |
| `BGM_CAPTURE` | Capture ritual | BGM / Music | P1 | No | MISSING |
| `BGM_PVE` | PvE exam | BGM / Music | P1 | No | MISSING |
| `UI_CONFIRM` | Menu/lesson/answer confirmation | UI SFX | P1 | No dedicated asset | MISSING |
| `UI_CANCEL` | Escape/back/cancel | UI SFX | P1 | No | MISSING |
| `UI_NAVIGATE` | Selection movement | UI SFX | P2 | No | MISSING |
| `UI_DIALOG_ADVANCE` | NPC/dialogue advance | UI SFX | P2 | No | MISSING |
| `UI_ERROR` | Invalid or unavailable action | System / Notification SFX | P2 | No | MISSING |
| `WORLD_STEP` | Normal player movement | World / Environment SFX | P2 | No | MISSING |
| `WORLD_RUN` | Shift-running movement | World / Environment SFX | P2 | No | MISSING |
| `WORLD_BOARD_BOAT` | Boarding boat | World / Environment SFX | P1 | Possible `WORLD_TRANSIT_01` | NEEDS_REVIEW |
| `WORLD_DISEMBARK` | Leaving boat | World / Environment SFX | P2 | Possible `WORLD_TRANSIT_01` | NEEDS_REVIEW |
| `WORLD_FISH_CAST` | Begin fishing | Fishing / Pond | P1 | No | MISSING |
| `WORLD_FISH_BITE` | Fish bites | Fishing / Pond | P1 | No | MISSING |
| `WORLD_FISH_REEL` | Reel/catch/miss resolution | Fishing / Pond | P2 | No | MISSING |
| `BATTLE_HIT` | Attack impact | Battle SFX | P0 | No dedicated asset | MISSING |
| `BATTLE_PLAYER_DAMAGE` | Player receives damage | Battle SFX | P0 | No | MISSING |
| `BATTLE_PERFECT` | Timed perfect answer | Battle SFX | P1 | Possible `PROGRESSION_BONUS_01` | NEEDS_REVIEW |
| `BATTLE_ENERGY_FULL` | Special ability becomes available | Battle SFX | P1 | No | MISSING |
| `BATTLE_ESCAPE_SUCCESS` | Successful escape | Battle SFX | P2 | No | MISSING |
| `BATTLE_ESCAPE_FAIL` | Failed escape | Battle SFX | P2 | No | MISSING |
| `KANJI_CORRECT` | Correct answer | Kanji / Creature SFX | P0 | No dedicated asset | MISSING |
| `KANJI_INCORRECT` | Incorrect answer | Kanji / Creature SFX | P0 | No dedicated asset | MISSING |
| `KANJI_READING_REVEAL` | Answer/correction reveal | Kanji / Creature SFX | P2 | No | MISSING |
| `CAPTURE_START` | Start capture ritual | Capture | P1 | No | MISSING |
| `CAPTURE_SUCCESS` | Monster/Kanji captured | Capture | P0 | Possible `PROGRESSION_ACHIEVEMENT_01` | NEEDS_REVIEW |
| `CAPTURE_FAILURE` | Capture attempt fails | Capture | P1 | No | MISSING |
| `FEEDING_START` | Creature feeding interaction | Feeding | P2 | `CREATURE_FEED_KANJI_01` | EXISTING |
| `FEEDING_COMPLETE` | Feeding completes | Feeding | P2 | `CREATURE_EAT_01` | EXISTING |
| `LECTURE_STEP` | Academy lesson advances | Knowledge Hall / Lecture | P2 | Possible `WORLD_KNOWLEDGE_HALL_01` | NEEDS_REVIEW |
| `LECTURE_CHECK_CORRECT` | Academy mini-check correct | Knowledge Hall / Lecture | P1 | No | MISSING |
| `LECTURE_CHECK_INCORRECT` | Academy mini-check incorrect | Knowledge Hall / Lecture | P1 | No | MISSING |
| `ARENA_OPEN` | PvE arena interaction starts | Arena | P1 | `WORLD_OPEN_ARENA_01` | EXISTING |
| `ARENA_RESULT` | PvE exam result | Arena | P2 | Possible `PROGRESSION_ACHIEVEMENT_01` | NEEDS_REVIEW |
| `PROGRESSION_LEVEL_UP` | Kanji mastery level increases | Progression / Reward | P0 | `PROGRESSION_LEVELUP_01` | EXISTING |
| `PROGRESSION_MP_REWARD` | MP awarded after win | Progression / Reward | P2 | Possible `PROGRESSION_BONUS_01` | NEEDS_REVIEW |
| `ACHIEVEMENT_UNLOCK` | Kanji unlock/capture milestone | Achievement | P1 | `PROGRESSION_ACHIEVEMENT_01` | EXISTING |
| `NOTIFICATION_TOAST` | Toast appears | Notifications | P2 | `UI_BUTTON_CLICK_01` is not suitable without review | NEEDS_REVIEW |
| `SCENE_TRANSITION` | State changes between screens | Scene transitions | P1 | `WORLD_TRANSIT_01` | NEEDS_REVIEW |
| `SYSTEM_GAME_OVER` | Game-over/defeat notification | System / Notification SFX | P1 | `BATTLE_GAME_OVER_01` | EXISTING |

**Event-matrix count:** 35 events are `MISSING`; 14 are `EXISTING`; 15 are `NEEDS_REVIEW` (64 rows total). These counts refer to the event matrix above, not unique files.
