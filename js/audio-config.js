// ============================================================
//  AUDIO-CONFIG.JS — Semantic audio manifest. Gameplay uses IDs only.
// ============================================================
(function () {
  const asset = (category, files, options = {}) => ({ category, files, ...options });

  window.AUDIO_CONFIG = {
    settingsKey: 'KANJIGO_AUDIO_SETTINGS_V1',
    categories: ['music', 'sfx', 'ui', 'ambient'],
    // Kanji pronunciation audio. Files follow a deterministic convention:
    //   on  -> <kanji>_on.mp3  under kanjiAudio.on
    //   kun -> <kanji>_kun.mp3 under kanjiAudio.kun
    // These paths stay in the audio manifest; gameplay code only ever refers
    // to a Kanji character through AudioManager.playKanjiOnYomi/playKanjiKunYomi.
    kanjiAudio: {
      on: 'assets/sounds/kanji_audio_on/',
      kun: 'assets/sounds/kanji_audio_kun/',
    },
    assets: {
      UI_BUTTON_CLICK: asset('ui', ['assets/sounds/click.mp3']),
      UI_POOL_CLICK: asset('ui', ['assets/sounds/click_on_pool.mp3']),
      UI_COUNTDOWN: asset('ui', ['assets/sounds/countdown.mp3']),

      BATTLE_ATTACK: asset('sfx', [
        'assets/sounds/Attack/KanjiGo_Attack_01.mp3',
        'assets/sounds/Attack/KanjiGo_Attack_02.mp3',
        'assets/sounds/Attack/KanjiGo_Attack_03.mp3',
        'assets/sounds/Attack/KanjiGo_Attack_04.mp3',
      ]),
      BATTLE_DEFEATED: asset('sfx', [
        'assets/sounds/Defeated/KanjiGo_Defeated_01.mp3',
        'assets/sounds/Defeated/KanjiGo_Defeated_02.mp3',
        'assets/sounds/Defeated/KanjiGo_Defeated_03.mp3',
        'assets/sounds/Defeated/KanjiGo_Defeated_04.mp3',
        'assets/sounds/Defeated/KanjiGo_Defeated_05.mp3',
      ]),
      BATTLE_CUT: asset('sfx', ['assets/sounds/cut.mp3']),
      BATTLE_GAME_OVER: asset('sfx', ['assets/sounds/game_over.mp3']),
      BATTLE_LIGHTNING_STRIKE: asset('sfx', ['assets/sounds/lightning-strike.mp3']),
      BATTLE_STUN: asset('sfx', ['assets/sounds/stun.mp3']),
      BATTLE_ENEMY_ATTACK: asset('sfx', []),
      BATTLE_PLAYER_DAMAGE: asset('sfx', [
        'assets/sounds/Battle/KANJIGO_Player_Damage_01.mp3',
        'assets/sounds/Battle/KANJIGO_Player_Damage_02.mp3',
        'assets/sounds/Battle/KANJIGO_Player_Damage_03.mp3',
      ]),
      BATTLE_ESCAPE_SUCCESS: asset('sfx', ['assets/sounds/Battle/KanjiGo_Escape_Success.mp3']),
      BATTLE_ESCAPE_FAIL: asset('sfx', ['assets/sounds/Battle/KanjiGo_Escape_Failure.mp3']),
      KANJI_CORRECT: asset('sfx', [
        'assets/sounds/UI/KANJIGO_Kanji_Correct_01.mp3',
        'assets/sounds/UI/KANJIGO_Kanji_Correct_02.mp3',
        'assets/sounds/UI/KANJIGO_Kanji_Correct_03.mp3',
      ]),
      KANJI_INCORRECT: asset('sfx', [
        'assets/sounds/UI/KANJIGO_Kanji_Incorrect_01.mp3',
        'assets/sounds/UI/KANJIGO_Kanji_Incorrect_02.mp3',
        'assets/sounds/UI/KANJIGO_Kanji_Incorrect_03.mp3',
      ]),
      BATTLE_ENCOUNTER: asset('sfx', [
        'assets/sounds/KanjiGo_Wild_Kanji_Encounter_1.mp3',
        'assets/sounds/KanjiGo_Wild_Kanji_Encounter_2.mp3',
      ]),

      WORLD_GRASS_RUSTLE: asset('sfx', ['assets/sounds/KanjiGo_Grass_Rustling.mp3']),
      WORLD_POND: asset('sfx', ['assets/sounds/KanjiGo_Kanji_Pond.mp3']),
      WORLD_KNOWLEDGE_HALL: asset('sfx', ['assets/sounds/KanjiGo_Knowledge_Hall.mp3']),
      WORLD_OPEN_ARENA: asset('sfx', ['assets/sounds/KanjiGo_Open_Arena.mp3']),
      WORLD_TRANSIT: asset('sfx', ['assets/sounds/transit.mp3']),
      WORLD_WATER_WADE: asset('sfx', ['assets/sounds/water_wade.mp3']),
      WORLD_FISH_CAST: asset('sfx', ['assets/sounds/Fishing/KanjiGo_Fishing_Cast.mp3']),
      WORLD_FISH_BITE: asset('sfx', ['assets/sounds/Fishing/KanjiGo_Fishing_Bite.mp3']),
      WORLD_FISH_SUCCESS: asset('sfx', ['assets/sounds/Fishing/KanjiGo_Fishing_Success.mp3']),
      WORLD_FISH_FAILURE: asset('sfx', ['assets/sounds/Fishing/KanjiGo_Fishing_Failure.mp3']),

      CREATURE_FEED_KANJI: asset('sfx', ['assets/sounds/KanjiGo_Feed_Kanji.mp3']),
      CREATURE_EAT: asset('sfx', ['assets/sounds/eat.mp3']),
      CREATURE_JUMP: asset('sfx', ['assets/sounds/jump.mp3']),

      PROGRESSION_ACHIEVEMENT: asset('sfx', ['assets/sounds/achievement.mp3']),
      PROGRESSION_BONUS: asset('sfx', ['assets/sounds/bonus.mp3']),
      PROGRESSION_LEVELUP: asset('sfx', ['assets/sounds/levelup.mp3']),
      CAPTURE_START: asset('sfx', ['assets/sounds/Capture/KanjiGo_Capture_Start.mp3']),
      CAPTURE_FAILURE: asset('sfx', ['assets/sounds/Capture/KanjiGo_Capture_Failure.mp3']),

      // Background music (BGM). Gameplay code never references a file path
      // directly; it only drives BGM through AudioManager.syncMusic(state),
      // which resolves the current game state to a semantic BGM ID below.
      // BGM_OVERWORLD reuses the shared background_music track for the world.
      BGM_OVERWORLD: asset('music', ['assets/sounds/background_music.mp3']),
      // Slots below intentionally have no files yet; silence is preferred over
      // inventing audio until the user provides dedicated tracks.
      BGM_BATTLE: asset('music', []),
      BGM_LECTURE: asset('music', []),
      BGM_DEX: asset('music', []),
      BGM_CAPTURE: asset('music', []),
      BGM_PVE: asset('music', []),
    },
    // Maps each distinct game state to the semantic BGM ID that should play.
    // States absent from this map (or mapped to an empty slot) play no music.
    // Menu overlays that remain layered on the overworld keep the world track.
    stateMusic: {
      overworld: 'BGM_OVERWORLD',
      dex: 'BGM_OVERWORLD',
      skills: 'BGM_OVERWORLD',
      profile: 'BGM_OVERWORLD',
      gym_select: 'BGM_OVERWORLD',
      battle: 'BGM_BATTLE',
      lecture: 'BGM_LECTURE',
      capture: 'BGM_CAPTURE',
      pve: 'BGM_PVE',
    },
  };
})();
