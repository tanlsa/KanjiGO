# KanjiGO Audio Documentation

## Current Status

KanjiGO has **no implemented audio system**. There is currently no AudioManager, playback code, audio preload path, audio event bus, audio settings UI, or gameplay audio integration.

The repository contains **30 existing MP3 assets** under `assets/sounds/`. They are not referenced by the game runtime.

## Asset Summary

| Category | Count |
|---|---:|
| BGM / Music | 0 |
| UI SFX | 3 |
| Battle SFX | 15 |
| World / Environment SFX | 6 |
| Kanji / Creature SFX | 3 |
| Progression / Reward SFX | 3 |
| System / Notification SFX | 0 |
| Other / Unknown | 0 |
| **Total** | **30** |

Battle assets are the best-covered area. BGM is entirely absent. UI, movement, fishing, capture, Kanji learning, and system notification coverage are incomplete.

## Existing vs Missing

- **Existing files:** 30 MP3 assets.
- **Clearly identified BGM:** 0.
- **Existing event mappings:** 14.
- **Events needing review:** 15.
- **Missing dedicated audio events:** 35.
- **Assets with unknown source/license:** 30.

The event counts come from [AUDIO_EVENTS.md](AUDIO_EVENTS.md) and include gameplay events rather than unique files.

## Documentation

- [AUDIO_ASSETS.md](AUDIO_ASSETS.md): complete inventory, stable IDs, categories, inferred purposes, metadata limitations, and missing asset matrix.
- [AUDIO_EVENTS.md](AUDIO_EVENTS.md): gameplay event specification based on current `js/game.js` boundaries.
- [AUDIO_SETTINGS.md](AUDIO_SETTINGS.md): future full Audio Settings specification.
- [AUDIO_IMPLEMENTATION_PLAN.md](AUDIO_IMPLEMENTATION_PLAN.md): phased implementation sequence.
- [AUDIO_LICENSES.md](AUDIO_LICENSES.md): source, license, attribution, and commercial-use tracking.

## Audio Settings Status

Full Audio Settings are approved as a future feature but are **not implemented**. The specification covers Master Volume, Music Volume, SFX Volume, UI Volume, Ambient Volume, and Mute All Audio, with persistence through a proposed `KANJIGO_AUDIO_SETTINGS_V1` localStorage key.

## Integration Status

No audio integration exists in:

- `index.html`
- `js/config.js`
- `js/game.js`
- `js/map.js`
- `js/data-loader.js`
- `js/kanji.js`

No gameplay code or audio asset was modified during this audit.

## License Audit Status

All 30 existing assets have `UNKNOWN` source, license, attribution, and commercial-use status. They must not be assumed legally reusable for commercial distribution solely because they are present in the repository.

## Next Recommended Step

Begin **Phase 1: Audio Foundation** from [AUDIO_IMPLEMENTATION_PLAN.md](AUDIO_IMPLEMENTATION_PLAN.md), after confirming the desired licensing policy and deciding which existing assets pass content and provenance review.
