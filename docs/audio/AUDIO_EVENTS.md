# Audio Event Map

`IMPLEMENTED` means a hook and a currently present mapped file exist. `SILENT` means the semantic hook is intentionally present but no matching asset is currently available. No sound is fired from `render()` or a per-frame update loop.

| Gameplay event | Semantic ID | Status | Notes |
|---|---|---|---|
| Accepted UI/touch/keyboard action | `UI_BUTTON_CLICK` | IMPLEMENTED | One generic click; do not use it for every future UI state. |
| Tall grass / water boat step | `WORLD_GRASS_RUSTLE`, `WORLD_WATER_WADE` | IMPLEMENTED | Fired only after a completed world step. |
| Board / disembark boat | `WORLD_TRANSIT` | IMPLEMENTED | Reused for both directional transitions. |
| Fishing cast, bite, success, failure | `WORLD_FISH_*` | IMPLEMENTED | Each fires once on its phase transition. |
| Wild encounter | `BATTLE_ENCOUNTER` | IMPLEMENTED | Two-file variation group. |
| Player correct attack / impact / special | `KANJI_CORRECT`, `BATTLE_ATTACK`, `BATTLE_CUT`, `BATTLE_LIGHTNING_STRIKE` | IMPLEMENTED | Distinct action and impact cues. |
| Incorrect or timed-out battle answer | `KANJI_INCORRECT`, `BATTLE_STUN` | IMPLEMENTED | Timeout intentionally reuses the incorrect/stun pair. |
| Enemy action / player damage | `BATTLE_ENEMY_ATTACK`, `BATTLE_PLAYER_DAMAGE` | PARTIAL | Player damage has three dedicated variants; the enemy-action cue remains reserved. |
| Enemy defeat / player defeat | `BATTLE_DEFEATED`, `BATTLE_GAME_OVER` | IMPLEMENTED | Creature defeat rotates across five variants. |
| Escape success / failure | `BATTLE_ESCAPE_SUCCESS`, `BATTLE_ESCAPE_FAIL` | IMPLEMENTED | Dedicated contrasting result cues are mapped. |
| Academy entry | `WORLD_KNOWLEDGE_HALL` | IMPLEMENTED | Fires after a successful entry. |
| Academy check / confirmation answer | `KANJI_CORRECT`, `KANJI_INCORRECT` | IMPLEMENTED | Added for the current Academy learning flow. |
| Capture start / answer / success / failure | `CAPTURE_START`, `KANJI_CORRECT`/`KANJI_INCORRECT`, `PROGRESSION_ACHIEVEMENT`, `CAPTURE_FAILURE` | IMPLEMENTED | Achievement is a deliberate capture-success reuse. |
| PvE entry / answer | `WORLD_OPEN_ARENA`, `KANJI_CORRECT`/`KANJI_INCORRECT` | IMPLEMENTED | Correctness is calculated once before feedback. |
| Level-up, new collection, perfect-answer reward | `PROGRESSION_LEVELUP`, `PROGRESSION_ACHIEVEMENT`, `PROGRESSION_BONUS` | IMPLEMENTED | Reward sounds are event-bound. |
| Overworld, battle, lecture, Dex, capture, PvE music | `BGM_*` | SILENT | IDs are reserved; no music asset is present. |

## Intentional non-coverage

Normal/running footsteps, pond ambience, cancel/navigation/error/dialog cues, energy-full feedback, lecture step advancement, arena result, toast notifications, and scene transitions have no dedicated appropriate asset. They must remain silent until suitable assets are supplied; generic click/transit sounds should not be stretched across these meanings.
