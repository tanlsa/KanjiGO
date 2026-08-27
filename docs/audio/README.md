# KanjiGO Audio

## Current implementation

KanjiGO uses semantic IDs in `js/audio-config.js`; gameplay code calls `AudioManager.playSFX(id)` and never contains an audio path. `js/audio-manager.js` provides non-blocking preload, variation selection, four category volume controls, mute, persistence, and browser-gesture unlock. The DOM Audio Settings panel is implemented in `js/audio-settings-ui.js`.

The current `assets/sounds/` inventory contains **38 MP3 files**. This is a filesystem count only; this project does not infer provenance, license, duration, or suitability from a filename.

Implemented event hooks include UI actions, tall grass and water movement, boat transitions, fishing, battle and capture feedback, Academy entry/check feedback, PvE entry/check feedback, and progression rewards. BGM IDs are deliberately registered with no paths: no music files currently exist.

## Sound direction

KanjiGO should sound like a responsive pixel RPG: crisp and playful UI cues; airy, restrained environmental sounds; readable learning feedback; and a battle chain that clearly separates encounter, player action, impact, enemy response, and outcome. Japanese influence should be light and instrumental/textural rather than using unverified language or cultural signifiers.

Existing sounds are only reused where their filename gives a reasonable semantic match. Generic click, bonus, achievement, and transit files are not substitutes for every missing interaction.

## Documentation

- [Asset catalog](AUDIO_ASSETS.md) — verified file inventory, semantic mappings, and requested assets.
- [Event map](AUDIO_EVENTS.md) — current hooks and intentional silent hooks.
- [Audio settings](AUDIO_SETTINGS.md) — player-facing controls and runtime behavior.
- [Implementation plan](AUDIO_IMPLEMENTATION_PLAN.md) — remaining audio work.
- [License record](AUDIO_LICENSES.md) — provenance still to be completed by the asset owner.

## Safety boundary

Audio code and documentation may be changed here. Physical files under `assets/sounds/` are owned and managed separately and are never created, renamed, moved, converted, or deleted by audio implementation work.
