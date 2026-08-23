# Audio Implementation Plan

This is a future implementation plan. No phase below is implemented by this audit.

## Phase 1: Audio Foundation

- **Implement:** Define audio IDs, category names, asset manifest shape, loading policy, playback error handling, and browser user-gesture unlock behavior.
- **Likely modify:** `js/config.js`, `index.html`.
- **Likely create:** `js/audio-config.js` or a manifest section in `js/config.js`; `docs/audio` remains the source documentation.
- **Depends on:** None.
- **Risks / verify:** Preserve direct `file://` operation, avoid blocking game startup on optional audio, and handle missing/corrupt files gracefully.

## Phase 2: Audio Manager

- **Implement:** Centralized loading, caching, BGM playback, one-shot SFX playback, category routing, volume calculation, mute state, and cleanup.
- **Likely modify:** `index.html`, possibly `js/config.js`.
- **Likely create:** `js/audio-manager.js`.
- **Depends on:** Phase 1.
- **Risks / verify:** Browser autoplay policy, overlapping effects, repeated playback from held input, memory use, and failed asset loads.

## Phase 3: Audio Settings

- **Implement:** Settings model, validation, localStorage persistence, controls for Master/Music/SFX/UI/Ambient/Mute, reset behavior, and live application.
- **Likely modify:** `index.html`, `js/game.js`, `js/config.js`.
- **Likely create:** A settings UI module or Canvas/DOM settings view; tests or QA harness if introduced.
- **Depends on:** Phase 2.
- **Risks / verify:** Settings must apply to active music/ambient playback and survive storage errors without corrupting gameplay saves.

## Phase 4: BGM Integration

- **Implement:** Add or generate loopable music for overworld, battle, lecture, capture, Dex, and PvE; switch tracks on state transitions.
- **Likely modify:** `js/game.js`, `js/config.js`, `index.html`.
- **Likely create:** BGM assets and manifest entries.
- **Depends on:** Phases 1-3.
- **Risks / verify:** No current BGM assets exist; verify loop points, transition timing, interruption/resume behavior, and mobile playback.

## Phase 5: UI SFX Integration

- **Implement:** Click, confirm, cancel, navigation, dialog, answer-feedback, and invalid-action sounds.
- **Likely modify:** `js/game.js`, `index.html`.
- **Likely create:** Missing UI SFX assets where review confirms they are absent.
- **Depends on:** Phase 2 and preferably Phase 3.
- **Risks / verify:** Canvas and DOM input paths must not double-trigger sounds; avoid sound spam from repeated keys.

## Phase 6: World / Environment Integration

- **Implement:** Movement, running, grass, pond, water, boat, fishing, and location/transition sounds.
- **Likely modify:** `js/game.js`, `js/config.js`.
- **Likely create:** Missing fishing and movement assets; possibly loop variants.
- **Depends on:** Phase 2.
- **Risks / verify:** Footstep cadence, repeated movement, ambient loop volume, and state changes while fishing or boarding.

## Phase 7: Battle Integration

- **Implement:** Encounter, attack, hit, damage, stun, timeout, perfect, special, escape, victory, and defeat sounds.
- **Likely modify:** `js/game.js`, `js/config.js`.
- **Likely create:** Missing battle impact, player-damage, perfect, energy, escape, and timeout assets.
- **Depends on:** Phase 2; BGM from Phase 4 is useful but not strictly required.
- **Risks / verify:** Align sound timing with attack/hit-stop timers, prevent duplicate sounds during pending win/loss, and maintain clarity during overlapping effects.

## Phase 8: Kanji / Creature Integration

- **Implement:** Correct/incorrect Kanji feedback, creature reactions, capture feedback, and any approved feeding interactions.
- **Likely modify:** `js/game.js`, `js/kanji.js` only if metadata is eventually added.
- **Likely create:** Kanji answer, capture, and creature reaction assets; optional per-creature mapping.
- **Depends on:** Phase 2 and battle/capture boundaries from Phase 7.
- **Risks / verify:** Do not imply that a sound represents a Japanese reading unless content is verified; keep creature-specific mappings data-driven.

## Phase 9: Missing Audio Generation

- **Implement:** Generate or acquire approved replacements for the missing IDs, then record provenance and licensing.
- **Likely modify:** `js/config.js` or audio manifest; documentation files.
- **Likely create:** New audio assets under the existing sound directory structure.
- **Depends on:** Previous phases identifying real gaps and playback requirements.
- **Risks / verify:** Commercial rights, attribution, consistency of loudness/format, loopability, and avoiding unverified online assets.

## Phase 10: Audio Testing and Polish

- **Implement:** Functional, browser, settings, regression, performance, and mix testing; tune volume, priority, cooldowns, and transitions.
- **Likely modify:** Audio manager, settings, and integration modules as needed.
- **Likely create:** QA checklist, test harness, or browser test documentation.
- **Depends on:** Phases 1-9.
- **Risks / verify:** Test desktop/mobile, keyboard/touch, `file://` and HTTP launch, first-interaction unlock, mute persistence, missing assets, rapid scene changes, and localStorage failures.
