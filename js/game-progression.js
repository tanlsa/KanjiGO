(function () {
  function mpFloorOfLevel(thresholds, maxLevel, level) {
    const current = Math.max(1, Math.min(maxLevel, Math.floor(Number(level) || 1)));
    return Math.max(0, Number(thresholds[current]) || 0);
  }

  function levelFromMp(thresholds, maxLevel, mp) {
    const value = Math.max(0, Number(mp) || 0); let level = 1;
    for (let candidate = 2; candidate <= maxLevel; candidate++) {
      if (value < mpFloorOfLevel(thresholds, maxLevel, candidate)) break;
      level = candidate;
    }
    return level;
  }

  function gymGrade(ratio) {
    if (ratio >= 1) return 'S';
    if (ratio >= .8) return 'A';
    if (ratio >= .5) return 'B';
    if (ratio >= .25) return 'C';
    return 'D';
  }

  function createSaveQueue({ write, snapshot, setTimer = setTimeout, clearTimer = clearTimeout, delayMs = 120 }) {
    let timer = null, dirty = false, writes = 0;
    const flush = () => {
      if (timer !== null) { clearTimer(timer); timer = null; }
      if (!dirty) return false;
      try {
        const payload = JSON.stringify(snapshot());
        write(payload); dirty = false; writes++; return true;
      } catch (error) {
        // Keep the queue dirty so a transient storage/quota failure never
        // silently discards the latest learning state.
        dirty = true; return false;
      }
    };
    const schedule = () => {
      dirty = true;
      if (timer === null) timer = setTimer(flush, Math.max(0, Number(delayMs) || 0));
      return true;
    };
    return Object.freeze({ schedule, flush, pending: () => dirty, writeCount: () => writes });
  }

  window.KanjiGOProgression = Object.freeze({ mpFloorOfLevel, levelFromMp, gymGrade, createSaveQueue });
})();
