# Audio Settings Specification

This document specifies the future user-facing Audio Settings system. The settings data model, persistence, volume APIs, and mute behavior are implemented in `js/audio-manager.js`; the settings UI is not implemented.

## Goals

- Give players independent control over overall volume and major audio groups.
- Make mute behavior immediate and predictable.
- Persist settings between sessions using the existing browser `localStorage` mechanism.
- Keep the model simple enough for the current offline, vanilla Canvas architecture.

## Settings

All volume values use a percentage range from **0 to 100**. The runtime may convert the percentage to a normalized gain from 0.0 to 1.0.

| Setting | Purpose | Range | Default | Persistence | Affects |
|---|---|---:|---:|---|---|
| Master Volume | Global multiplier for all game audio | 0-100% | 100% | Persist in localStorage | Every BGM, SFX, ambient, UI, creature, and notification sound |
| Music Volume | Controls background music | 0-100% | 70% | Persist in localStorage | BGM / Music only |
| SFX Volume | Controls gameplay sound effects | 0-100% | 80% | Persist in localStorage | Battle, world, creature, capture, progression, and general effects |
| UI Volume | Controls interface feedback | 0-100% | 80% | Persist in localStorage | UI clicks, confirmations, navigation, dialogs, and UI notifications |
| Ambient Volume | Controls environmental sound | 0-100% | 60% | Persist in localStorage | World/environment ambience, pond, grass, water, and location ambience |
| Mute All Audio | Immediate global mute switch | On/Off | Off | Persist in localStorage | All audio, regardless of individual volume values |

## Effective Volume

The intended effective gain is:

```text
Master gain x Category gain x Per-sound gain
```

For example, a world sound uses the Master, SFX, and Ambient controls. A UI click uses the Master, SFX, and UI controls. Music uses the Master and Music controls.

Mute All Audio overrides the calculated gain and produces zero output without discarding the saved slider values.

## Category Mapping

- **Music:** BGM tracks for overworld, battle, lecture, Dex, capture, and PvE.
- **SFX:** Battle, creature, capture, progression, reward, fishing, and general one-shot effects.
- **UI:** Menu clicks, navigation, confirmations, dialog advancement, quiz UI feedback, and notification cues.
- **Ambient:** Looped or environmental world sounds such as pond, water, grass, and location ambience.

If a sound could fit multiple groups, the implementation should assign one canonical category in the audio catalog rather than applying multiple category gains.

## Persistence

The project already persists game data with `localStorage` in [js/game.js](../../js/game.js):

- `KANJIGO_LEARNING_V1`
- `KANJIGO_GAME_V1`
- `KANJIGO_DATA_V1`

Audio preferences should use a separate versioned key, proposed as:

```text
KANJIGO_AUDIO_SETTINGS_V1
```

Proposed stored shape:

```js
{
  master: 100,
  music: 70,
  sfx: 80,
  ui: 80,
  ambient: 60,
  muted: false
}
```

Loading must validate each numeric value, clamp it to 0-100, and fall back independently to defaults when a stored field is invalid. Storage failures, including browser restrictions when running from `file://`, should leave audio usable with in-memory defaults.

## User Interface Requirements

The future settings UI should provide:

- Five clearly labeled percentage sliders or equivalent controls.
- A visible Mute All Audio toggle.
- Current percentage values.
- Immediate preview/application when a value changes.
- A reset-to-default action.
- Accessible labels and keyboard operation.
- No requirement to restart the game after changing a value.

The current game is Canvas-first and has no settings screen. The future UI must define how the settings screen is entered and exited without changing existing gameplay behavior unexpectedly. Until then, settings are available only through the `AudioManager` API.

## Browser and Playback Considerations

- Audio playback may be blocked until a user gesture. The first accepted keyboard, pointer, or touch interaction should be considered a possible audio-unlock point.
- Muted or zero-volume states must not create audible output.
- Settings must apply to already-playing BGM and ambient loops, not only future playback.
- One-shot effects should not create unbounded overlapping instances.
- The offline `file://` launch path must remain supported where browser policy permits.
