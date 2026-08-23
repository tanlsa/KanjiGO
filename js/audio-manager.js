// ============================================================
//  AUDIO-MANAGER.JS — Native HTMLAudio foundation for KanjiGO.
// ============================================================
(function () {
  const config = window.AUDIO_CONFIG || { settingsKey: 'KANJIGO_AUDIO_SETTINGS_V1', assets: {} };
  const DEFAULTS = Object.freeze({ master: 100, music: 70, sfx: 80, ui: 80, ambient: 60, muted: false });
  const MAX_SFX_INSTANCES = 4;
  const SFX_COOLDOWN_MS = 60;
  const templates = new Map();
  const activeSfx = new Set();
  const lastPlayed = new Map();
  let settings = loadSettings();
  let music = null;
  let musicId = '';
  let unlocked = false;

  function clampVolume(value, fallback) {
    if (value === null || value === undefined || value === '') return fallback;
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(0, Math.min(100, number)) : fallback;
  }

  function loadSettings() {
    let stored = null;
    try { stored = JSON.parse(localStorage.getItem(config.settingsKey) || 'null'); } catch (error) { stored = null; }
    return {
      master: clampVolume(stored && stored.master, DEFAULTS.master),
      music: clampVolume(stored && stored.music, DEFAULTS.music),
      sfx: clampVolume(stored && stored.sfx, DEFAULTS.sfx),
      ui: clampVolume(stored && stored.ui, DEFAULTS.ui),
      ambient: clampVolume(stored && stored.ambient, DEFAULTS.ambient),
      muted: typeof (stored && stored.muted) === 'boolean' ? stored.muted : DEFAULTS.muted,
    };
  }

  function saveSettings() {
    try { localStorage.setItem(config.settingsKey, JSON.stringify(settings)); } catch (error) { /* storage is optional */ }
  }

  function getDefinition(id) {
    return config.assets && config.assets[id];
  }

  function getVolume(category) {
    if (settings.muted) return 0;
    const categoryVolume = settings[category];
    return (settings.master / 100) * (Number.isFinite(categoryVolume) ? categoryVolume / 100 : 0);
  }

  function templateFor(file) {
    if (templates.has(file)) return templates.get(file);
    if (typeof Audio === 'undefined') return null;
    const audio = new Audio(file);
    audio.preload = 'auto';
    audio.addEventListener('error', () => console.warn(`[KanjiGO] Audio could not load: ${file}`), { once: true });
    templates.set(file, audio);
    return audio;
  }

  function preload(id) {
    const definition = getDefinition(id);
    if (!definition || !definition.files.length) return Promise.resolve(false);
    const pending = definition.files.map((file) => {
      const audio = templateFor(file);
      if (!audio) return Promise.resolve(false);
      return new Promise((resolve) => {
        if (audio.readyState >= 1) { resolve(true); return; }
        const done = () => resolve(true);
        audio.addEventListener('canplaythrough', done, { once: true });
        audio.addEventListener('error', done, { once: true });
        audio.load();
      });
    });
    return Promise.all(pending).then((results) => results.some(Boolean));
  }

  function chooseFile(id, files) {
    const definition = getDefinition(id);
    const previous = definition && definition.lastIndex;
    let index = Math.floor(Math.random() * files.length);
    if (files.length > 1 && index === previous) index = (index + 1) % files.length;
    if (definition) definition.lastIndex = index;
    return files[index];
  }

  function unlock() {
    unlocked = true;
    if (music && music.paused && getVolume('music') > 0) music.play().catch(() => {});
    return true;
  }

  function bindUnlock() {
    if (typeof window === 'undefined' || !window.addEventListener) return;
    ['keydown', 'pointerdown', 'touchstart'].forEach((eventName) => {
      window.addEventListener(eventName, unlock, { once: true, passive: true });
    });
  }

  function playSFX(id) {
    const definition = getDefinition(id);
    if (!definition || !definition.files.length || typeof Audio === 'undefined') return false;
    const now = Date.now();
    const last = lastPlayed.get(id) || 0;
    if (now - last < SFX_COOLDOWN_MS) return false;
    const instances = [...activeSfx].filter((audio) => audio.audioId === id);
    if (instances.length >= MAX_SFX_INSTANCES) return false;
    const file = chooseFile(id, definition.files);
    const template = templateFor(file);
    if (!template) return false;
    const audio = template.cloneNode();
    audio.audioId = id;
    audio.volume = getVolume(definition.category);
    audio.preload = 'auto';
    activeSfx.add(audio);
    lastPlayed.set(id, now);
    const cleanup = () => { activeSfx.delete(audio); };
    audio.addEventListener('ended', cleanup, { once: true });
    audio.addEventListener('error', cleanup, { once: true });
    if (!unlocked) unlock();
    const result = audio.play();
    if (result && result.catch) result.catch(cleanup);
    return true;
  }

  function playMusic(id) {
    const definition = getDefinition(id);
    if (!definition || !definition.files.length || typeof Audio === 'undefined') return false;
    const file = definition.files[0];
    if (musicId === id && music) {
      music.volume = getVolume('music');
      if (unlocked && music.paused && music.volume > 0) music.play().catch(() => {});
      return true;
    }
    stopMusic();
    music = templateFor(file).cloneNode();
    music.loop = true;
    music.preload = 'auto';
    music.volume = getVolume('music');
    music.addEventListener('error', () => console.warn(`[KanjiGO] Music could not load: ${file}`), { once: true });
    musicId = id;
    if (unlocked && music.volume > 0) music.play().catch(() => {});
    return true;
  }

  function stopMusic() {
    if (music) { music.pause(); music.currentTime = 0; }
    music = null;
    musicId = '';
  }

  function applyVolumes() {
    if (music) music.volume = getVolume('music');
    activeSfx.forEach((audio) => {
      const definition = getDefinition(audio.audioId);
      if (definition) audio.volume = getVolume(definition.category);
    });
  }

  function setVolume(name, value) {
    if (!Object.prototype.hasOwnProperty.call(DEFAULTS, name) || name === 'muted') return getSettings();
    settings[name] = clampVolume(value, DEFAULTS[name]);
    saveSettings(); applyVolumes();
    return getSettings();
  }

  function setMuted(value) {
    settings.muted = Boolean(value);
    saveSettings(); applyVolumes();
    return getSettings();
  }

  function getSettings() { return { ...settings }; }

  const AudioManager = {
    preload,
    preloadAll: () => Promise.all(Object.keys(config.assets || {}).map(preload)),
    unlock,
    playSFX,
    playMusic,
    stopMusic,
    getSettings,
    setMasterVolume: (value) => setVolume('master', value),
    setMusicVolume: (value) => setVolume('music', value),
    setSFXVolume: (value) => setVolume('sfx', value),
    setUIVolume: (value) => setVolume('ui', value),
    setAmbientVolume: (value) => setVolume('ambient', value),
    setMuted,
    isUnlocked: () => unlocked,
    getActiveMusic: () => musicId,
    getCachedAssetCount: () => templates.size,
  };

  bindUnlock();
  window.AudioManager = AudioManager;
})();
