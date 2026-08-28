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
  for (const file of ['js/content-catalog.js', 'js/config.js', 'js/kanji.js', 'js/question-supplement.js', 'js/data-loader.js', 'js/map.js']) {
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

test('offline Japanese and Vietnamese font assets are complete and used by the UI', () => {
  const weights = [400, 700], subsets = ['japanese', 'vietnamese', 'latin'];
  for (const weight of weights) for (const subset of subsets) {
    const file = `assets/fonts/noto-sans-jp-${subset}-${weight}.woff2`;
    const data = fs.readFileSync(path.join(ROOT, file));
    assert.equal(data.subarray(0, 4).toString('ascii'), 'wOF2', `${file} is not a WOFF2 font`);
    assert.ok(data.length > 4000, `${file} is unexpectedly empty`);
  }
  assert.match(read('assets/fonts/OFL.txt'), /SIL OPEN FONT LICENSE/i);
  assert.match(read('index.html'), /css\/fonts\.css/);
  assert.match(read('admin.html'), /css\/fonts\.css/);
  assert.doesNotMatch(read('js/game.js'), /\bmonospace\b/, 'multilingual canvas UI must not use raw platform monospace');
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
    const nameParts = monster.name.trim().split(/\s+/);
    assert.ok(
      (typeof monster.hanViet === 'string' && monster.hanViet.trim() && monster.name.includes(monster.hanViet.trim())) || nameParts.length >= 2,
      `${info.monId} needs a Hán Việt name prefix or an explicit hanViet override`,
    );
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
  const keys = new Set(), ids = new Set();
  for (const [index, q] of KANJI_DB.QUESTIONS.entries()) {
    const label = `question ${index + 1} (${q.word}/${q.target})`;
    assert.ok(chars.has(q.target), `${label} targets unknown Kanji`);
    assert.ok(q.word.includes(q.target), `${label} word does not contain target`);
    assert.ok(q.answer && q.romaji && q.mean && q.wordReading && q.wordRomaji, `${label} has an empty learning field`);
    assert.ok(['on', 'kun'].includes(q.type), `${label} has invalid reading type`);
    assert.ok(typeof q.id === 'string' && q.id.trim(), `${label} has no stable vocabulary id`);
    assert.ok(!ids.has(q.id), `${label} duplicates vocabulary id ${q.id}`); ids.add(q.id);
    assert.ok(q.sentence && q.sentence.includes(q.target), `${label} context sentence must contain its target Kanji`);
    assert.ok(q.sentenceReading && q.sentenceReading.includes(q.answer), `${label} kana sentence must contain the target reading`);
    assert.ok(q.sentenceMeaning, `${label} context sentence needs a Vietnamese meaning`);
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
  const { CONFIG, MAP_DATA, KANJI_CATALOG, KANJI_DB } = loadDataContext();
  for (const asset of Object.values(CONFIG.ASSETS)) assert.ok(fs.existsSync(path.join(ROOT, asset)), `missing asset ${asset}`);
  for (const [kind, ids] of Object.entries(CONFIG.SPAWN)) {
    assert.equal(new Set(ids).size, ids.length, `${kind} spawn pool contains duplicates`);
    ids.forEach((id) => assert.ok(CONFIG.MONSTERS[id], `${kind} spawn references missing monster ${id}`));
  }
  assert.ok(CONFIG.MONSTERS[CONFIG.PET.monId], 'starter pet is not configured');
  const n5 = new Set(KANJI_CATALOG.tiers.N5.kanji), metadata = new Map(Object.values(KANJI_DB.KANJI).map((info) => [info.char, info]));
  for (const starter of CONFIG.ONBOARDING.starterKanji) {
    assert.ok(n5.has(starter.char), `onboarding starter ${starter.char} must belong to N5`);
    assert.ok(starter.hanViet && starter.meaning && starter.reading, `onboarding starter ${starter.char} is missing display data`);
    assert.ok(metadata.has(starter.char) && KANJI_DB.QUESTIONS.some((question) => question.target === starter.char), `onboarding starter ${starter.char} has incomplete lesson content`);
    assert.ok(CONFIG.MONSTERS[metadata.get(starter.char).monId], `onboarding starter ${starter.char} has no mascot`);
  }
  for (const seed of CONFIG.INITIAL_PETS) assert.ok(CONFIG.MONSTERS[seed.monId] && seed.level >= 1 && seed.level <= CONFIG.KLEVEL.maxLevel, 'invalid initial pet');
  const width = MAP_DATA.TILES[0].length;
  assert.ok(width > 0 && MAP_DATA.TILES.every((row) => row.length === width), 'map must be rectangular');
  const validTiles = new Set(Object.values(CONFIG.TILE_KEYS));
  MAP_DATA.TILES.flat().forEach((tile) => assert.ok(validTiles.has(tile), `map contains unknown tile ${tile}`));
  const spawnTile = MAP_DATA.TILES[CONFIG.PLAYER.startGy]?.[CONFIG.PLAYER.startGx];
  assert.ok(spawnTile !== undefined && !CONFIG.BLOCKED_TILES.includes(spawnTile), 'player starts outside the walkable map');
  assert.equal(MAP_DATA.TILES[CONFIG.ACADEMY.doorGy][CONFIG.ACADEMY.doorGx], CONFIG.TILE_KEYS.ACADEMY_DOOR, 'academy door config does not match map');
  assert.equal(MAP_DATA.TILES[9][6], CONFIG.TILE_KEYS.VIVID_GRASS,
    'academy facade must not retain one stray worn-path tile');
  for (let x = 16; x <= 20; x++) assert.equal(MAP_DATA.TILES[8][x], CONFIG.TILE_KEYS.TALLGRASS,
    `north Hub brown strip should be encounter grass at ${x},8`);
  for (let x = 20; x <= 34; x++) for (const y of [11, 12]) {
    assert.equal(MAP_DATA.TILES[y][x], CONFIG.TILE_KEYS.CAMPUS_PLAZA,
      `Hub-Wilderness connector should use white campus brick at ${x},${y}`);
  }
  for (const npc of MAP_DATA.NPCS) assert.ok(MAP_DATA.TILES[npc.gy]?.[npc.gx] !== undefined, `NPC at ${npc.gx},${npc.gy} is outside map`);
  assert.equal((MAP_DATA.ONBOARDING_GUIDE?.stops || []).map((stop) => stop.id).join(','), 'academy,wilderness,arena');
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
  const propBlocked = new Set();
  for (const collision of MAP_DATA.PROP_COLLISIONS || []) {
    for (let y = collision.y; y < collision.y + collision.height; y++) {
      for (let x = collision.x; x < collision.x + collision.width; x++) propBlocked.add(`${x},${y}`);
    }
  }
  const start = [CONFIG.PLAYER.startGx, CONFIG.PLAYER.startGy], queue = [start], visited = new Set([start.join(',')]);
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const [x, y] = queue[cursor];
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const nx = x + dx, ny = y + dy, key = `${nx},${ny}`;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height || visited.has(key)
        || blocked.has(MAP_DATA.TILES[ny][nx]) || propBlocked.has(key)) continue;
      visited.add(key); queue.push([nx, ny]);
    }
  }
  const destinations = [
    [CONFIG.ACADEMY.doorGx, CONFIG.ACADEMY.doorGy, 'academy door'],
    [MAP_DATA.AREAS.wilderness.signGx, MAP_DATA.AREAS.wilderness.signGy, 'wilderness entrance'],
    [MAP_DATA.ARENA.centerGx, MAP_DATA.ARENA.centerGy, 'arena boss'],
    ...MAP_DATA.NPCS.map((npc) => [npc.gx, npc.gy, `NPC ${npc.gx},${npc.gy}`]),
    ...(MAP_DATA.ONBOARDING_GUIDE?.stops || []).map((stop) => [stop.gx, stop.gy, `onboarding ${stop.id}`]),
  ];
  for (const [x, y, label] of destinations) assert.ok(visited.has(`${x},${y}`), `${label} is unreachable from player start`);
  const wilderness = MAP_DATA.AREAS.wilderness;
  const wildernessTiles = MAP_DATA.TILES.slice(wilderness.y, wilderness.y + wilderness.height)
    .flatMap((row) => row.slice(wilderness.x, wilderness.x + wilderness.width));
  assert.ok(wildernessTiles.includes(CONFIG.TILE_KEYS.WATER), 'wilderness must contain water');
  assert.ok(wildernessTiles.includes(CONFIG.TILE_KEYS.TALLGRASS), 'wilderness must contain encounter grass');
});

test('FTown, Hoa Lac, and the 404 Garden fill walkable world gaps with valid collision', () => {
  const { CONFIG, MAP_DATA } = loadDataContext();
  assert.equal(MAP_DATA.TILES[0].length, 64, 'the expanded world should be 64 tiles wide');
  assert.equal(MAP_DATA.TILES.length, 44, 'the expanded world should be 44 tiles tall');
  for (const id of ['ftown', 'hoaLac', 'debugGarden']) assert.ok(MAP_DATA.AREAS[id], `missing decorated area ${id}`);
  const landmarks = MAP_DATA.LANDMARKS || [];
  assert.deepEqual(new Set(landmarks.map((item) => item.id)),
    new Set(['ftown', 'innovation_hub', 'heritage_pavilion', 'hoa_lac']));
  const landmarkAssets = {
    ftown: CONFIG.ASSETS.ftownCampus,
    innovation_hub: CONFIG.ASSETS.innovationHub,
    heritage_pavilion: CONFIG.ASSETS.heritageGardenPavilion,
    hoa_lac: CONFIG.ASSETS.hoaLacCampus,
  };
  for (const landmark of landmarks) {
    assert.ok(landmark.asset, `${landmark.id} must use a dedicated world asset instead of a canvas-only building`);
    const assetPath = landmarkAssets[landmark.id];
    assert.ok(fs.existsSync(path.join(ROOT, assetPath)), `${landmark.id} asset is missing: ${assetPath}`);
    const collision = landmark.collision || landmark;
    const entrances = new Set((collision.entrances || []).map(([x, y]) => `${x},${y}`));
    for (let y = collision.gy; y < collision.gy + collision.height; y++) {
      for (let x = collision.gx; x < collision.gx + collision.width; x++) {
        if (entrances.has(`${x},${y}`)) continue;
        assert.ok(CONFIG.BLOCKED_TILES.includes(MAP_DATA.TILES[y][x]), `${landmark.id} footprint leaks collision at ${x},${y}`);
      }
    }
  }
  for (const area of [MAP_DATA.AREAS.ftown, MAP_DATA.AREAS.hoaLac, MAP_DATA.AREAS.debugGarden]) {
    assert.ok(!CONFIG.BLOCKED_TILES.includes(MAP_DATA.TILES[area.approachGy][area.approachGx]), `${area.id} approach is blocked`);
  }
  const techPark = MAP_DATA.DECORATIONS?.techPark;
  assert.ok(techPark?.server && techPark?.portal && techPark?.duck);
  assert.ok((techPark.binaryFlowers || []).some((entry) => entry[2] === 0));
  assert.ok((techPark.binaryFlowers || []).some((entry) => entry[2] === 1));
  const features = MAP_DATA.DECORATIONS?.campusFeatures;
  assert.ok(features?.innovationHub && features?.hoaLacLake && features?.heritageGarden,
    'expanded world should contain FPT-themed campus features');
  for (let y = 10; y <= 11; y++) for (let x = 46; x <= 61; x++) {
    assert.equal(MAP_DATA.TILES[y][x], CONFIG.TILE_KEYS.CAMPUS_PLAZA,
      `FTown upper plaza must remain continuous at ${x},${y}`);
  }
  for (let y = 12; y <= 13; y++) {
    for (let x = 49; x <= 58; x++) assert.equal(MAP_DATA.TILES[y][x], CONFIG.TILE_KEYS.CAMPUS_PLAZA,
      `FTown central approach must remain open at ${x},${y}`);
    const planterXs = y === 13 ? [46,47,60,61] : [46,47,48,59,60,61];
    for (const x of planterXs) assert.equal(MAP_DATA.TILES[y][x], CONFIG.TILE_KEYS.CAMPUS_LAWN,
      `FTown side planter must break up the empty plaza at ${x},${y}`);
  }
  assert.equal(MAP_DATA.TILES[13][48], CONFIG.TILE_KEYS.CAMPUS_PLAZA,
    'FTown left planter should open into the lower plaza at 48,13');
  assert.equal(MAP_DATA.TILES[13][59], CONFIG.TILE_KEYS.CAMPUS_PLAZA,
    'FTown right planter should open into the lower plaza at 59,13');
  for (let y = 21; y <= 22; y++) {
    for (let x = 47; x <= 54; x++) {
      const expected = x === 50 || x === 51 ? CONFIG.TILE_KEYS.CAMPUS_PLAZA : CONFIG.TILE_KEYS.TECH_PROMENADE;
      assert.equal(MAP_DATA.TILES[y][x], expected, `Innovation Hub forecourt has a hole at ${x},${y}`);
    }
  }
  for (let y = 20; y <= 23; y++) for (const x of [50, 51]) {
    assert.equal(MAP_DATA.TILES[y][x], CONFIG.TILE_KEYS.CAMPUS_PLAZA,
      `Innovation Hub entrance path must cover ${x},${y}`);
  }
  for (let y = 41; y <= 42; y++) for (const x of [45, 46]) {
    assert.equal(MAP_DATA.TILES[y][x], CONFIG.TILE_KEYS.CAMPUS_COURTYARD,
      `F-Ville entrance path must cover ${x},${y}`);
  }
  for (let y = 34; y <= 38; y++) for (let x = 4; x <= 5; x++) {
    assert.equal(MAP_DATA.TILES[y][x], CONFIG.TILE_KEYS.CAMPUS_PLAZA,
      `Heritage Garden entrance path must cover ${x},${y}`);
  }
  for (let y = 34; y <= 38; y++) assert.equal(MAP_DATA.TILES[y][6], CONFIG.TILE_KEYS.CAMPUS_LAWN,
    `Heritage Garden right edge should return to lawn at 6,${y}`);
  assert.equal(MAP_DATA.TILES[39][4], CONFIG.TILE_KEYS.WORN_PATH,
    'Heritage Garden path should open into the southwest tall grass at 4,39');
  assert.ok((features.encounterGroves || []).length >= 4, 'expanded world should add several encounter groves');
  for (const grove of features.encounterGroves) {
    const groveTiles = MAP_DATA.TILES.slice(grove.y, grove.y + grove.height)
      .flatMap((row) => row.slice(grove.x, grove.x + grove.width));
    assert.ok(groveTiles.includes(CONFIG.TILE_KEYS.TALLGRASS), `encounter grove at ${grove.x},${grove.y} has no tall grass`);
  }
  assert.ok(MAP_DATA.AREAS.campusPark, 'the expanded south campus park is missing');
  const props = MAP_DATA.PROPS || [];
  assert.ok(props.some((prop) => prop.id === 'fpt_software_monument'));
  assert.ok(props.some((prop) => prop.id === 'cuder_statue'));
  assert.ok(props.some((prop) => prop.id === 'fpt_campus_garden'));
  assert.ok(props.filter((prop) => prop.asset === 'prop_campus_shrub').length >= 8);
  assert.ok(!(MAP_DATA.PROP_COLLISIONS || []).some((collision) => collision.x <= 56 && 56 < collision.x + collision.width
    && collision.y <= 36 && 36 < collision.y + collision.height), 'Cuder must leave the F-Ville road open');
  const monument = props.find((prop) => prop.id === 'fpt_software_monument');
  assert.equal(monument.gx + monument.width / 2, 21.5, 'FPT monument should align to the north plaza centerline');
  assert.ok(monument.width >= 7, 'FPT monument should remain large enough for its logo text to read clearly');
  const garden = props.find((prop) => prop.id === 'fpt_campus_garden');
  assert.ok(garden.collisions.length > 1, 'round campus garden should use a shaped collision footprint');
  assert.ok(!garden.collisions.some((collision) => collision.x <= 23 && 23 < collision.x + collision.width
    && collision.y <= 32 && 32 < collision.y + collision.height), 'transparent garden corner must not be blocked');
  assert.equal(MAP_DATA.TILES[37][57], CONFIG.TILE_KEYS.CAMPUS_PLAZA,
    'Cuder statue should sit on an authored plaza connected to the east road');
  assert.equal(MAP_DATA.TILES[36][56], CONFIG.TILE_KEYS.CAMPUS_PLAZA,
    'Cuder pocket plaza should blend into the east road instead of floating on the lawn');
  const smallLake = MAP_DATA.DECORATIONS.campusFeatures.hoaLacLake;
  for (const [x, y] of [[smallLake.x, smallLake.y], [smallLake.x + smallLake.width - 1, smallLake.y],
    [smallLake.x, smallLake.y + smallLake.height - 1], [smallLake.x + smallLake.width - 1, smallLake.y + smallLake.height - 1]]) {
    assert.notEqual(MAP_DATA.TILES[y][x], CONFIG.TILE_KEYS.WATER, `campus lake corner ${x},${y} should be softened`);
  }
});

test('generated FPT campus PNG assets preserve transparent alpha and runtime dimensions', () => {
  const { CONFIG } = loadDataContext();
  const expected = new Map([
    [CONFIG.ASSETS.ftownCampus, [448, 256]],
    [CONFIG.ASSETS.innovationHub, [256, 128]],
    [CONFIG.ASSETS.heritageGardenPavilion, [320, 160]],
    [CONFIG.ASSETS.hoaLacCampus, [512, 256]],
    [CONFIG.ASSETS.cuderStatue, [128, 128]],
    [CONFIG.ASSETS.fptSoftwareSign, [224, 90]],
    [CONFIG.ASSETS.campusShrubCluster, [96, 48]],
    [CONFIG.ASSETS.fptCampusGarden, [192, 128]],
  ]);
  for (const [asset, [width, height]] of expected) {
    const png = pngInfo(asset);
    assert.equal(png.width, width, `${asset} width should match its authored runtime scale`);
    assert.equal(png.height, height, `${asset} height should match its authored runtime scale`);
    assert.ok(png.colorType === 4 || png.colorType === 6, `${asset} must preserve an alpha channel`);
  }
});

test('new campus terrain tiles are valid 32px PNGs and all appear on the expanded map', () => {
  const { CONFIG, MAP_DATA } = loadDataContext();
  const assets = [CONFIG.ASSETS.campusLawnTile, CONFIG.ASSETS.campusPlazaTile,
    CONFIG.ASSETS.campusTechTile, CONFIG.ASSETS.campusCourtyardTile];
  for (const asset of assets) {
    const png = pngInfo(asset);
    assert.equal(png.width, 32, `${asset} must fit one map tile`);
    assert.equal(png.height, 32, `${asset} must fit one map tile`);
    assert.ok(png.colorType === 2 || png.colorType === 6, `${asset} must be an RGB/RGBA PNG`);
  }
  const mapTiles = new Set(MAP_DATA.TILES.flat());
  for (const tile of [CONFIG.TILE_KEYS.CAMPUS_LAWN, CONFIG.TILE_KEYS.CAMPUS_PLAZA,
    CONFIG.TILE_KEYS.TECH_PROMENADE, CONFIG.TILE_KEYS.CAMPUS_COURTYARD]) {
    assert.ok(mapTiles.has(tile), `campus terrain tile ${tile} must be used in the world`);
  }
});

test('every blocked architecture tile has a visible building or authored decoration', () => {
  const { CONFIG, MAP_DATA } = loadDataContext();
  const covered = new Set();
  const coverRect = ({ gx, gy, width, height }) => {
    for (let y = gy; y < gy + height; y++) for (let x = gx; x < gx + width; x++) covered.add(`${x},${y}`);
  };
  coverRect({ gx: CONFIG.ACADEMY.gx, gy: CONFIG.ACADEMY.gy,
    width: CONFIG.ACADEMY.width, height: CONFIG.ACADEMY.height });
  for (const landmark of MAP_DATA.LANDMARKS || []) coverRect(landmark.collision || landmark);
  const arena = MAP_DATA.ARENA;
  if (arena) {
    for (let x = arena.x; x < arena.x + arena.width; x++) {
      covered.add(`${x},${arena.y}`); covered.add(`${x},${arena.y + arena.height - 1}`);
    }
    for (let y = arena.y; y < arena.y + arena.height; y++) {
      covered.add(`${arena.x},${y}`); covered.add(`${arena.x + arena.width - 1},${y}`);
    }
  }
  const techPark = MAP_DATA.DECORATIONS?.techPark;
  for (const decoration of [techPark?.server, techPark?.portal]) {
    if (decoration) covered.add(`${decoration.gx},${decoration.gy}`);
  }
  const architecture = new Set([CONFIG.TILE_KEYS.ACADEMY_DOOR,
    CONFIG.TILE_KEYS.ACADEMY_WALL, CONFIG.TILE_KEYS.ACADEMY_ROOF]);
  for (let y = 0; y < MAP_DATA.TILES.length; y++) {
    for (let x = 0; x < MAP_DATA.TILES[y].length; x++) {
      if (architecture.has(MAP_DATA.TILES[y][x])) {
        assert.ok(covered.has(`${x},${y}`), `architecture tile at ${x},${y} has collision but no visible resource`);
      }
    }
  }
});

test('character animation sheets use the configured high-detail transparent 4x4 layout', () => {
  const { CONFIG } = loadDataContext();
  const frameSize = CONFIG.CHARACTER.npcV4FrameSize;
  assert.equal(frameSize, 128, 'V4 NPC frames should retain their native 128px detail');
  assert.equal(CONFIG.CHARACTER.npcV4DrawSize, 32,
    'V4 NPCs should share the player scale of exactly one map tile');
  for (const asset of new Set([CONFIG.ASSETS.npc])) {
    const png = pngInfo(asset);
    assert.equal(png.width, frameSize * 4, `${asset} must contain four ${frameSize}px columns`);
    assert.equal(png.height, frameSize * 4, `${asset} must contain four ${frameSize}px rows`);
    assert.ok(png.colorType === 4 || png.colorType === 6, `${asset} must contain an alpha channel`);
  }
  assert.equal(CONFIG.CHARACTER.playerV4FrameSize, 128,
    'V4 player cells should retain their native 128px detail');
  assert.equal(CONFIG.CHARACTER.playerV4DrawSize, 32,
    'V4 player should be sampled into exactly one map tile');
  for (const asset of new Set([CONFIG.ASSETS.player, CONFIG.ASSETS.playerBlue,
    CONFIG.ASSETS.playerFemale, CONFIG.ASSETS.playerFemaleBlue])) {
    const playerV4 = pngInfo(asset);
    assert.equal(playerV4.width, CONFIG.CHARACTER.playerV4FrameSize * 4);
    assert.equal(playerV4.height, CONFIG.CHARACTER.playerV4FrameSize * 4);
    assert.ok(playerV4.colorType === 4 || playerV4.colorType === 6,
      `${asset} must contain an alpha channel`);
  }
  const bicycle = pngInfo(CONFIG.ASSETS.bicycleOverlay);
  assert.equal(bicycle.width, CONFIG.CHARACTER.bicycleFrameSize * 4);
  assert.equal(bicycle.height, CONFIG.CHARACTER.bicycleFrameSize * 4);
  assert.ok(bicycle.colorType === 4 || bicycle.colorType === 6,
    `${CONFIG.ASSETS.bicycleOverlay} must contain an alpha channel`);
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

  const iconAtlas = pngInfo(CONFIG.ASSETS.trainerThemeIcons);
  assert.equal(iconAtlas.width, 256);
  assert.equal(iconAtlas.height, 256);
  assert.equal(iconAtlas.colorType, 6, 'Trainer icon atlas must preserve transparent RGBA pixels');
});

test('CSV templates exactly mirror packaged runtime data', () => {
  const { KANJI_DB } = loadDataContext();
  const kanjiRows = parseSimpleCsv('data/kanji-template.csv', 7);
  const questionRows = parseSimpleCsv('data/questions-template.csv', 13);
  const runtimeKanji = new Set(Object.values(KANJI_DB.KANJI).map((info) => info.char));
  const runtimeQuestions = new Set(KANJI_DB.QUESTIONS.map((q) => `${q.word}|${q.target}|${q.answer}|${q.type}`));
  assert.equal(kanjiRows.length, runtimeKanji.size, 'Kanji CSV is not synchronized; run npm run sync:data');
  assert.equal(questionRows.length, runtimeQuestions.size, 'question CSV is not synchronized; run npm run sync:data');
  kanjiRows.forEach((row) => assert.ok(runtimeKanji.has(row[1]), `CSV contains unknown Kanji ${row[1]}`));
  questionRows.forEach((row) => assert.ok(runtimeQuestions.has(`${row[0]}|${row[2]}|${row[3]}|${row[5]}`), `CSV contains stale question ${row[0]}/${row[2]}`));
});

test('Admin ships offline Excel import/export and the workbook engine round-trips Japanese content', () => {
  const admin = read('admin.html');
  assert.match(admin, /id="btnImportExcel"/);
  assert.match(admin, /id="btnExportExcel"/);
  assert.match(admin, /js\/vendor\/xlsx\.full\.min\.js/);
  assert.ok(fs.existsSync(path.join(ROOT, 'js/vendor/SHEETJS-LICENSE.txt')));
  const XLSX = require(path.join(ROOT, 'js/vendor/xlsx.full.min.js'));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
    ['word', 'sentence', 'sentenceReading', 'sentenceMeaning'],
    ['水', 'まいにち 水を のみます。', 'まいにち みずを のみます。', 'Hằng ngày tôi uống nước.'],
  ]), 'QUESTIONS');
  const bytes = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  const restored = XLSX.read(bytes, { type: 'buffer' });
  const rows = XLSX.utils.sheet_to_json(restored.Sheets.QUESTIONS, { header: 1 });
  assert.equal(rows[1][1], 'まいにち 水を のみます。');
  assert.equal(rows[1][3], 'Hằng ngày tôi uống nước.');
});

test('lesson workbook supplement is generated as a valid sourced challenge bank', () => {
  const { KANJI_DB } = loadDataContext();
  const supported = new Set(Object.values(KANJI_DB.KANJI).map((info) => info.char));
  assert.equal(KANJI_DB.CHALLENGES.length, 189);
  assert.equal(new Set(KANJI_DB.CHALLENGES.map((question) => question.id)).size, KANJI_DB.CHALLENGES.length);
  for (const question of KANJI_DB.CHALLENGES) {
    assert.ok(supported.has(question.target), `${question.id} targets an unavailable Kanji`);
    assert.ok(question.sentence && question.sentenceReading && question.sentenceMeaning);
    assert.ok(question.sources.vocabulary && question.sources.license, `${question.id} is missing attribution`);
    for (const [mode, answer] of [['m6', question.wordReading], ['m11', question.wordReading], ['m12', question.word]]) {
      assert.equal(question.options[mode].length, 4, `${question.id}/${mode} must have four choices`);
      assert.equal(new Set(question.options[mode]).size, 4, `${question.id}/${mode} contains duplicate choices`);
      assert.equal(question.options[mode].filter((option) => option === answer).length, 1, `${question.id}/${mode} lost its answer`);
    }
  }
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
  assert.deepEqual(scripts, ['js/content-catalog.js', 'js/config.js', 'js/audio-config.js', 'js/audio-manager.js',
    'js/character-slots.js', 'js/audio-settings-ui.js', 'js/kanji.js', 'js/question-supplement.js', 'js/data-loader.js', 'js/map.js', 'js/game.js']);
  assert.match(html, /<canvas\s+id="game"/);
  assert.match(html, /<link rel="icon" type="image\/png" href="assets\/icons\/kanjigo-icon-circle\.png"/);
  assert.match(html, /<link rel="apple-touch-icon" href="assets\/icons\/kanjigo-icon-circle\.png"/);
  const gameIcon = pngInfo('assets/icons/kanjigo-icon-circle.png');
  assert.equal(gameIcon.width, gameIcon.height, 'game icon must remain square');
  assert.ok(gameIcon.width >= 512, 'game icon source should be large enough for app-icon scaling');
  assert.ok(gameIcon.colorType === 4 || gameIcon.colorType === 6,
    'circular game icon must preserve a transparent background');
  assert.match(html, /data-action="profile"[^>]*aria-label="Mở Hồ sơ nhân vật"/);
  assert.match(html, /Hồ sơ <kbd>I<\/kbd>/);
});
