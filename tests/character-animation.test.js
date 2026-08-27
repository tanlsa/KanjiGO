'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const zlib = require('node:zlib');

const ROOT = path.resolve(__dirname, '..');
const SHEETS = [
  { path: 'assets/characters/player-v4.png', cell: 128, runtimeSize: 32, runtimeGrid: false, headEnd: 59 },
  { path: 'assets/characters/player-blue-v4.png', cell: 128, runtimeSize: 32, runtimeGrid: false, headEnd: 59 },
  { path: 'assets/characters/player-female-orange-v4.png', cell: 128, runtimeSize: 32, runtimeGrid: false, headEnd: 59 },
  { path: 'assets/characters/player-female-blue-v4.png', cell: 128, runtimeSize: 32, runtimeGrid: false, headEnd: 59 },
  { path: 'assets/characters/npc-v4.png', cell: 128, runtimeSize: 32, runtimeGrid: false, headEnd: 59 },
  { path: 'assets/characters/npc-hd96.png', cell: 96, runtimeSize: 48, runtimeGrid: true, headEnd: 43 },
];

function decodeRgba(relativePath) {
  const png = fs.readFileSync(path.join(ROOT, relativePath));
  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  const chunks = [];
  for (let offset = 8; offset < png.length;) {
    const length = png.readUInt32BE(offset);
    chunks.push({ type: png.toString('ascii', offset + 4, offset + 8), data: png.subarray(offset + 8, offset + 8 + length) });
    offset += length + 12;
  }
  const header = chunks.find((chunk) => chunk.type === 'IHDR').data;
  const width = header.readUInt32BE(0), height = header.readUInt32BE(4);
  assert.equal(width, height); assert.equal(width % 4, 0);
  assert.equal(header[8], 8); assert.equal(header[9], 6); assert.equal(header[12], 0);
  const filtered = zlib.inflateSync(Buffer.concat(chunks.filter((chunk) => chunk.type === 'IDAT').map((chunk) => chunk.data)));
  const stride = width * 4, pixels = Buffer.alloc(height * stride);
  const paeth = (a, b, c) => {
    const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
  };
  let read = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = filtered[read++];
    for (let x = 0; x < stride; x += 1) {
      const raw = filtered[read++], left = x >= 4 ? pixels[y * stride + x - 4] : 0;
      const up = y ? pixels[(y - 1) * stride + x] : 0;
      const upLeft = y && x >= 4 ? pixels[(y - 1) * stride + x - 4] : 0;
      let value = raw;
      if (filter === 1) value += left;
      else if (filter === 2) value += up;
      else if (filter === 3) value += Math.floor((left + up) / 2);
      else if (filter === 4) value += paeth(left, up, upLeft);
      else assert.equal(filter, 0, `unsupported PNG filter ${filter}`);
      pixels[y * stride + x] = value & 0xff;
    }
  }
  return { width, height, pixels };
}

function pixel(sheet, x, y) {
  const offset = (y * sheet.width + x) * 4;
  return sheet.pixels.subarray(offset, offset + 4);
}

function equalPixel(sheet, ax, ay, bx, by) {
  return pixel(sheet, ax, ay).equals(pixel(sheet, bx, by));
}

for (const definition of SHEETS) {
  const relativePath = definition.path;
  test(`${relativePath} keeps one coherent skeleton on the runtime grid`, () => {
    const sheet = decodeRgba(relativePath), { cell, runtimeSize, runtimeGrid, headEnd } = definition;
    assert.equal(sheet.width, cell * 4); assert.equal(sheet.height, cell * 4);
    const directionHeights = [], directionBaselines = [];

    // HD96 sheets intentionally snap to their 2x2 runtime grid. V4 retains
    // native 128px detail and is sampled 128→32 only when Canvas draws it.
    if (runtimeGrid) {
      const cluster = cell / runtimeSize;
      for (let y = 0; y < sheet.height; y += cluster) for (let x = 0; x < sheet.width; x += cluster) {
        for (let dy = 0; dy < cluster; dy += 1) for (let dx = 0; dx < cluster; dx += 1) {
          assert.ok(equalPixel(sheet, x, y, x + dx, y + dy),
            `unaligned ${cluster}x${cluster} cluster at ${x},${y}`);
        }
      }
    }

    for (let row = 0; row < 4; row += 1) {
      const baselines = [], heights = [];
      for (let frame = 0; frame < 4; frame += 1) {
        let minY = cell, baseline = -1, occupied = 0;
        for (let localY = 0; localY < cell; localY += 1) for (let localX = 0; localX < cell; localX += 1) {
          if (pixel(sheet, frame * cell + localX, row * cell + localY)[3] > 20) {
            minY = Math.min(minY, localY); baseline = localY; occupied += 1;
          }
        }
        assert.ok(occupied < cell * cell * .45,
          `opaque matte or oversized silhouette in direction ${row}, frame ${frame}: ${occupied}px`);
        if (cell === 128) for (let localY = 0; localY < 8; localY += 1) for (let localX = 0; localX < cell; localX += 1) {
          assert.equal(pixel(sheet, frame * cell + localX, row * cell + localY)[3], 0,
            `V4 safe padding is occupied at direction ${row}, frame ${frame}, ${localX},${localY}`);
        }
        baselines.push(baseline); heights.push(baseline - minY + 1);
        if (frame > 0) for (let localY = 0; localY <= headEnd; localY += 1) for (let localX = 0; localX < cell; localX += 1) {
          assert.ok(equalPixel(sheet, localX, row * cell + localY, frame * cell + localX, row * cell + localY),
            `head jitter at direction ${row}, frame ${frame}, ${localX},${localY}`);
        }
      }
      assert.equal(new Set(baselines).size, 1, `baseline drift in direction ${row}: ${baselines.join(',')}`);
      assert.equal(new Set(heights).size, 1, `height drift in direction ${row}: ${heights.join(',')}`);
      directionBaselines.push(baselines[0]); directionHeights.push(heights[0]);
    }

    // The 128px V4 art is drawn at 32px in game. A four-source-pixel
    // difference therefore becomes a visible one-pixel pop whenever the
    // player turns from front to back, even though each row is stable alone.
    if (cell === 128) {
      assert.equal(new Set(directionBaselines).size, 1,
        `direction baseline mismatch: ${directionBaselines.join(',')}`);
      assert.equal(new Set(directionHeights).size, 1,
        `direction height mismatch: ${directionHeights.join(',')}`);
    }

    // Right-facing animation is produced from the completed left-facing row,
    // so pose timing and body mass cannot diverge between directions.
    for (let frame = 0; frame < 4; frame += 1) for (let localY = 0; localY < cell; localY += 1) {
      for (let localX = 0; localX < cell; localX += 1) {
        assert.ok(equalPixel(sheet, frame * cell + localX, cell + localY,
          frame * cell + (cell - 1 - localX), cell * 2 + localY),
        `left/right mismatch in frame ${frame}, ${localX},${localY}`);
      }
    }
  });
}


test('V4 bicycle keeps left/right geometry mirrored and one-wheel front/back silhouettes', () => {
  const sheet = decodeRgba('assets/characters/bicycle-overlay-v4.png'), cell = 128;
  assert.equal(sheet.width, cell * 4); assert.equal(sheet.height, cell * 4);
  for (let frame = 0; frame < 4; frame += 1) for (let localY = 0; localY < cell; localY += 1) {
    for (let localX = 0; localX < cell; localX += 1) {
      assert.ok(equalPixel(sheet, frame * cell + localX, cell + localY,
        frame * cell + (cell - 1 - localX), cell * 2 + localY),
      `bicycle left/right mismatch in frame ${frame}, ${localX},${localY}`);
    }
  }
  for (const row of [0, 3]) for (let frame = 0; frame < 4; frame += 1) {
    const occupiedColumns = [];
    for (let x = 0; x < cell; x += 1) {
      let occupied = false;
      for (let y = 0; y < cell; y += 1) {
        if (pixel(sheet, frame * cell + x, row * cell + y)[3] > 20) { occupied = true; break; }
      }
      if (occupied) occupiedColumns.push(x);
    }
    assert.ok(occupiedColumns.length < cell * .42,
      `front/back bicycle frame ${row}:${frame} should keep a narrow one-wheel silhouette`);
  }
});

test('V4 bicycle locks its center and tire baseline between animation frames', () => {
  const sheet = decodeRgba('assets/characters/bicycle-overlay-v4.png'), cell = 128;
  for (let row = 0; row < 4; row += 1) {
    const centers = [], baselines = [];
    for (let frame = 0; frame < 4; frame += 1) {
      let minX = cell, maxX = -1, maxY = -1;
      for (let localY = 0; localY < cell; localY += 1) for (let localX = 0; localX < cell; localX += 1) {
        if (pixel(sheet, frame * cell + localX, row * cell + localY)[3] <= 20) continue;
        minX = Math.min(minX, localX); maxX = Math.max(maxX, localX); maxY = Math.max(maxY, localY);
      }
      assert.ok(maxX >= minX, `empty bicycle frame ${row}:${frame}`);
      centers.push((minX + maxX) / 2); baselines.push(maxY);
    }
    assert.ok(Math.max(...centers) - Math.min(...centers) <= 1,
      `bicycle center drift in direction ${row}: ${centers.join(',')}`);
    assert.ok(Math.max(...baselines) - Math.min(...baselines) <= 1,
      `bicycle baseline drift in direction ${row}: ${baselines.join(',')}`);
  }
});

test('V4 rear-view bicycle hides its handlebar behind the rider', () => {
  const sheet = decodeRgba('assets/characters/bicycle-overlay-v4.png'), cell = 128;
  for (let frame = 0; frame < 4; frame += 1) {
    for (let localY = 26; localY <= 35; localY += 1) for (let localX = 36; localX <= 91; localX += 1) {
      assert.equal(pixel(sheet, frame * cell + localX, 3 * cell + localY)[3], 0,
        `rear handlebar remains visible in frame ${frame} at ${localX},${localY}`);
    }
  }
});

test('male V4 rear-view hair ends in stable nape locks instead of a flat seam', () => {
  for (const relativePath of [
    'assets/characters/player-v4.png',
    'assets/characters/player-blue-v4.png',
    'assets/characters/npc-v4.png',
  ]) {
    const sheet = decodeRgba(relativePath), cell = 128;
    for (const localX of [54, 64, 74]) for (let frame = 0; frame < 4; frame += 1) {
      const sample = pixel(sheet, frame * cell + localX, 3 * cell + 58);
      assert.ok(sample[3] > 20 && sample[0] < 90 && sample[1] < 90 && sample[2] < 90,
        `rear nape lock is missing in ${relativePath}, frame ${frame}, x=${localX}`);
    }
  }
});

test('female V4 front eyes remain symmetric at the 32px runtime sample points', () => {
  for (const relativePath of [
    'assets/characters/player-female-orange-v4.png',
    'assets/characters/player-female-blue-v4.png',
  ]) {
    const sheet = decodeRgba(relativePath), cell = 128, sourceCluster = 4;
    for (let frame = 0; frame < 4; frame += 1) for (let runtimeY = 10; runtimeY <= 12; runtimeY += 1) {
      for (let eyePixel = 0; eyePixel < 2; eyePixel += 1) {
        const sourceY = runtimeY * sourceCluster + Math.floor(sourceCluster / 2);
        const leftX = frame * cell + (13 + eyePixel) * sourceCluster + Math.floor(sourceCluster / 2);
        const rightX = frame * cell + (17 + eyePixel) * sourceCluster + Math.floor(sourceCluster / 2);
        assert.ok(equalPixel(sheet, leftX, sourceY, rightX, sourceY),
          `asymmetric front eye sample in ${relativePath}, frame ${frame}, row ${runtimeY}`);
      }
    }
  }
});
