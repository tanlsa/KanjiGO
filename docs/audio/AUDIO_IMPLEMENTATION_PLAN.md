# Audio Implementation Plan

## Complete

- Semantic manifest and native `AudioManager`.
- Non-blocking preload, playback guarding, variation selection, volume categories, persistence, and gesture unlock.
- DOM Audio Settings UI.
- Current gameplay hooks listed in [AUDIO_EVENTS.md](AUDIO_EVENTS.md).
- Stale references removed from the manifest; no missing physical audio file is treated as an error.

## Next, after assets are supplied

1. Map approved BGM files and add state-transition music handling.
2. Map dedicated enemy attack, player damage, and escape-result files to the already-installed semantic hooks.
3. Add UI confirmation/cancel/navigation hooks only when the matching distinct cues exist.
4. Add footstep cadence and pond ambience only with suitable short/seamless assets; never trigger them from a render loop.
5. Run browser mix QA for keyboard, touch, first-gesture playback, mute persistence, rapid battle transitions, and `file://` launch.
