# Audio Asset Catalog

This inventory is derived from the current filesystem only (38 MP3 files). `Present` below means the mapped path exists; it is not an approval of sonic suitability. Empty mappings are intentional requests, not broken file references.

| Semantic ID | Category | Present mapped files | Use |
|---|---|---|---|
| `UI_BUTTON_CLICK` | UI | `click.mp3` | Accepted UI action |
| `UI_POOL_CLICK`, `UI_COUNTDOWN` | UI | `click_on_pool.mp3`, `countdown.mp3` | Reserved; no current hook |
| `KANJI_CORRECT`, `KANJI_INCORRECT` | SFX | 3 variants each under `UI/` | Battle, Academy, capture, and PvE answer feedback |
| `BATTLE_ATTACK` | SFX | 4 variants under `Attack/` | Player attack |
| `BATTLE_CUT`, `BATTLE_LIGHTNING_STRIKE`, `BATTLE_STUN`, `BATTLE_GAME_OVER` | SFX | `cut.mp3`, `lightning-strike.mp3`, `stun.mp3`, `game_over.mp3` | Battle impact, special, wrong-answer stun, player defeat |
| `BATTLE_DEFEATED` | SFX | `Defeated/KanjiGo_Defeated_01.mp3` | Creature defeat |
| `BATTLE_ENCOUNTER` | SFX | `KanjiGo_Wild_Kanji_Encounter_1.mp3`, `_2.mp3` | Wild encounter |
| `WORLD_GRASS_RUSTLE`, `WORLD_WATER_WADE`, `WORLD_TRANSIT` | Ambient/SFX | `KanjiGo_Grass_Rustling.mp3`, `water_wade.mp3`, `transit.mp3` | World movement/boat transition |
| `WORLD_KNOWLEDGE_HALL`, `WORLD_OPEN_ARENA` | SFX | matching `KanjiGo_*.mp3` files | Scene entry |
| `WORLD_FISH_CAST`, `WORLD_FISH_BITE`, `WORLD_FISH_SUCCESS`, `WORLD_FISH_FAILURE` | SFX | 4 files under `Fishing/` | Fishing phase changes |
| `CAPTURE_START`, `CAPTURE_FAILURE` | SFX | 2 files under `Capture/` | Capture boundaries |
| `PROGRESSION_ACHIEVEMENT`, `PROGRESSION_BONUS`, `PROGRESSION_LEVELUP` | SFX | `achievement.mp3`, `bonus.mp3`, `levelup.mp3` | Collection, reward, level-up |
| `CREATURE_FEED_KANJI`, `CREATURE_EAT`, `CREATURE_JUMP` | SFX | matching files | No current gameplay hook |
| `WORLD_POND` | Ambient | `KanjiGo_Kanji_Pond.mp3` | Reserved pending behavior review |
| `BGM_*`, `BATTLE_ENEMY_ATTACK`, `BATTLE_PLAYER_DAMAGE`, `BATTLE_ESCAPE_SUCCESS`, `BATTLE_ESCAPE_FAIL` | Music/SFX | None | Intentional empty mappings |

## Present files not currently mapped

Every present file is registered in the manifest. Some are reserved without a hook (`UI_POOL_CLICK`, `UI_COUNTDOWN`, `WORLD_POND`, and creature interaction IDs) because no current gameplay boundary makes their use semantically certain.

## Asset requests

| Priority | Event | Semantic ID | Existing asset | What to provide |
|---|---|---|---|---|
| P0 | Overworld music | `BGM_OVERWORLD` | No | Loopable, warm 8-bit exploration theme; calm and lightly Japanese-influenced without sounding like study music. |
| P0 | Battle music | `BGM_BATTLE` | No | Loopable brisk pixel-RPG battle theme with a clear but non-fatiguing pulse. |
| P0 | Enemy attack | `BATTLE_ENEMY_ATTACK` | No | Short creature attack wind-up, distinct from the player’s sharper attack set. |
| P0 | Player damage | `BATTLE_PLAYER_DAMAGE` | No | Brief low-impact hurt cue, clear under battle effects and not harsh. |
| P1 | Escape result | `BATTLE_ESCAPE_SUCCESS`, `BATTLE_ESCAPE_FAIL` | No | Two short contrasting cues: airy descending getaway and muted failed retreat. |
| P1 | Capture music | `BGM_CAPTURE` | No | Loopable, suspenseful but hopeful ritual bed that yields to success/failure SFX. |
| P1 | Lecture / PvE music | `BGM_LECTURE`, `BGM_PVE` | No | Two loopable themes: focused, gentle study; and competitive but educational arena. |
| P1 | UI confirmation/cancel | `UI_CONFIRM`, `UI_CANCEL` | No | Tiny paired retro UI tones: bright confirm and soft descending cancel. |
| P2 | Dex music, navigation, footsteps, ambience | `BGM_DEX`, `UI_NAVIGATE`, `WORLD_STEP`, `WORLD_RUN`, `WORLD_POND` loop | No dedicated fit | Quiet catalog loop, light navigation tick, walking/running footstep sets, and seamless pond ambience. |

When a requested file is added manually, map its path only in `js/audio-config.js` and update this table. Do not add raw paths to gameplay code.
