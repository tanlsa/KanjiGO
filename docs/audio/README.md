# KanjiGO Audio Documentation

## Current Status

KanjiGO has an implemented audio foundation and AudioManager. Native playback, caching, preload, semantic asset IDs, category volumes, mute, persistence, user-gesture unlocking, and selected gameplay SFX integration are working. There is no audio event bus and no Audio Settings UI yet.

The repository contains **47 MP3 assets** under `assets/sounds/`: 30 manually collected assets and 17 locally generated P1 effects. Existing assets are referenced by the manifest and preloaded non-blockingly; BGM slots remain empty.

## Asset Summary

| Category | Count |
|---|---:|
| BGM / Music | 0 |
| UI SFX | 12 |
| Battle SFX | 20 |
| World / Environment SFX | 10 |
| Kanji / Creature SFX | 3 |
| Progression / Reward SFX | 3 |
| System / Notification SFX | 0 |
| Other / Unknown | 0 |
| **Total** | **47** |

Battle assets are the best-covered area. BGM is entirely absent. UI, movement, fishing, capture, Kanji learning, and system notification coverage are incomplete.

## Existing vs Missing

- **Existing files:** 47 MP3 assets.
- **Locally generated P1 files:** 17 MP3 assets.
- **Clearly identified BGM:** 0.
- **Implemented event mappings:** 24 semantic gameplay/UI connections, including reused assets.
- **Events needing review:** 15.
- **Missing dedicated audio events:** 24.
- **Assets with unknown source/license:** 30 manually collected assets; generated assets have known local provenance but project licensing still requires confirmation.

The event counts come from [AUDIO_EVENTS.md](AUDIO_EVENTS.md) and include gameplay events rather than unique files.

## Documentation

- [AUDIO_ASSETS.md](AUDIO_ASSETS.md): complete inventory, stable IDs, categories, inferred purposes, metadata limitations, and missing asset matrix.
- [AUDIO_EVENTS.md](AUDIO_EVENTS.md): gameplay event specification based on current `js/game.js` boundaries.
- [AUDIO_SETTINGS.md](AUDIO_SETTINGS.md): future full Audio Settings specification.
- [AUDIO_IMPLEMENTATION_PLAN.md](AUDIO_IMPLEMENTATION_PLAN.md): phased implementation sequence.
- [AUDIO_LICENSES.md](AUDIO_LICENSES.md): source, license, attribution, and commercial-use tracking.

## Audio Settings Status

The Audio Settings backend and user-facing UI are **implemented** through `AudioManager` and `js/audio-settings-ui.js`, including Master Volume, Music Volume, SFX Volume, UI Volume, Ambient Volume, Mute All Audio, reset, and persistence through `KANJIGO_AUDIO_SETTINGS_V1`.

## Integration Status

No additional audio integration exists in:

- `index.html`
- `js/config.js`
- `js/game.js` (selected gameplay integration exists)
- `js/map.js`
- `js/data-loader.js`
- `js/kanji.js`

No existing gameplay code or existing audio asset was modified during this asset-generation task.

## License Audit Status

The 30 manually collected assets have `UNKNOWN` source, license, attribution, and commercial-use status. The 17 generated assets have local-generation provenance, but project ownership and commercial-use policy still require confirmation.

## Next Recommended Step

Continue with audio QA and provenance review, then address the remaining unfilled event IDs. BGM remains deferred until approved music assets exist.
