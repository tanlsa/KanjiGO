# Audio Settings

The settings backend and UI are implemented. Open Settings with the on-screen control or `O`, then choose the Audio section. Changes apply immediately and persist in `localStorage` under `KANJIGO_AUDIO_SETTINGS_V1`.

| Setting | Default | Applies to |
|---|---:|---|
| Master Volume | 100% | Every category |
| Music Volume | 70% | BGM semantic IDs |
| SFX Volume | 80% | Battle, capture, fishing, progression, creature effects |
| UI Volume | 80% | UI cues |
| Ambient Volume | 60% | Environment cues |
| Mute All Audio | Off | Every category without changing slider values |

The effective gain is `master × category`. Audio is safe to call before an asset exists: an ID with an empty file list returns `false` and plays nothing. This is intentional for documented missing assets.

Settings values are independently validated and clamped to 0–100 when loaded. Storage errors leave the game on in-memory defaults. Reset restores the defaults above. Active music and one-shot instances receive new volume values immediately.

Playback is unlocked by the first key, pointer, or touch gesture where browser policy requires it. The manager limits repeated one-shot playback with a short per-ID cooldown and at most four simultaneous instances for the same ID.
