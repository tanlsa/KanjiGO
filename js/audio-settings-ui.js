// ============================================================
//  AUDIO-SETTINGS-UI.JS — Shared Settings shell; audio is its first section.
// ============================================================
(function () {
  const manager = window.AudioManager;
  if (!manager) return;

  const DEFAULTS = Object.freeze({ master: 100, music: 70, sfx: 80, ui: 80, ambient: 60, muted: false });
  const overlay = document.getElementById('settings-overlay');
  const panel = document.getElementById('settings-panel');
  const openButton = document.getElementById('settings-open');
  const closeButton = document.getElementById('settings-close');
  const resetButton = document.getElementById('settings-reset');
  const home = document.getElementById('settings-home');
  const audioView = document.getElementById('settings-audio-view');
  const characterView = document.getElementById('settings-character-view');
  const intro = document.getElementById('settings-intro');
  const controls = [...document.querySelectorAll('[data-audio-setting]')];
  let lastFocused = null;
  let open = false;
  let page = 'home';

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

  function showPage(nextPage = 'home') {
    page = ['audio', 'characters'].includes(nextPage) ? nextPage : 'home';
    home?.classList.toggle('settings-page-hidden', page !== 'home');
    audioView?.classList.toggle('settings-page-hidden', page !== 'audio');
    characterView?.classList.toggle('settings-page-hidden', page !== 'characters');
    resetButton.classList.toggle('settings-page-hidden', page !== 'audio');
    if (intro) intro.classList.toggle('settings-page-hidden', page !== 'home');
    if (page === 'audio') refresh();
    if (page === 'characters') {
      window.KanjiGOCharacters?.showCharacterList?.();
      window.KanjiGOCharacters?.refreshSettings?.();
    }
    panel.scrollTop = 0;
  }

  function setOpen(nextOpen) {
    open = Boolean(nextOpen);
    overlay.classList.toggle('is-open', open);
    overlay.setAttribute('aria-hidden', String(!open));
    openButton.setAttribute('aria-expanded', String(open));
    if (open) {
      lastFocused = document.activeElement;
      showPage('home');
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
  openButton.addEventListener('click', () => setOpen(!open));
  closeButton.addEventListener('click', () => setOpen(false));
  resetButton.addEventListener('click', setDefaults);
  document.querySelectorAll('[data-settings-page]').forEach((button) => {
    button.addEventListener('click', () => showPage(button.dataset.settingsPage));
  });
  document.querySelectorAll('[data-settings-back]').forEach((button) => {
    button.addEventListener('click', () => showPage('home'));
  });
  overlay.addEventListener('click', (event) => { if (event.target === overlay) setOpen(false); });
  document.addEventListener('keydown', (event) => {
    const key = String(event.key || '').toLowerCase();
    const typing = /^(input|textarea|select)$/i.test(event.target && event.target.tagName || '');
    if (window.KanjiGOCharacters?.isOnboardingBlocking?.()) return;
    if (key === 'o' && !typing && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault(); event.stopPropagation(); setOpen(!open); return;
    }
    if (!open) return;
    event.stopPropagation();
    if (event.key === 'Escape') { event.preventDefault(); setOpen(false); }
    if (event.key === 'Tab') {
      const visibleControls = [...panel.querySelectorAll('button, input')].filter((control) => !control.disabled && control.offsetParent !== null);
      const focusable = visibleControls.length ? visibleControls : [closeButton];
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });

  window.SettingsUI = {
    open: () => setOpen(true),
    close: () => setOpen(false),
    toggle: () => setOpen(!open),
    isOpen: () => open,
    showPage,
    currentPage: () => page,
  };
})();
