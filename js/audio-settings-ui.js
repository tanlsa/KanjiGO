// ============================================================
//  AUDIO-SETTINGS-UI.JS — DOM controls for AudioManager settings.
// ============================================================
(function () {
  const manager = window.AudioManager;
  if (!manager) return;

  const DEFAULTS = Object.freeze({ master: 100, music: 70, sfx: 80, ui: 80, ambient: 60, muted: false });
  const overlay = document.getElementById('audio-settings-overlay');
  const panel = document.getElementById('audio-settings-panel');
  const openButton = document.getElementById('audio-settings-open');
  const closeButton = document.getElementById('audio-settings-close');
  const resetButton = document.getElementById('audio-settings-reset');
  const controls = [...document.querySelectorAll('[data-audio-setting]')];
  let lastFocused = null;
  let open = false;

  if (!overlay || !panel || !openButton || !closeButton || !resetButton) return;

  function refresh() {
    const settings = manager.getSettings();
    controls.forEach((control) => {
      const name = control.dataset.audioSetting;
      if (name === 'muted') control.checked = Boolean(settings.muted);
      else {
        control.value = String(settings[name]);
        document.getElementById(`${control.id}-value`).textContent = `${settings[name]}%`;
      }
    });
  }

  function updateVolume(name, value) {
    const setters = {
      master: manager.setMasterVolume,
      music: manager.setMusicVolume,
      sfx: manager.setSFXVolume,
      ui: manager.setUIVolume,
      ambient: manager.setAmbientVolume,
    };
    if (setters[name]) setters[name](Number(value));
    refresh();
  }

  function setDefaults() {
    manager.setMasterVolume(DEFAULTS.master);
    manager.setMusicVolume(DEFAULTS.music);
    manager.setSFXVolume(DEFAULTS.sfx);
    manager.setUIVolume(DEFAULTS.ui);
    manager.setAmbientVolume(DEFAULTS.ambient);
    manager.setMuted(DEFAULTS.muted);
    refresh();
  }

  function setOpen(nextOpen) {
    open = nextOpen;
    overlay.classList.toggle('is-open', open);
    openButton.setAttribute('aria-expanded', String(open));
    if (open) {
      lastFocused = document.activeElement;
      refresh();
      panel.focus();
    } else if (lastFocused && typeof lastFocused.focus === 'function') {
      lastFocused.focus();
    } else openButton.focus();
  }

  controls.forEach((control) => {
    control.addEventListener('input', () => {
      const name = control.dataset.audioSetting;
      if (name === 'muted') manager.setMuted(control.checked);
      else updateVolume(name, control.value);
    });
    control.addEventListener('change', () => {
      const name = control.dataset.audioSetting;
      if (name === 'muted') manager.setMuted(control.checked);
      else updateVolume(name, control.value);
    });
  });

  openButton.setAttribute('aria-expanded', 'false');
  openButton.addEventListener('click', () => setOpen(true));
  closeButton.addEventListener('click', () => setOpen(false));
  resetButton.addEventListener('click', setDefaults);
  overlay.addEventListener('click', (event) => { if (event.target === overlay) setOpen(false); });
  document.addEventListener('keydown', (event) => {
    if (!open) return;
    event.stopPropagation();
    if (event.key === 'Escape') { event.preventDefault(); setOpen(false); }
    if (event.key === 'Tab') {
      const focusable = [closeButton, resetButton, ...controls];
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
})();
