const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(ROOT, 'js/character-slots.js'), 'utf8');

function createManager(seed = {}) {
  const storage = new Map(Object.entries(seed).map(([key, value]) => [key, typeof value === 'string' ? value : JSON.stringify(value)]));
  const slotsElement = { innerHTML: '', querySelectorAll: () => [], querySelector: () => null };
  const statusElement = { textContent: '' };
  let reloads = 0;
  const context = {
    console,
    localStorage: {
      getItem: (key) => storage.has(key) ? storage.get(key) : null,
      setItem: (key, value) => storage.set(key, String(value)),
      removeItem: (key) => storage.delete(key),
    },
    document: { getElementById: (id) => id === 'character-slots' ? slotsElement : id === 'character-slot-status' ? statusElement : null },
    location: { reload: () => { reloads++; } },
    confirm: () => true,
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'js/character-slots.js' });
  return { api: context.KanjiGOCharacters, storage, slotsElement, getReloads: () => reloads };
}

test('legacy progress remains Slot 1 and up to three isolated characters can be created', () => {
  const learning = { mastery: { 日: { captured: true, level: 4 } }, badges: { N5: true } };
  const manager = createManager({ KANJIGO_LEARNING_V1: learning });
  const { api, storage } = manager;

  assert.equal(api.active().id, 1);
  assert.equal(api.active().sandbox, true);
  assert.equal(api.active().onboardingComplete, true);
  assert.equal(api.storageKey('KANJIGO_LEARNING_V1'), 'KANJIGO_LEARNING_V1');
  assert.deepEqual({ ...api.summary(1) }, { captured: 1, levels: 4, badges: 1 });
  assert.match(manager.slotsElement.innerHTML, /Tester KanjiGO/);
  assert.match(manager.slotsElement.innerHTML, /Slot 3/);

  let flushes = 0;
  api.setBeforeSwitch(() => { flushes++; });
  assert.equal(api.rename(1, 'Hikari').slot.name, 'Hikari');
  const created = api.create('Akari', { gender: 'female', appearance: 'blue' });
  assert.equal(created.slot.id, 2);
  assert.equal(created.slot.sandbox, false);
  assert.equal(created.slot.onboardingComplete, false);
  assert.equal(created.slot.gender, 'female');
  assert.equal(created.slot.appearance, 'blue');
  assert.equal(api.active().id, 2);
  assert.equal(api.storageKey('KANJIGO_LEARNING_V1'), 'KANJIGO_LEARNING_V1__CHARACTER_2');
  assert.equal(storage.has('KANJIGO_LEARNING_V1'), true, 'legacy Slot 1 data must remain untouched');
  assert.equal(api.create('Sora').slot.id, 3);
  assert.equal(api.slots().length, 3);
  assert.equal(api.create('Quá giới hạn').reason, 'full');
  assert.equal(flushes, 2);
  assert.equal(manager.getReloads(), 2);
});

test('new characters choose a starter then complete the guided onboarding tour', () => {
  const manager = createManager();
  const created = manager.api.create('Hana', { gender: 'female', appearance: 'blue' });
  assert.equal(created.ok, true);
  assert.equal(manager.api.isOnboarding(), true);
  assert.equal(manager.api.isOnboardingBlocking(), true);
  assert.equal(manager.api.onboardingMove(1), true, 'welcome advances to starter selection');
  assert.equal(manager.api.onboardingMove(1), false, 'starter selection cannot be skipped');
  assert.equal(manager.api.selectStarterKanji('日'), true);
  assert.equal(manager.api.active().starterKanji, '日');
  for (let index = 0; index < 3; index++) manager.api.onboardingMove(1);
  assert.equal(manager.api.isOnboarding(), true, 'map tour remains active after the intro overlay closes');
  assert.equal(manager.api.isOnboardingBlocking(), false, 'movement is enabled for the guided map tour');
  assert.equal(manager.api.active().onboardingIntroComplete, true);
  assert.equal(manager.api.setOnboardingTourStep(2), true);
  assert.equal(manager.api.active().onboardingTourStep, 2);
  assert.equal(manager.api.completeOnboarding(), true);
  assert.equal(manager.api.isOnboarding(), false);
  assert.equal(manager.api.active().onboardingComplete, true);

  const migrated = createManager({ KANJIGO_CHARACTER_SLOTS_V1: {
    version: 1, activeSlot: 2, slots: [{ id: 1, name: 'Cũ 1' }, { id: 2, name: 'Cũ 2' }],
  } });
  assert.equal(migrated.api.active().onboardingComplete, true);
  assert.equal(migrated.api.slots().find((slot) => slot.id === 1).sandbox, true);
  assert.equal(migrated.api.slots().find((slot) => slot.id === 2).sandbox, false);
});

test('switch and delete flush safely without leaking data between slots', () => {
  const metadata = {
    version: 1, activeSlot: 2,
    slots: [{ id: 1, name: 'Một' }, { id: 2, name: 'Hai' }, { id: 3, name: 'Ba' }],
  };
  const manager = createManager({
    KANJIGO_CHARACTER_SLOTS_V1: metadata,
    KANJIGO_LEARNING_V1__CHARACTER_2: { total: 8 },
    KANJIGO_GAME_V1__CHARACTER_2: { stamina: 2 },
  });
  let flushes = 0;
  manager.api.setBeforeSwitch(() => { flushes++; });

  assert.equal(manager.api.switchTo(1).ok, true);
  assert.equal(manager.api.active().id, 1);
  assert.equal(flushes, 1);
  assert.equal(manager.api.remove(2).ok, true);
  assert.equal(manager.storage.has('KANJIGO_LEARNING_V1__CHARACTER_2'), false);
  assert.equal(manager.storage.has('KANJIGO_GAME_V1__CHARACTER_2'), false);
  assert.equal(manager.api.slots().some((slot) => slot.id === 2), false);

  assert.equal(manager.api.remove(1).ok, true, 'active character can be removed when another slot remains');
  assert.equal(manager.api.active().id, 3);
  assert.equal(flushes, 2);
  assert.equal(manager.api.remove(3).reason, 'last', 'the final character must never be deleted');
});

test('character switching is blocked when the game cannot safely flush the active run', () => {
  const manager = createManager({
    KANJIGO_CHARACTER_SLOTS_V1: {
      version: 1, activeSlot: 1,
      slots: [{ id: 1, name: 'Một' }, { id: 2, name: 'Hai' }],
    },
  });
  manager.api.setBeforeSwitch(() => false);
  assert.equal(manager.api.switchTo(2).reason, 'busy');
  assert.equal(manager.api.create('Ba').reason, 'busy');
  assert.equal(manager.api.remove(1).reason, 'busy');
  assert.equal(manager.api.active().id, 1);
  assert.equal(manager.getReloads(), 0);
});
