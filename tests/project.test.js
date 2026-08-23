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

test('N5 Trainer Arena themes are playable with valid curriculum content', () => {
  const { CONFIG, MAP_DATA, KANJI_CATALOG, KANJI_DB } = loadDataContext();
  const arena = CONFIG.TRAINER_ARENA, trainers = arena.trainers;
  const n5 = new Set(KANJI_CATALOG.tiers.N5.kanji);
  const metadata = new Map(Object.values(KANJI_DB.KANJI).map((info) => [info.char, info]));
  const questionTargets = new Set(KANJI_DB.QUESTIONS.map((question) => question.target));
  assert.equal(trainers.length, 15);
  assert.equal(new Set(trainers.map((trainer) => trainer.id)).size, trainers.length, 'Trainer IDs must be unique');
  for (const trainer of trainers) {
    assert.ok(trainer.name && trainer.theme && trainer.icon, `${trainer.id} is missing presentation data`);
    assert.ok(trainer.kanji.length >= arena.minCollected, `${trainer.id} cannot reach its unlock requirement`);
    assert.ok(trainer.kanji.length <= 6, `${trainer.id} theme is too broad`);
    for (const char of trainer.kanji) {
      assert.ok(n5.has(char), `${trainer.id} includes non-N5 Kanji ${char}`);
      assert.ok(metadata.has(char) && questionTargets.has(char), `${trainer.id}/${char} has incomplete learning content`);
      assert.ok(CONFIG.MONSTERS[metadata.get(char).monId], `${trainer.id}/${char} has no mascot`);
    }
  }
  const trainerNpcs = MAP_DATA.NPCS.filter((npc) => npc.type === 'trainer');
  assert.equal(trainerNpcs.length, trainers.length);
  assert.deepEqual(new Set(trainerNpcs.map((npc) => npc.trainerId)), new Set(trainers.map((trainer) => trainer.id)));
  const occupied = new Set();
  for (const npc of MAP_DATA.NPCS) {
    const key = `${npc.gx},${npc.gy}`;
    assert.ok(!occupied.has(key), `multiple NPCs occupy ${key}`); occupied.add(key);
    assert.ok(!CONFIG.BLOCKED_TILES.includes(MAP_DATA.TILES[npc.gy][npc.gx]), `NPC ${key} stands on a blocked tile`);
  }
});

test('three world zones and every NPC are reachable from the campus start', () => {
  const { CONFIG, MAP_DATA } = loadDataContext();
  for (const id of ['campus', 'wilderness', 'arena']) assert.ok(MAP_DATA.AREAS[id], `missing world zone ${id}`);
  const blocked = new Set(CONFIG.BLOCKED_TILES), height = MAP_DATA.TILES.length, width = MAP_DATA.TILES[0].length;
  const start = [CONFIG.PLAYER.startGx, CONFIG.PLAYER.startGy], queue = [start], visited = new Set([start.join(',')]);
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const [x, y] = queue[cursor];
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const nx = x + dx, ny = y + dy, key = `${nx},${ny}`;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height || visited.has(key) || blocked.has(MAP_DATA.TILES[ny][nx])) continue;
      visited.add(key); queue.push([nx, ny]);
    }
  }
  const destinations = [
    [CONFIG.ACADEMY.doorGx, CONFIG.ACADEMY.doorGy, 'academy door'],
    [MAP_DATA.AREAS.wilderness.signGx, MAP_DATA.AREAS.wilderness.signGy, 'wilderness entrance'],
    [MAP_DATA.ARENA.centerGx, MAP_DATA.ARENA.centerGy, 'arena boss'],
    ...MAP_DATA.NPCS.map((npc) => [npc.gx, npc.gy, `NPC ${npc.gx},${npc.gy}`]),
  ];
  for (const [x, y, label] of destinations) assert.ok(visited.has(`${x},${y}`), `${label} is unreachable from player start`);
  const wilderness = MAP_DATA.AREAS.wilderness;
  const wildernessTiles = MAP_DATA.TILES.slice(wilderness.y, wilderness.y + wilderness.height)
    .flatMap((row) => row.slice(wilderness.x, wilderness.x + wilderness.width));
  assert.ok(wildernessTiles.includes(CONFIG.TILE_KEYS.WATER), 'wilderness must contain water');
  assert.ok(wildernessTiles.includes(CONFIG.TILE_KEYS.TALLGRASS), 'wilderness must contain encounter grass');
});

test('character animation sheets use the shared transparent 4x4 layout', () => {
  const { CONFIG } = loadDataContext();
  for (const asset of [CONFIG.ASSETS.player, CONFIG.ASSETS.bicycleOverlay, CONFIG.ASSETS.npc]) {
    const png = pngInfo(asset);
    assert.equal(png.width, 128, `${asset} must be 128px wide`);
    assert.equal(png.height, 128, `${asset} must be 128px high`);
    assert.ok(png.colorType === 4 || png.colorType === 6, `${asset} must contain an alpha channel`);
  }
});

test('extended terrain atlas contains sixteen 32px tiles', () => {
  const { CONFIG } = loadDataContext();
  const png = pngInfo(CONFIG.ASSETS.terrainTiles);
  assert.equal(png.width, 16 * CONFIG.TILE);
  assert.equal(png.height, CONFIG.TILE);
  assert.ok(png.colorType === 2 || png.colorType === 6, 'terrain atlas must be RGB/RGBA');
});

test('legacy world atlas contains seven 32px tiles', () => {
  const { CONFIG } = loadDataContext();
  const png = pngInfo(CONFIG.ASSETS.tileset);
  assert.equal(png.width, 7 * CONFIG.TILE);
  assert.equal(png.height, CONFIG.TILE);
  assert.ok(png.colorType === 2 || png.colorType === 6, 'world atlas must be RGB/RGBA');
});

test('academy sprite exactly matches its configured tile footprint', () => {
  const { CONFIG } = loadDataContext();
  const png = pngInfo(CONFIG.ASSETS.academy);
  assert.equal(png.width, CONFIG.ACADEMY.width * CONFIG.TILE);
  assert.equal(png.height, CONFIG.ACADEMY.height * CONFIG.TILE);
  assert.ok(png.colorType === 4 || png.colorType === 6, 'academy must have a transparent background');
});

test('tulip gardens use connected tile variants and stay in the campus plots', () => {
  const { CONFIG, MAP_DATA } = loadDataContext();
  const png = pngInfo(CONFIG.ASSETS.tulipTiles);
  assert.equal(png.width, 4 * CONFIG.TILE);
  assert.equal(png.height, CONFIG.TILE);
  assert.ok(png.colorType === 2 || png.colorType === 6, 'tulip tile atlas must be RGB/RGBA');

  const gardens = MAP_DATA.DECORATIONS?.tulipGardens || [];
  assert.equal(gardens.length, 2, 'campus should contain two connected tulip plots');
  for (const garden of gardens) {
    assert.equal(garden.width, 3);
    assert.equal(garden.height, 4);
    assert.ok(garden.x === 2 || garden.x === 9, `tulip plot at ${garden.x},${garden.y} overlaps the campus walkway`);
    assert.equal(garden.y, 8);
  }
});

test('Trainer Arena has a single odd center axis and a complete wall tile atlas', () => {
  const { CONFIG, MAP_DATA } = loadDataContext();
  const arena = MAP_DATA.ARENA;
  assert.equal(arena.width % 2, 1, 'arena width must be odd');
  assert.equal(arena.height % 2, 1, 'arena height must be odd');
  assert.equal(arena.centerGx, arena.x + Math.floor(arena.width / 2));
  assert.equal(arena.centerGy, arena.y + Math.floor(arena.height / 2));
  assert.equal(MAP_DATA.TILES[arena.y + 1][arena.centerGx], CONFIG.TILE_KEYS.BLUE_CARPET);
  assert.notEqual(MAP_DATA.TILES[arena.y + 1][arena.centerGx + 1], CONFIG.TILE_KEYS.BLUE_CARPET,
    'center aisle must remain exactly one tile wide');

  const png = pngInfo(CONFIG.ASSETS.arenaWallTiles);
  assert.equal(png.width, 6 * CONFIG.TILE);
  assert.equal(png.height, CONFIG.TILE);
  assert.ok(png.colorType === 2 || png.colorType === 6, 'arena wall atlas must be RGB/RGBA');
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
