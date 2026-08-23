const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');

function loadDataContext() {
  const storage = new Map();
  const context = {
    console,
    localStorage: {
      getItem: (key) => storage.has(key) ? storage.get(key) : null,
      setItem: (key, value) => storage.set(key, String(value)),
      removeItem: (key) => storage.delete(key),
    },
  };
  context.window = context;
  vm.createContext(context);
  for (const file of ['js/content-catalog.js', 'js/config.js', 'js/kanji.js', 'js/data-loader.js', 'js/map.js']) {
    vm.runInContext(read(file), context, { filename: file });
  }
  return context;
}

function parseSimpleCsv(file, expectedColumns) {
  return read(file).trim().split(/\r?\n/).slice(1).filter(Boolean).map((line, index) => {
    const cells = line.split(',');
    assert.equal(cells.length, expectedColumns, `${file}:${index + 2} must have ${expectedColumns} columns`);
    return cells;
  });
}

function pngInfo(file) {
  const data = fs.readFileSync(path.join(ROOT, file));
  assert.deepEqual([...data.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], `${file} is not a PNG`);
  return { width: data.readUInt32BE(16), height: data.readUInt32BE(20), colorType: data[25] };
}

test('all JavaScript and inline HTML scripts compile', () => {
  const jsFiles = fs.readdirSync(path.join(ROOT, 'js')).filter((name) => name.endsWith('.js'));
  for (const name of jsFiles) assert.doesNotThrow(() => new vm.Script(read(`js/${name}`), { filename: name }));
  for (const htmlFile of ['index.html', 'admin.html']) {
    const html = read(htmlFile);
    const blocks = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map((match) => match[1]).filter((code) => code.trim());
    blocks.forEach((code, index) => assert.doesNotThrow(() => new vm.Script(code, { filename: `${htmlFile}#script-${index + 1}` })));
    assert.match(html.trimEnd(), /<\/html>$/i, `${htmlFile} contains content after </html>`);
  }
});

test('canonical curriculum matches the source list and has no duplicates', () => {
  const { KANJI_CATALOG: catalog } = loadDataContext();
  const source = read('KANJI-LIST.md');
  const n5 = source.match(/N5\s+([\s\S]*?)\s+N4/)[1].match(/[一-龯々]/g);
  const n4 = source.match(/N4\s+([\s\S]*)/)[1].match(/[一-龯々]/g);
  assert.deepEqual([...catalog.tiers.N5.kanji], n5);
  assert.deepEqual([...catalog.tiers.N4.kanji], n4);
  assert.equal(new Set([...n5, ...n4, ...catalog.bonus]).size, n5.length + n4.length + catalog.bonus.length);
  assert.equal(n5.length, 79);
  assert.equal(n4.length, 140);
});

test('every curriculum Kanji has metadata, questions, monster config, and a transparent sprite', () => {
  const { CONFIG, KANJI_DB, KANJI_CATALOG } = loadDataContext();
  const chars = [...KANJI_CATALOG.tiers.N5.kanji, ...KANJI_CATALOG.tiers.N4.kanji, ...KANJI_CATALOG.bonus];
  const byChar = new Map(Object.values(KANJI_DB.KANJI).map((info) => [info.char, info]));
  assert.equal(byChar.size, Object.keys(KANJI_DB.KANJI).length, 'Kanji metadata contains duplicate chars');

  for (const char of chars) {
    const info = byChar.get(char);
    assert.ok(info, `missing metadata for ${char}`);
    const monster = CONFIG.MONSTERS[info.monId];
    assert.ok(monster, `${char} references missing monster ${info.monId}`);
    assert.equal(monster.kanji, char, `${info.monId} uses the wrong Kanji`);
    assert.ok(monster.name && monster.maxHp > 0 && monster.atk[0] > 0 && monster.atk[1] >= monster.atk[0], `${info.monId} has invalid stats`);
    assert.ok(fs.existsSync(path.join(ROOT, monster.img)), `missing sprite ${monster.img}`);
    const png = pngInfo(monster.img);
    assert.ok(png.width > 0 && png.height > 0, `${monster.img} has invalid dimensions`);
    assert.ok([4, 6].includes(png.colorType), `${monster.img} must contain an alpha channel`);
    assert.ok(KANJI_DB.QUESTIONS.filter((question) => question.target === char).length >= 2, `${char} needs at least two questions`);
  }
});

test('question data is internally consistent and supports vocabulary highlighting', () => {
  const { KANJI_DB } = loadDataContext();
  const chars = new Set(Object.values(KANJI_DB.KANJI).map((info) => info.char));
  const keys = new Set();
  for (const [index, q] of KANJI_DB.QUESTIONS.entries()) {
    const label = `question ${index + 1} (${q.word}/${q.target})`;
    assert.ok(chars.has(q.target), `${label} targets unknown Kanji`);
    assert.ok(q.word.includes(q.target), `${label} word does not contain target`);
    assert.ok(q.answer && q.romaji && q.mean && q.wordReading && q.wordRomaji, `${label} has an empty learning field`);
    assert.ok(['on', 'kun'].includes(q.type), `${label} has invalid reading type`);
    assert.ok(Array.isArray(q.parts) && q.parts.length > 0, `${label} has no vocabulary parts`);
    assert.equal(q.parts.map((part) => part.text).join(''), q.word, `${label} parts do not rebuild the word`);
    const targets = q.parts.filter((part) => part.role === 'target');
    assert.equal(targets.length, 1, `${label} must highlight exactly one target part`);
    assert.equal(targets[0].text, q.target, `${label} highlights the wrong Kanji`);
    assert.equal(targets[0].reading, q.answer, `${label} highlighted reading differs from the answer`);
    for (const part of q.parts) assert.ok(['target', 'support', 'kana'].includes(part.role), `${label} has invalid part role`);
    const key = `${q.word}|${q.target}|${q.answer}|${q.type}`;
    assert.ok(!keys.has(key), `${label} duplicates ${key}`);
    keys.add(key);
  }
  assert.ok(new Set(KANJI_DB.DISTRACTORS).size >= 4, 'reading quiz needs at least four distinct distractors');
});

test('every configured semantic monster effect is implemented by the renderer', () => {
  const { CONFIG } = loadDataContext();
  const engine = read('js/game.js');
  const explicit = new Set([...engine.matchAll(/effect\s*===\s*'([^']+)'/g)].map((match) => match[1]));
  const effects = new Set(Object.values(CONFIG.MONSTERS).map((monster) => monster.effect).filter(Boolean));
  for (const effect of effects) {
    assert.ok(explicit.has(effect) || /^orbit-\d+$/.test(effect), `monster effect "${effect}" is not rendered`);
  }
});

test('spawn pools, assets, map, and progression references are valid', () => {
  const { CONFIG, MAP_DATA, KANJI_CATALOG } = loadDataContext();
  for (const asset of Object.values(CONFIG.ASSETS)) assert.ok(fs.existsSync(path.join(ROOT, asset)), `missing asset ${asset}`);
  for (const [kind, ids] of Object.entries(CONFIG.SPAWN)) {
    assert.equal(new Set(ids).size, ids.length, `${kind} spawn pool contains duplicates`);
    ids.forEach((id) => assert.ok(CONFIG.MONSTERS[id], `${kind} spawn references missing monster ${id}`));
  }
  assert.ok(CONFIG.MONSTERS[CONFIG.PET.monId], 'starter pet is not configured');
  for (const seed of CONFIG.INITIAL_PETS) assert.ok(CONFIG.MONSTERS[seed.monId] && seed.level >= 1 && seed.level <= CONFIG.KLEVEL.maxLevel, 'invalid initial pet');
  const width = MAP_DATA.TILES[0].length;
  assert.ok(width > 0 && MAP_DATA.TILES.every((row) => row.length === width), 'map must be rectangular');
  const validTiles = new Set(Object.values(CONFIG.TILE_KEYS));
  MAP_DATA.TILES.flat().forEach((tile) => assert.ok(validTiles.has(tile), `map contains unknown tile ${tile}`));
  const spawnTile = MAP_DATA.TILES[CONFIG.PLAYER.startGy]?.[CONFIG.PLAYER.startGx];
  assert.ok(spawnTile !== undefined && !CONFIG.BLOCKED_TILES.includes(spawnTile), 'player starts outside the walkable map');
  assert.equal(MAP_DATA.TILES[CONFIG.ACADEMY.doorGy][CONFIG.ACADEMY.doorGx], CONFIG.TILE_KEYS.ACADEMY_DOOR, 'academy door config does not match map');
  for (const npc of MAP_DATA.NPCS) assert.ok(MAP_DATA.TILES[npc.gy]?.[npc.gx] !== undefined, `NPC at ${npc.gx},${npc.gy} is outside map`);
  for (const [tier, definition] of Object.entries(KANJI_CATALOG.tiers)) {
    if (definition.requiresBadge) assert.ok(CONFIG.PROGRESSION.gym[definition.requiresBadge], `${tier} requires an unconfigured badge`);
  }
});

test('CSV templates exactly mirror packaged runtime data', () => {
  const { KANJI_DB } = loadDataContext();
  const kanjiRows = parseSimpleCsv('data/kanji-template.csv', 7);
  const questionRows = parseSimpleCsv('data/questions-template.csv', 9);
  const runtimeKanji = new Set(Object.values(KANJI_DB.KANJI).map((info) => info.char));
  const runtimeQuestions = new Set(KANJI_DB.QUESTIONS.map((q) => `${q.word}|${q.target}|${q.answer}|${q.type}`));
  assert.equal(kanjiRows.length, runtimeKanji.size, 'Kanji CSV is not synchronized; run npm run sync:data');
  assert.equal(questionRows.length, runtimeQuestions.size, 'question CSV is not synchronized; run npm run sync:data');
  kanjiRows.forEach((row) => assert.ok(runtimeKanji.has(row[1]), `CSV contains unknown Kanji ${row[1]}`));
  questionRows.forEach((row) => assert.ok(runtimeQuestions.has(`${row[0]}|${row[2]}|${row[3]}|${row[5]}`), `CSV contains stale question ${row[0]}/${row[2]}`));
});

test('imported browser data merges safely without hiding packaged content', () => {
  const context = loadDataContext();
  const packagedCount = Object.keys(context.KANJI_DB.KANJI).length;
  const imported = {
    KANJI: {
      custom: { char: '々', meaning: 'lặp', on: [], kun: [], monId: '', jlpt: 'BONUS' },
    },
    QUESTIONS: [{ word: '人々', mean: 'mọi người', target: '々', answer: 'びと', romaji: 'bito', type: 'kun' }],
    DISTRACTORS: ['びと'],
  };
  context.localStorage.setItem('KANJIGO_DATA_V1', JSON.stringify(imported));
  vm.runInContext(read('js/data-loader.js'), context, { filename: 'js/data-loader.js#import-test' });
  assert.equal(Object.keys(context.KANJI_DB.KANJI).length, packagedCount + 1);
  assert.ok(context.KANJI_DB.KANJI.ri, 'packaged metadata disappeared after import');
  assert.ok(context.KANJI_DB.KANJI.custom, 'imported metadata was not merged');
  assert.equal(context.__KANJIGO_SOURCE, 'imported');
});

test('HTML loads game scripts in dependency order', () => {
  const html = read('index.html');
  const scripts = [...html.matchAll(/<script\s+src="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(scripts, ['js/content-catalog.js', 'js/config.js', 'js/kanji.js', 'js/data-loader.js', 'js/map.js', 'js/game.js']);
  assert.match(html, /<canvas\s+id="game"/);
});
