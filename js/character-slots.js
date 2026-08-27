// ============================================================
//  CHARACTER-SLOTS.JS — 3 hồ sơ, tạo nhân vật và onboarding.
// ============================================================
(function () {
  const STORAGE_KEY = 'KANJIGO_CHARACTER_SLOTS_V1';
  const LEARNING_KEY = 'KANJIGO_LEARNING_V1';
  const GAME_KEY = 'KANJIGO_GAME_V1';
  const MAX_SLOTS = 3;
  const GENDERS = ['male', 'female', 'neutral'];
  const APPEARANCES = ['orange', 'blue'];
  const GENDER_LABELS = { male: 'Nam', female: 'Nữ', neutral: 'Tự do' };
  // Keep the persisted `blue` value for existing character saves; the visual
  // option is now the approved dark-green FPT/GHC polo uniform.
  const APPEARANCE_LABELS = { orange: 'Polo cam FSoft', blue: 'Polo xanh FSoft' };
  const ONBOARDING_STEPS = 4;
  const FALLBACK_STARTERS = [
    { char: '一', hanViet: 'NHẤT', meaning: 'một', reading: 'いち' },
    { char: '日', hanViet: 'NHẬT', meaning: 'ngày / mặt trời', reading: 'にち' },
    { char: '人', hanViet: 'NHÂN', meaning: 'người', reading: 'ひと' },
  ];
  let beforeSwitch = null;
  let onboardingFinished = null;
  let statusMessage = '';
  let creatorDraft = null;

  function safeParse(value) {
    try { return JSON.parse(value || 'null'); } catch (error) { return null; }
  }
  function readStorage(key) {
    try { return localStorage.getItem(key); } catch (error) { return null; }
  }
  function cleanName(value, fallback) {
    const name = String(value || '').replace(/\s+/g, ' ').trim().slice(0, 24);
    return name || fallback;
  }
  function cleanGender(value) { return GENDERS.includes(value) ? value : 'neutral'; }
  function cleanAppearance(value) { return APPEARANCES.includes(value) ? value : 'orange'; }
  function starterChoices() {
    const configured = window.CONFIG && window.CONFIG.ONBOARDING && window.CONFIG.ONBOARDING.starterKanji;
    const source = Array.isArray(configured) && configured.length ? configured : FALLBACK_STARTERS;
    return source.filter((entry) => entry && typeof entry.char === 'string' && entry.char.trim()).map((entry) => ({
      char: entry.char.trim(), hanViet: String(entry.hanViet || '').trim(), meaning: String(entry.meaning || '').trim(),
      reading: String(entry.reading || '').trim(),
    }));
  }
  function cleanStarterKanji(value) {
    const char = String(value || '').trim();
    return starterChoices().some((entry) => entry.char === char) ? char : '';
  }
  function defaultSlot(id, now = Date.now(), options = {}) {
    const sandbox = options.sandbox === true;
    const onboardingComplete = options.onboardingComplete === true || sandbox;
    return {
      id,
      name: cleanName(options.name, sandbox ? 'Tester KanjiGO' : `Nhân vật ${id}`),
      gender: cleanGender(options.gender),
      appearance: cleanAppearance(options.appearance),
      sandbox,
      starterKanji: cleanStarterKanji(options.starterKanji),
      onboardingComplete,
      onboardingIntroComplete: options.onboardingIntroComplete === true || onboardingComplete,
      onboardingStep: Math.max(0, Math.min(ONBOARDING_STEPS - 1, Math.floor(Number(options.onboardingStep)) || 0)),
      onboardingTourStep: Math.max(0, Math.floor(Number(options.onboardingTourStep)) || 0),
      createdAt: Math.max(0, Number(options.createdAt) || now),
      lastPlayedAt: Math.max(0, Number(options.lastPlayedAt) || now),
    };
  }
  function normalizeState(raw) {
    const source = raw && typeof raw === 'object' ? raw : {};
    const sourceVersion = Math.max(0, Math.floor(Number(source.version) || 0));
    const legacy = sourceVersion < 2;
    const slots = [], seen = new Set();
    for (const value of Array.isArray(source.slots) ? source.slots : []) {
      const id = Math.floor(Number(value && value.id));
      if (id < 1 || id > MAX_SLOTS || seen.has(id)) continue;
      seen.add(id);
      slots.push(defaultSlot(id, Date.now(), {
        ...value,
        sandbox: value.sandbox === true || (legacy && id === 1),
        onboardingComplete: typeof value.onboardingComplete === 'boolean' ? value.onboardingComplete : legacy,
      }));
    }
    if (!slots.length) slots.push(defaultSlot(1, Date.now(), {
      name: 'Tester KanjiGO', gender: 'neutral', appearance: 'orange', sandbox: true, onboardingComplete: true,
    }));
    slots.sort((a, b) => a.id - b.id);
    const requested = Math.floor(Number(source.activeSlot));
    const activeSlot = slots.some((slot) => slot.id === requested) ? requested : slots[0].id;
    return { version: 2, activeSlot, slots };
  }
  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); return true; }
    catch (error) { return false; }
  }
  function storageKey(baseKey, slotId = state.activeSlot) {
    const id = Math.max(1, Math.min(MAX_SLOTS, Math.floor(Number(slotId)) || 1));
    return id === 1 ? baseKey : `${baseKey}__CHARACTER_${id}`;
  }
  function active() {
    const slot = state.slots.find((value) => value.id === state.activeSlot);
    return slot ? { ...slot } : null;
  }
  function slots() { return state.slots.map((slot) => ({ ...slot })); }
  function flushCurrent() {
    try { return typeof beforeSwitch !== 'function' || beforeSwitch() !== false; } catch (error) {
      console.warn('[KanjiGO] Không thể lưu nhân vật hiện tại trước khi chuyển.', error);
      return false;
    }
  }
  function reloadGame() {
    if (window.location && typeof window.location.reload === 'function') window.location.reload();
  }
  function findFreeSlot() {
    for (let id = 1; id <= MAX_SLOTS; id++) if (!state.slots.some((slot) => slot.id === id)) return id;
    return null;
  }
  function rename(id, name) {
    const slot = state.slots.find((value) => value.id === Number(id));
    if (!slot) return { ok: false, reason: 'missing' };
    const nextName = cleanName(name, '');
    if (!nextName) return { ok: false, reason: 'name' };
    slot.name = nextName; saveState(); refreshSettings(`Đã đổi tên thành “${nextName}”.`);
    return { ok: true, slot: { ...slot } };
  }
  function updateProfile(id, profile = {}) {
    const slot = state.slots.find((value) => value.id === Number(id));
    if (!slot) return { ok: false, reason: 'missing' };
    const nextName = cleanName(profile.name, '');
    if (!nextName) return { ok: false, reason: 'name' };
    const activeEdit = slot.id === state.activeSlot;
    if (activeEdit && !flushCurrent()) return { ok: false, reason: 'busy' };
    slot.name = nextName;
    slot.gender = cleanGender(profile.gender);
    slot.appearance = cleanAppearance(profile.appearance);
    saveState();
    if (activeEdit) reloadGame(); else { showCharacterList(); refreshSettings(`Đã cập nhật “${nextName}”.`); }
    return { ok: true, slot: { ...slot } };
  }
  function switchTo(id) {
    const slot = state.slots.find((value) => value.id === Number(id));
    if (!slot) return { ok: false, reason: 'missing' };
    if (slot.id === state.activeSlot) return { ok: false, reason: 'active' };
    if (!flushCurrent()) return { ok: false, reason: 'busy' };
    const current = state.slots.find((value) => value.id === state.activeSlot), now = Date.now();
    if (current) current.lastPlayedAt = now;
    slot.lastPlayedAt = now; state.activeSlot = slot.id; saveState(); reloadGame();
    return { ok: true, slot: { ...slot } };
  }
  function create(name, profile = {}) {
    const requestedId = Math.floor(Number(profile.slotId));
    const id = requestedId >= 1 && requestedId <= MAX_SLOTS && !state.slots.some((slot) => slot.id === requestedId)
      ? requestedId : findFreeSlot();
    if (!id) return { ok: false, reason: 'full' };
    const nextName = cleanName(name, `Nhân vật ${id}`);
    if (!flushCurrent()) return { ok: false, reason: 'busy' };
    const current = state.slots.find((value) => value.id === state.activeSlot), now = Date.now();
    if (current) current.lastPlayedAt = now;
    const slot = defaultSlot(id, now, {
      name: nextName, gender: profile.gender, appearance: profile.appearance,
      sandbox: false, onboardingComplete: false,
    });
    state.slots.push(slot); state.slots.sort((a, b) => a.id - b.id); state.activeSlot = id;
    saveState(); reloadGame();
    return { ok: true, slot: { ...slot } };
  }
  function remove(id) {
    const slotId = Number(id), slot = state.slots.find((value) => value.id === slotId);
    if (!slot) return { ok: false, reason: 'missing' };
    if (state.slots.length <= 1) return { ok: false, reason: 'last' };
    const wasActive = state.activeSlot === slotId;
    if (wasActive && !flushCurrent()) return { ok: false, reason: 'busy' };
    for (const baseKey of [LEARNING_KEY, GAME_KEY]) {
      try { localStorage.removeItem(storageKey(baseKey, slotId)); } catch (error) { /* storage optional */ }
    }
    state.slots = state.slots.filter((value) => value.id !== slotId);
    if (wasActive) state.activeSlot = state.slots[0].id;
    saveState();
    if (wasActive) reloadGame(); else refreshSettings(`Đã xoá “${slot.name}”.`);
    return { ok: true, removed: { ...slot }, activeSlot: state.activeSlot };
  }
  function slotSummary(id) {
    const learning = safeParse(readStorage(storageKey(LEARNING_KEY, id))) || {};
    const mastery = learning.mastery && typeof learning.mastery === 'object' ? Object.values(learning.mastery) : [];
    const captured = mastery.filter((entry) => entry && entry.captured === true);
    const levels = captured.reduce((total, entry) => total + Math.max(1, Number(entry.level) || 1), 0);
    const badges = learning.badges && typeof learning.badges === 'object'
      ? Object.values(learning.badges).filter(Boolean).length : 0;
    return { captured: captured.length, levels, badges };
  }
  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  }
  function avatarMarkup(slot, className = 'character-avatar') {
    return `<span class="${className} gender-${cleanGender(slot.gender)} appearance-${cleanAppearance(slot.appearance)}" aria-hidden="true"></span>`;
  }
  function slotMarkup(id) {
    const slot = state.slots.find((value) => value.id === id);
    if (!slot) return `<article class="character-slot is-empty" data-character-slot="${id}">
      <div class="character-slot-heading"><strong>Slot ${id}</strong><span>Trống</span></div>
      <div class="character-empty-copy"><strong>Hành trình mới</strong><small>Tạo học giả Kanji mới</small></div>
      <div class="character-slot-actions"><button type="button" data-character-action="create" data-slot="${id}">＋ Tạo nhân vật</button></div>
    </article>`;
    const summary = slotSummary(id), isActive = id === state.activeSlot;
    return `<article class="character-slot${isActive ? ' is-active' : ''}" data-character-slot="${id}">
      ${avatarMarkup(slot)}
      <div class="character-slot-copy">
        <div class="character-slot-heading"><strong>${escapeHtml(slot.name)}</strong><span>${isActive ? '● Đang chơi' : `Slot ${id}`}</span></div>
        <p>${GENDER_LABELS[slot.gender]} · ${APPEARANCE_LABELS[slot.appearance]}</p>
        <p><b>${summary.captured}</b> Kanji · tổng <b>${summary.levels}</b> cấp · <b>${summary.badges}</b> huy hiệu${slot.sandbox ? ' · SANDBOX' : ''}</p>
      </div>
      <div class="character-slot-actions">
        ${isActive ? '' : `<button type="button" data-character-action="switch" data-slot="${id}">Chọn</button>`}
        <button type="button" class="secondary" data-character-action="edit" data-slot="${id}">Ngoại hình</button>
        ${state.slots.length > 1 ? `<button type="button" class="danger" data-character-action="delete" data-slot="${id}">Xoá</button>` : ''}
      </div>
    </article>`;
  }
  function showResult(result) {
    if (!result || result.ok) return;
    if (result.reason === 'busy') refreshSettings('Hãy hoàn thành hoặc rời trận đấu trước khi chuyển nhân vật.');
    if (result.reason === 'name') refreshSettings('Tên nhân vật không được để trống.');
  }
  function refreshSettings(message = '') {
    if (message) statusMessage = message;
    const container = document.getElementById('character-slots');
    const status = document.getElementById('character-slot-status');
    if (!container) return;
    container.innerHTML = Array.from({ length: MAX_SLOTS }, (_, index) => slotMarkup(index + 1)).join('');
    if (status) status.textContent = statusMessage;
    container.querySelectorAll('[data-character-action]').forEach((button) => {
      button.addEventListener('click', () => {
        const id = Number(button.dataset.slot), action = button.dataset.characterAction;
        if (action === 'create' || action === 'edit') { openCreator(id); return; }
        if (action === 'switch') showResult(switchTo(id));
        if (action === 'delete') {
          const slot = state.slots.find((value) => value.id === id);
          if (slot && (!window.confirm || window.confirm(`Xoá “${slot.name}” và toàn bộ tiến độ của nhân vật này?`))) showResult(remove(id));
        }
      });
    });
  }

  function syncCreatorUi() {
    if (!creatorDraft) return;
    const title = document.getElementById('character-creator-title');
    const name = document.getElementById('character-creator-name');
    const preview = document.getElementById('character-creator-avatar');
    const save = document.getElementById('character-creator-save');
    if (title) title.textContent = creatorDraft.edit ? 'Chỉnh sửa nhân vật' : 'Tạo nhân vật mới';
    if (name) name.value = creatorDraft.name;
    if (preview) preview.className = `character-creator-avatar gender-${creatorDraft.gender} appearance-${creatorDraft.appearance}`;
    if (save) save.textContent = creatorDraft.edit ? 'Lưu thay đổi' : 'Tạo & bắt đầu';
    document.querySelectorAll?.('[data-character-gender]').forEach((button) => {
      button.classList.toggle('selected', button.dataset.characterGender === creatorDraft.gender);
    });
    document.querySelectorAll?.('[data-character-appearance]').forEach((button) => {
      button.classList.toggle('selected', button.dataset.characterAppearance === creatorDraft.appearance);
    });
  }
  function openCreator(id) {
    const slot = state.slots.find((value) => value.id === Number(id));
    creatorDraft = {
      id: Number(id), edit: Boolean(slot), name: slot ? slot.name : `Nhân vật ${id}`,
      gender: slot ? slot.gender : 'male', appearance: slot ? slot.appearance : 'orange',
    };
    document.getElementById('character-list-view')?.classList.add('settings-page-hidden');
    document.getElementById('character-creator-view')?.classList.remove('settings-page-hidden');
    syncCreatorUi();
    document.getElementById('character-creator-name')?.focus();
  }
  function showCharacterList() {
    creatorDraft = null;
    document.getElementById('character-creator-view')?.classList.add('settings-page-hidden');
    document.getElementById('character-list-view')?.classList.remove('settings-page-hidden');
    refreshSettings();
  }
  function bindCreator() {
    const nameInput = document.getElementById('character-creator-name');
    const preserveTypedName = () => {
      if (creatorDraft && nameInput) creatorDraft.name = nameInput.value;
    };
    nameInput?.addEventListener('input', preserveTypedName);
    document.querySelectorAll?.('[data-character-gender]').forEach((button) => {
      button.addEventListener('click', () => { if (creatorDraft) { preserveTypedName(); creatorDraft.gender = cleanGender(button.dataset.characterGender); syncCreatorUi(); } });
    });
    document.querySelectorAll?.('[data-character-appearance]').forEach((button) => {
      button.addEventListener('click', () => { if (creatorDraft) { preserveTypedName(); creatorDraft.appearance = cleanAppearance(button.dataset.characterAppearance); syncCreatorUi(); } });
    });
    document.getElementById('character-creator-cancel')?.addEventListener('click', showCharacterList);
    document.getElementById('character-creator-save')?.addEventListener('click', () => {
      if (!creatorDraft) return;
      const input = document.getElementById('character-creator-name');
      const profile = { name: input && input.value, gender: creatorDraft.gender, appearance: creatorDraft.appearance };
      showResult(creatorDraft.edit ? updateProfile(creatorDraft.id, profile) : create(profile.name, { ...profile, slotId: creatorDraft.id }));
    });
  }

  function isOnboarding() {
    const slot = state.slots.find((value) => value.id === state.activeSlot);
    return Boolean(slot && !slot.onboardingComplete);
  }
  function isOnboardingBlocking() {
    const slot = state.slots.find((value) => value.id === state.activeSlot);
    return Boolean(slot && !slot.onboardingComplete && !slot.onboardingIntroComplete);
  }
  function onboardingCopy(step, slot) {
    if (step === 0) return {
      eyebrow: 'CHÀO MỪNG ĐẾN KANJIGO', title: `Xin chào, ${escapeHtml(slot.name)}!`,
      body: 'Bạn sẽ khám phá thế giới Kanji, kết bạn với các linh thú chữ Hán và biến việc ôn tập thành một hành trình RPG.',
      hint: `${GENDER_LABELS[slot.gender]} · ${APPEARANCE_LABELS[slot.appearance]}`,
    };
    if (step === 1) return {
      eyebrow: 'BƯỚC 1 · KANJI ĐẦU TIÊN', title: 'Bạn muốn bắt đầu với chữ nào?',
      body: 'Chọn một chữ tạo ấn tượng đầu tiên. Cô Aoi sẽ dẫn bạn tới Giảng đường và mở thẳng Learning Card của chữ đó.',
      hint: 'Bạn vẫn có thể học toàn bộ chữ còn lại sau đó — lựa chọn này không khóa lộ trình.',
    };
    if (step === 2) return {
      eyebrow: 'BƯỚC 2 · DI CHUYỂN', title: 'Đi theo cô Aoi trên bản đồ',
      body: 'Dùng phím mũi tên để di chuyển. Đến gần Aoi và nhấn Space để nghe giới thiệu. HUD luôn hiển thị chặng tiếp theo và hướng cần đi.',
      hint: 'Trên điện thoại, dùng cụm điều hướng bên trái và nút SPACE bên phải.',
    };
    return {
      eyebrow: 'BƯỚC 3 · TOUR NHẬP MÔN', title: `Hành trình với chữ 「${slot.starterKanji || '？'}」 bắt đầu!`,
      body: 'Aoi sẽ lần lượt đưa bạn qua Giảng đường, Wilderness và Trainer Arena. Mỗi chặng chỉ hoàn tất khi bạn thật sự tới nơi và trò chuyện với cô ấy.',
      hint: 'Giảng đường học chữ mới → Wilderness ôn luyện → Arena kiểm tra theo chủ đề.',
    };
  }
  function renderOnboarding() {
    const overlay = document.getElementById('onboarding-overlay');
    const slot = state.slots.find((value) => value.id === state.activeSlot);
    if (!overlay || !slot) return;
    const open = !slot.onboardingComplete && !slot.onboardingIntroComplete;
    const step = Math.max(0, Math.min(ONBOARDING_STEPS - 1, slot.onboardingStep));
    overlay.classList.toggle('is-open', open); overlay.setAttribute('aria-hidden', String(!open));
    if (!open) return;
    const copy = onboardingCopy(step, slot);
    const avatar = document.getElementById('onboarding-avatar');
    if (avatar) avatar.className = `onboarding-avatar gender-${slot.gender} appearance-${slot.appearance}`;
    const eyebrow = document.getElementById('onboarding-eyebrow'); if (eyebrow) eyebrow.textContent = copy.eyebrow;
    const title = document.getElementById('onboarding-title'); if (title) title.innerHTML = copy.title;
    const body = document.getElementById('onboarding-copy'); if (body) body.textContent = copy.body;
    const hint = document.getElementById('onboarding-hint'); if (hint) hint.textContent = copy.hint;
    const choices = document.getElementById('onboarding-kanji-options');
    if (choices) {
      choices.classList.toggle('is-open', step === 1);
      choices.innerHTML = step === 1 ? starterChoices().map((entry, index) => `<button type="button" class="onboarding-kanji-choice${slot.starterKanji === entry.char ? ' selected' : ''}" data-starter-kanji="${escapeHtml(entry.char)}" role="radio" aria-checked="${slot.starterKanji === entry.char}"><strong>${escapeHtml(entry.char)}</strong><b>${escapeHtml(entry.hanViet)}</b><small>${escapeHtml(entry.reading)} · ${escapeHtml(entry.meaning)}</small><span class="sr-only">Lựa chọn ${index + 1}</span></button>`).join('') : '';
      choices.querySelectorAll?.('[data-starter-kanji]').forEach((button) => {
        button.addEventListener('click', () => selectStarterKanji(button.dataset.starterKanji));
      });
    }
    const progress = document.getElementById('onboarding-progress');
    if (progress) progress.innerHTML = Array.from({ length: ONBOARDING_STEPS }, (_, index) => `<i class="${index <= step ? 'active' : ''}"></i>`).join('');
    const back = document.getElementById('onboarding-back'); if (back) back.disabled = step === 0;
    const next = document.getElementById('onboarding-next');
    if (next) {
      next.textContent = step === ONBOARDING_STEPS - 1 ? 'Gặp cô Aoi' : 'Tiếp tục';
      next.disabled = step === 1 && !slot.starterKanji;
    }
  }
  function selectStarterKanji(value) {
    const slot = state.slots.find((entry) => entry.id === state.activeSlot), char = cleanStarterKanji(value);
    if (!slot || slot.onboardingComplete || slot.onboardingIntroComplete || !char) return false;
    slot.starterKanji = char; saveState(); renderOnboarding(); return true;
  }
  function onboardingMove(delta) {
    const slot = state.slots.find((value) => value.id === state.activeSlot);
    if (!slot || slot.onboardingComplete || slot.onboardingIntroComplete) return false;
    if (delta > 0 && slot.onboardingStep === 1 && !slot.starterKanji) return false;
    if (delta > 0 && slot.onboardingStep >= ONBOARDING_STEPS - 1) {
      slot.onboardingIntroComplete = true; slot.onboardingStep = ONBOARDING_STEPS - 1; saveState(); renderOnboarding();
      if (typeof onboardingFinished === 'function') onboardingFinished({ ...slot });
      return true;
    }
    slot.onboardingStep = Math.max(0, Math.min(ONBOARDING_STEPS - 1, slot.onboardingStep + delta));
    saveState(); renderOnboarding(); return true;
  }
  function bindOnboarding() {
    document.getElementById('onboarding-back')?.addEventListener('click', () => onboardingMove(-1));
    document.getElementById('onboarding-next')?.addEventListener('click', () => onboardingMove(1));
    document.addEventListener?.('keydown', (event) => {
      if (!isOnboardingBlocking()) return;
      if (/^[1-3]$/.test(event.key) && state.slots.find((value) => value.id === state.activeSlot)?.onboardingStep === 1) {
        const choice = starterChoices()[Number(event.key) - 1];
        if (choice) { event.preventDefault(); event.stopImmediatePropagation?.(); selectStarterKanji(choice.char); }
        return;
      }
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopImmediatePropagation?.(); onboardingMove(1); }
      if (event.key === 'ArrowLeft' || event.key === 'Backspace') { event.preventDefault(); event.stopImmediatePropagation?.(); onboardingMove(-1); }
    });
  }
  function setOnboardingTourStep(value) {
    const slot = state.slots.find((entry) => entry.id === state.activeSlot);
    if (!slot || slot.onboardingComplete || !slot.onboardingIntroComplete) return false;
    slot.onboardingTourStep = Math.max(0, Math.floor(Number(value)) || 0); saveState(); return true;
  }
  function completeOnboarding() {
    const slot = state.slots.find((entry) => entry.id === state.activeSlot);
    if (!slot || slot.onboardingComplete) return false;
    slot.onboardingComplete = true; slot.onboardingIntroComplete = true; saveState(); renderOnboarding();
    return true;
  }

  let state = normalizeState(safeParse(readStorage(STORAGE_KEY)));
  const activeSlot = state.slots.find((slot) => slot.id === state.activeSlot);
  if (activeSlot) activeSlot.lastPlayedAt = Date.now();
  saveState();

  window.KanjiGOCharacters = {
    maxSlots: MAX_SLOTS,
    storageKey,
    active,
    slots,
    create,
    rename,
    updateProfile,
    switchTo,
    remove,
    summary: slotSummary,
    refreshSettings,
    openCreator,
    showCharacterList,
    isOnboarding,
    isOnboardingBlocking,
    onboardingMove,
    selectStarterKanji,
    setOnboardingTourStep,
    completeOnboarding,
    renderOnboarding,
    setBeforeSwitch(callback) { beforeSwitch = typeof callback === 'function' ? callback : null; },
    setOnboardingFinished(callback) { onboardingFinished = typeof callback === 'function' ? callback : null; },
  };
  bindCreator(); bindOnboarding(); refreshSettings(); renderOnboarding();
})();
