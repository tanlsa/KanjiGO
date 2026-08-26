const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');

function createElement(id, dataset = {}) {
  const listeners = new Map(), classes = new Set(), attributes = new Map();
  return {
    id, dataset, value: '100', checked: false, textContent: '', tagName: id.startsWith('audio-') ? 'INPUT' : 'BUTTON',
    classList: {
      toggle(name, force) {
        const enabled = force === undefined ? !classes.has(name) : Boolean(force);
        if (enabled) classes.add(name); else classes.delete(name);
        return enabled;
      },
      contains: (name) => classes.has(name),
    },
    setAttribute: (name, value) => attributes.set(name, String(value)),
    getAttribute: (name) => attributes.get(name) || null,
    addEventListener(type, listener) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(listener);
    },
    dispatch(type, event = {}) { for (const listener of listeners.get(type) || []) listener({ target: this, ...event }); },
    querySelectorAll: () => [],
    offsetParent: {},
    focus() {},
  };
}

function createSettingsContext() {
  const documentListeners = new Map(), storage = new Map();
  const elements = new Map();
  ['settings-overlay', 'settings-panel', 'settings-open', 'settings-close', 'settings-reset',
    'settings-home', 'settings-audio-view', 'settings-character-view', 'settings-intro'].forEach((id) => elements.set(id, createElement(id)));
  const pageButtons = ['audio', 'characters'].map((page) => createElement(`settings-page-${page}`, { settingsPage: page }));
  const backButtons = [createElement('settings-back-audio'), createElement('settings-back-characters')];
  const controls = ['master', 'music', 'sfx', 'ui', 'ambient', 'muted'].map((name) => {
    const element = createElement(`audio-${name}`, { audioSetting: name });
    if (name === 'muted') element.tagName = 'INPUT';
    elements.set(element.id, element);
    if (name !== 'muted') elements.set(`${element.id}-value`, createElement(`${element.id}-value`));
    return element;
  });
  const context = {
    console,
    localStorage: {
      getItem: (key) => storage.get(key) || null,
      setItem: (key, value) => storage.set(key, String(value)),
    },
    addEventListener() {},
    document: {
      activeElement: null,
      getElementById: (id) => elements.get(id) || null,
      querySelectorAll: (selector) => selector === '[data-audio-setting]' ? controls
        : selector === '[data-settings-page]' ? pageButtons
          : selector === '[data-settings-back]' ? backButtons : [],
      addEventListener(type, listener) {
        if (!documentListeners.has(type)) documentListeners.set(type, []);
        documentListeners.get(type).push(listener);
      },
    },
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(read('js/audio-config.js'), context, { filename: 'js/audio-config.js' });
  vm.runInContext(read('js/audio-manager.js'), context, { filename: 'js/audio-manager.js' });
  vm.runInContext(read('js/audio-settings-ui.js'), context, { filename: 'js/audio-settings-ui.js' });
  const keydown = (key) => {
    const event = { key, target: { tagName: 'BODY' }, preventDefault() { this.prevented = true; },
      stopPropagation() { this.stopped = true; } };
    for (const listener of documentListeners.get('keydown') || []) listener(event);
    return event;
  };
  return { context, elements, pageButtons, backButtons, keydown };
}

test('shared Settings opens with O, closes with O/Escape, and owns the modal layer', () => {
  const { context, elements, keydown } = createSettingsContext();
  const overlay = elements.get('settings-overlay'), openButton = elements.get('settings-open');
  assert.equal(context.SettingsUI.isOpen(), false);

  const openEvent = keydown('o');
  assert.equal(openEvent.prevented, true);
  assert.equal(openEvent.stopped, true);
  assert.equal(context.SettingsUI.isOpen(), true);
  assert.equal(overlay.classList.contains('is-open'), true);
  assert.equal(overlay.getAttribute('aria-hidden'), 'false');
  assert.equal(openButton.getAttribute('aria-expanded'), 'true');

  keydown('O');
  assert.equal(context.SettingsUI.isOpen(), false);
  context.SettingsUI.open();
  keydown('Escape');
  assert.equal(context.SettingsUI.isOpen(), false);
});

test('Settings uses a two-level menu for Audio and Character switching', () => {
  const { context, elements, pageButtons, backButtons } = createSettingsContext();
  context.SettingsUI.open();
  assert.equal(context.SettingsUI.currentPage(), 'home');
  assert.equal(elements.get('settings-reset').classList.contains('settings-page-hidden'), true);

  pageButtons.find((button) => button.dataset.settingsPage === 'audio').dispatch('click');
  assert.equal(context.SettingsUI.currentPage(), 'audio');
  assert.equal(elements.get('settings-audio-view').classList.contains('settings-page-hidden'), false);
  assert.equal(elements.get('settings-reset').classList.contains('settings-page-hidden'), false);

  backButtons[0].dispatch('click');
  pageButtons.find((button) => button.dataset.settingsPage === 'characters').dispatch('click');
  assert.equal(context.SettingsUI.currentPage(), 'characters');
  assert.equal(elements.get('settings-character-view').classList.contains('settings-page-hidden'), false);
  assert.equal(elements.get('settings-reset').classList.contains('settings-page-hidden'), true);
});

test('index exposes a general Settings shell and keeps it above mobile Back', () => {
  const html = read('index.html');
  assert.match(html, /id="settings-open"[^>]*aria-keyshortcuts="O"/);
  assert.match(html, /#settings-open\.game-ui-hidden\{[^}]*visibility:hidden[^}]*pointer-events:none/);
  assert.match(html, /data-settings-page="audio"[\s\S]*data-settings-page="characters"/);
  assert.match(html, /id="settings-character-view"[\s\S]*id="character-slots"/);
  assert.match(html, /tối đa 3 nhân vật/i);
  assert.match(html, /id="settings-panel"[\s\S]*id="settings-audio-title"/);
  assert.match(html, /id="character-creator-view"[\s\S]*data-character-gender="female"[\s\S]*data-character-appearance="blue"/);
  assert.match(html, /id="onboarding-overlay"[\s\S]*id="onboarding-progress"/);
  const backZ = Number(html.match(/#touch-back\{[^}]*z-index:(\d+)/)?.[1]);
  const overlayZ = Number(html.match(/#settings-overlay\{[^}]*z-index:(\d+)/)?.[1]);
  assert.ok(overlayZ > backZ, 'Settings modal must block mobile Back and every underlying game control');
});
