#!/usr/bin/env node
'use strict';

// Normalize a generated 4x4 character sheet into KanjiGO's production v3
// layout: 4x4 RGBA cells, shared scale and bottom baseline. Production can use
// either 64px cells (32px draw) or 96px cells (48px draw).
// Bright checkerboard pixels are removed only when connected to a cell edge,
// so white eyes and employee badges enclosed by the sprite remain intact.

const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const [inputPath, outputPath, ...flags] = process.argv.slice(2);
const uniformHeight = flags.includes('--uniform-height');
const stabilize = flags.includes('--stabilize');
const runtimeGrid = flags.includes('--runtime-grid');
const lockHeads = flags.includes('--lock-heads');
const femaleFrontAlign = flags.includes('--female-front-align');
const frameSizeFlag = flags.indexOf('--frame-size');
const frameSize = frameSizeFlag >= 0 ? Number(flags[frameSizeFlag + 1]) : 64;
const runtimeSizeFlag = flags.indexOf('--runtime-size');
const requestedRuntimeSize = runtimeSizeFlag >= 0 ? Number(flags[runtimeSizeFlag + 1]) : frameSize / 2;
const targetHeightFlag = flags.indexOf('--target-height');
const targetHeight = targetHeightFlag >= 0 ? Number(flags[targetHeightFlag + 1]) : Math.round(frameSize * 0.875);
if (!Number.isInteger(frameSize) || frameSize < 64 || frameSize > 192 || frameSize % 2 !== 0) {
  throw new Error('--frame-size must be an even integer from 64 to 192.');
}
if (!Number.isInteger(requestedRuntimeSize) || requestedRuntimeSize < 16 || frameSize % requestedRuntimeSize !== 0) {
  throw new Error('--runtime-size must be an integer divisor of --frame-size and at least 16.');
}
if (!Number.isInteger(targetHeight) || targetHeight < Math.round(frameSize * 0.625) || targetHeight > frameSize - 4) {
  throw new Error(`--target-height must be an integer from ${Math.round(frameSize * 0.625)} to ${frameSize - 4}.`);
}
if (!inputPath || !outputPath) {
  console.error('Usage: node scripts/normalize-character-v3.js GENERATED.png OUTPUT.png [--frame-size 64|96|128] [--runtime-size 32|48] [--uniform-height] [--target-height 56|84|112] [--stabilize] [--runtime-grid] [--lock-heads] [--female-front-align]');
  process.exit(2);
}

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const source = fs.readFileSync(inputPath);
if (!source.subarray(0, 8).equals(PNG_SIGNATURE)) throw new Error('Input is not a PNG.');

const chunks = [];
let chunkOffset = 8;
while (chunkOffset < source.length) {
  const length = source.readUInt32BE(chunkOffset);
  const type = source.toString('ascii', chunkOffset + 4, chunkOffset + 8);
  chunks.push({ type, data: source.subarray(chunkOffset + 8, chunkOffset + 8 + length) });
  chunkOffset += length + 12;
}

const header = chunks.find((chunk) => chunk.type === 'IHDR')?.data;
if (!header) throw new Error('PNG is missing IHDR.');
const width = header.readUInt32BE(0);
const height = header.readUInt32BE(4);
const bitDepth = header[8];
const colorType = header[9];
const interlace = header[12];
if (width < 256 || height < 256 || bitDepth !== 8 || ![2, 6].includes(colorType) || interlace !== 0) {
  throw new Error('Expected a non-interlaced 8-bit RGB/RGBA square sheet of at least 256px.');
}
if (Math.abs(width - height) > 2) throw new Error('Expected an approximately square 4x4 sheet.');

const sourceBpp = colorType === 6 ? 4 : 3;
const sourceStride = width * sourceBpp;
const filtered = zlib.inflateSync(Buffer.concat(chunks.filter((chunk) => chunk.type === 'IDAT').map((chunk) => chunk.data)));
const decoded = Buffer.alloc(width * height * sourceBpp);

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

let readOffset = 0;
for (let y = 0; y < height; y += 1) {
  const filter = filtered[readOffset++];
  for (let x = 0; x < sourceStride; x += 1) {
    const raw = filtered[readOffset++];
    const left = x >= sourceBpp ? decoded[y * sourceStride + x - sourceBpp] : 0;
    const up = y > 0 ? decoded[(y - 1) * sourceStride + x] : 0;
    const upLeft = y > 0 && x >= sourceBpp ? decoded[(y - 1) * sourceStride + x - sourceBpp] : 0;
    let value = raw;
    if (filter === 1) value += left;
    else if (filter === 2) value += up;
    else if (filter === 3) value += Math.floor((left + up) / 2);
    else if (filter === 4) value += paeth(left, up, upLeft);
    else if (filter !== 0) throw new Error(`Unsupported PNG filter ${filter}.`);
    decoded[y * sourceStride + x] = value & 0xff;
  }
}

const rgba = Buffer.alloc(width * height * 4);
for (let index = 0; index < width * height; index += 1) {
  rgba[index * 4] = decoded[index * sourceBpp];
  rgba[index * 4 + 1] = decoded[index * sourceBpp + 1];
  rgba[index * 4 + 2] = decoded[index * sourceBpp + 2];
  rgba[index * 4 + 3] = colorType === 6 ? decoded[index * sourceBpp + 3] : 255;
}

const FRAME = frameSize;
const runtimeFrame = requestedRuntimeSize;
const output = Buffer.alloc(FRAME * 4 * FRAME * 4 * 4);
const geometryScale = FRAME / 64;
const baseline = FRAME - Math.round(2 * geometryScale);

function cellBounds(column, row) {
  return {
    x0: Math.round(column * width / 4),
    x1: Math.round((column + 1) * width / 4),
    y0: Math.round(row * height / 4),
    y1: Math.round((row + 1) * height / 4),
  };
}

function backgroundCandidate(x, y) {
  const offset = (y * width + x) * 4;
  if (rgba[offset + 3] === 0) return true;
  const red = rgba[offset], green = rgba[offset + 1], blue = rgba[offset + 2];
  const low = Math.min(red, green, blue), high = Math.max(red, green, blue);
  return low >= 222 && high - low <= 18;
}

function analyzeCell(column, row) {
  const bounds = cellBounds(column, row);
  const cellWidth = bounds.x1 - bounds.x0;
  const cellHeight = bounds.y1 - bounds.y0;
  const background = new Uint8Array(cellWidth * cellHeight);
  const queue = new Int32Array(cellWidth * cellHeight);
  let head = 0, tail = 0;

  function enqueue(localX, localY) {
    if (localX < 0 || localY < 0 || localX >= cellWidth || localY >= cellHeight) return;
    const cellIndex = localY * cellWidth + localX;
    if (background[cellIndex] || !backgroundCandidate(bounds.x0 + localX, bounds.y0 + localY)) return;
    background[cellIndex] = 1;
    queue[tail++] = cellIndex;
  }

  for (let x = 0; x < cellWidth; x += 1) { enqueue(x, 0); enqueue(x, cellHeight - 1); }
  for (let y = 0; y < cellHeight; y += 1) { enqueue(0, y); enqueue(cellWidth - 1, y); }
  while (head < tail) {
    const cellIndex = queue[head++];
    const x = cellIndex % cellWidth, y = Math.floor(cellIndex / cellWidth);
    enqueue(x - 1, y); enqueue(x + 1, y); enqueue(x, y - 1); enqueue(x, y + 1);
  }

  // Generated sheets occasionally let a few pixels from the neighbouring
  // frame cross an imprecise quarter boundary. Retain the largest connected
  // foreground component only; the character itself is one outlined shape,
  // while those edge fragments are small detached components.
  const visited = new Uint8Array(cellWidth * cellHeight);
  let largestComponent = [];
  for (let seedY = 0; seedY < cellHeight; seedY += 1) for (let seedX = 0; seedX < cellWidth; seedX += 1) {
    const seedIndex = seedY * cellWidth + seedX;
    if (background[seedIndex] || visited[seedIndex]) continue;
    const component = [], componentQueue = [seedIndex];
    visited[seedIndex] = 1;
    while (componentQueue.length) {
      const cellIndex = componentQueue.pop();
      component.push(cellIndex);
      const x = cellIndex % cellWidth, y = Math.floor(cellIndex / cellWidth);
      for (let dy = -1; dy <= 1; dy += 1) for (let dx = -1; dx <= 1; dx += 1) {
        if (!dx && !dy) continue;
        const nextX = x + dx, nextY = y + dy;
        if (nextX < 0 || nextY < 0 || nextX >= cellWidth || nextY >= cellHeight) continue;
        const nextIndex = nextY * cellWidth + nextX;
        if (background[nextIndex] || visited[nextIndex]) continue;
        visited[nextIndex] = 1; componentQueue.push(nextIndex);
      }
    }
    if (component.length > largestComponent.length) largestComponent = component;
  }
  const retained = new Uint8Array(cellWidth * cellHeight);
  for (const cellIndex of largestComponent) retained[cellIndex] = 1;
  for (let cellIndex = 0; cellIndex < background.length; cellIndex += 1) {
    if (!retained[cellIndex]) background[cellIndex] = 1;
  }

  let minX = cellWidth, minY = cellHeight, maxX = -1, maxY = -1;
  for (let y = 0; y < cellHeight; y += 1) for (let x = 0; x < cellWidth; x += 1) {
    if (background[y * cellWidth + x]) continue;
    const alpha = rgba[((bounds.y0 + y) * width + bounds.x0 + x) * 4 + 3];
    if (!alpha) continue;
    minX = Math.min(minX, x); minY = Math.min(minY, y);
    maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  }
  if (maxX < minX || maxY < minY) throw new Error(`No sprite found in cell ${column},${row}.`);
  return { bounds, cellWidth, cellHeight, background, minX, minY, maxX, maxY,
    spriteWidth: maxX - minX + 1, spriteHeight: maxY - minY + 1 };
}

const cells = [];
for (let row = 0; row < 4; row += 1) for (let column = 0; column < 4; column += 1) {
  cells.push(analyzeCell(column, row));
}
const maxWidth = Math.max(...cells.map((cell) => cell.spriteWidth));
const maxHeight = Math.max(...cells.map((cell) => cell.spriteHeight));
const targetWidth = Math.min(FRAME - Math.round(6 * geometryScale), Math.round(targetHeight * 0.97));
const scale = Math.min(targetWidth / maxWidth, targetHeight / maxHeight);

function renderCell(cell, column, row) {
  // Some generators change camera distance slightly between directions. This
  // optional whole-frame scale keeps a fixed character height without
  // changing anatomy or splicing body regions.
  const frameScale = uniformHeight ? Math.min(targetWidth / cell.spriteWidth, targetHeight / cell.spriteHeight) : scale;
  const destinationWidth = Math.max(1, Math.round(cell.spriteWidth * frameScale));
  const destinationHeight = Math.max(1, Math.round(cell.spriteHeight * frameScale));
  const destinationX = column * FRAME + Math.floor((FRAME - destinationWidth) / 2);
  const destinationY = row * FRAME + baseline - destinationHeight;
  for (let y = 0; y < destinationHeight; y += 1) for (let x = 0; x < destinationWidth; x += 1) {
    const localX = cell.minX + Math.min(cell.spriteWidth - 1, Math.floor((x + 0.5) * cell.spriteWidth / destinationWidth));
    const localY = cell.minY + Math.min(cell.spriteHeight - 1, Math.floor((y + 0.5) * cell.spriteHeight / destinationHeight));
    if (cell.background[localY * cell.cellWidth + localX]) continue;
    const sourceOffset = ((cell.bounds.y0 + localY) * width + cell.bounds.x0 + localX) * 4;
    const outputOffset = ((destinationY + y) * FRAME * 4 + destinationX + x) * 4;
    rgba.copy(output, outputOffset, sourceOffset, sourceOffset + 4);
  }
}

for (let row = 0; row < 4; row += 1) for (let column = 0; column < 4; column += 1) {
  if (row !== 2) renderCell(cells[row * 4 + column], column, row);
}

// The right-facing direction is a deterministic mirror of the approved left
// row, preventing independent generated poses from causing animation jitter.
for (let frame = 0; frame < 4; frame += 1) for (let y = 0; y < FRAME; y += 1) {
  for (let x = 0; x < FRAME; x += 1) {
    const sourceOffset = (((FRAME + y) * FRAME * 4) + frame * FRAME + x) * 4;
    const outputOffset = ((((FRAME * 2) + y) * FRAME * 4) + frame * FRAME + (FRAME - 1 - x)) * 4;
    output.copy(output, outputOffset, sourceOffset, sourceOffset + 4);
  }
}

if (stabilize) {
  const outputWidth = FRAME * 4;
  const alphaAt = (buffer, x, y) => buffer[(y * outputWidth + x) * 4 + 3];
  const frameMetrics = (row, frame) => {
    let maxY = -1, weight = 0, weightedX = 0;
    for (let localY = 0; localY < FRAME; localY += 1) for (let localX = 0; localX < FRAME; localX += 1) {
      const alpha = alphaAt(output, frame * FRAME + localX, row * FRAME + localY);
      if (alpha <= 20) continue;
      maxY = Math.max(maxY, localY);
      if (localY >= 27 && localY <= 44) {
        const value = alpha / 255;
        weight += value; weightedX += localX * value;
      }
    }
    return { maxY, torsoX: weight ? weightedX / weight : (FRAME - 1) / 2 };
  };
  const median = (values) => {
    const sorted = [...values].sort((a, b) => a - b);
    return (sorted[1] + sorted[2]) / 2;
  };
  const shifts = [];
  for (let row = 0; row < 4; row += 1) {
    const metrics = Array.from({ length: 4 }, (_, frame) => frameMetrics(row, frame));
    const targetTorsoX = median(metrics.map((item) => item.torsoX));
    for (let frame = 0; frame < 4; frame += 1) {
      shifts.push({ row, frame,
        dx: Math.max(-3, Math.min(3, Math.round(targetTorsoX - metrics[frame].torsoX))),
      dy: Math.max(0, baseline - 1 - metrics[frame].maxY) });
    }
  }
  const snapshot = Buffer.from(output);
  for (const { row, frame, dx, dy } of shifts) {
    for (let localY = 0; localY < FRAME; localY += 1) for (let localX = 0; localX < FRAME; localX += 1) {
      const destinationOffset = (((row * FRAME + localY) * outputWidth) + frame * FRAME + localX) * 4;
      output.fill(0, destinationOffset, destinationOffset + 4);
    }
    for (let localY = 0; localY < FRAME; localY += 1) for (let localX = 0; localX < FRAME; localX += 1) {
      const destinationX = localX + dx, destinationY = localY + dy;
      if (destinationX < 0 || destinationX >= FRAME || destinationY < 0 || destinationY >= FRAME) continue;
      const sourceOffset = (((row * FRAME + localY) * outputWidth) + frame * FRAME + localX) * 4;
      const destinationOffset = (((row * FRAME + destinationY) * outputWidth) + frame * FRAME + destinationX) * 4;
      snapshot.copy(output, destinationOffset, sourceOffset, sourceOffset + 4);
    }
  }
}

// A 128→32 experiment must retain its native source detail. When runtime-grid
// quantization is disabled, lock heads directly in source space instead of
// first collapsing the art to the runtime resolution.
if (lockHeads && !runtimeGrid) {
  const outputWidth = FRAME * 4;
  const snapshot = Buffer.from(output);
  const headEnd = Math.round(FRAME * 0.46);
  for (let row = 0; row < 4; row += 1) for (let frame = 1; frame < 4; frame += 1) {
    for (let localY = 0; localY <= headEnd; localY += 1) for (let localX = 0; localX < FRAME; localX += 1) {
      const sourceOffset = (((row * FRAME + localY) * outputWidth) + localX) * 4;
      const destinationOffset = (((row * FRAME + localY) * outputWidth) + frame * FRAME + localX) * 4;
      snapshot.copy(output, destinationOffset, sourceOffset, sourceOffset + 4);
    }
  }
}

// Stabilization and source-space head locking can introduce independent
// one-pixel shifts. Rebuild RIGHT from the finished LEFT row as the last
// native-detail operation so both directions remain exact counterparts.
if (!runtimeGrid) {
  const outputWidth = FRAME * 4;
  const snapshot = Buffer.from(output);
  for (let frame = 0; frame < 4; frame += 1) for (let localY = 0; localY < FRAME; localY += 1) {
    for (let localX = 0; localX < FRAME; localX += 1) {
      const sourceOffset = (((FRAME + localY) * outputWidth) + frame * FRAME + localX) * 4;
      const destinationOffset = ((((FRAME * 2) + localY) * outputWidth) + frame * FRAME + (FRAME - 1 - localX)) * 4;
      snapshot.copy(output, destinationOffset, sourceOffset, sourceOffset + 4);
    }
  }
}

// The game renders each source cell at half size (64→32 or 96→48).
// Authoring final pixels on that exact runtime grid prevents thin
// one-source-pixel facial details from disappearing differently between eyes
// or frames. We then expand each runtime pixel back to a 2x2 source cluster,
// retaining the 256px sheet contract while making browser downscaling exact.
if (runtimeGrid || femaleFrontAlign) {
  const sourceCluster = FRAME / runtimeFrame;
  const runtimeSize = runtimeFrame * 4;
  const runtimeScale = runtimeFrame / 32;
  const runtimeCoord = (value) => Math.round(value * runtimeScale);
  const runtime = Buffer.alloc(runtimeSize * runtimeSize * 4);
  for (let y = 0; y < runtimeSize; y += 1) for (let x = 0; x < runtimeSize; x += 1) {
    const sourceX = Math.min(FRAME * 4 - 1, x * sourceCluster + Math.floor(sourceCluster / 2));
    const sourceY = Math.min(FRAME * 4 - 1, y * sourceCluster + Math.floor(sourceCluster / 2));
    const sourceOffset = (sourceY * FRAME * 4 + sourceX) * 4;
    const destinationOffset = (y * runtimeSize + x) * 4;
    output.copy(runtime, destinationOffset, sourceOffset, sourceOffset + 4);
  }

  const copyRuntimePixel = (buffer, sourceX, sourceY, destinationX, destinationY) => {
    const sourceOffset = (sourceY * runtimeSize + sourceX) * 4;
    const destinationOffset = (destinationY * runtimeSize + destinationX) * 4;
    buffer.copy(buffer, destinationOffset, sourceOffset, sourceOffset + 4);
  };

  if (femaleFrontAlign) {
    // Align the visible face axis with the torso by moving the complete front
    // head one runtime pixel to the right. This is a whole-head translation;
    // no face/body region from another sheet is composited in.
    const snapshot = Buffer.from(runtime);
    const headEnd = runtimeCoord(14);
    const headShift = Math.max(1, runtimeCoord(1));
    for (let localY = 1; localY <= headEnd; localY += 1) for (let localX = 0; localX < runtimeFrame; localX += 1) {
      const destinationOffset = (localY * runtimeSize + localX) * 4;
      runtime.fill(0, destinationOffset, destinationOffset + 4);
      if (localX >= headShift) {
        const sourceOffset = (localY * runtimeSize + localX - headShift) * 4;
        snapshot.copy(runtime, destinationOffset, sourceOffset, sourceOffset + 4);
      }
    }
    // The approved left eye is the source of truth. Copy its complete two-pixel
    // cluster to the symmetric right position so both eyes survive 2:1 draw.
    for (let localY = runtimeCoord(10); localY <= runtimeCoord(12); localY += 1) {
      copyRuntimePixel(runtime, runtimeCoord(13), localY, runtimeCoord(17), localY);
      copyRuntimePixel(runtime, runtimeCoord(14), localY, runtimeCoord(18), localY);
    }
  }

  if (lockHeads) {
    const snapshot = Buffer.from(runtime);
    for (let row = 0; row < 4; row += 1) for (let frame = 1; frame < 4; frame += 1) {
      for (let localY = 0; localY <= runtimeCoord(14); localY += 1) for (let localX = 0; localX < runtimeFrame; localX += 1) {
        const sourceX = localX;
        const sourceY = row * runtimeFrame + localY;
        const destinationX = frame * runtimeFrame + localX;
        const destinationY = sourceY;
        const sourceOffset = (sourceY * runtimeSize + sourceX) * 4;
        const destinationOffset = (destinationY * runtimeSize + destinationX) * 4;
        snapshot.copy(runtime, destinationOffset, sourceOffset, sourceOffset + 4);
      }
    }
  }

  // Rebuild the runtime right-facing row from the finished left-facing row.
  // Doing this after 2:1 sampling avoids the one-pixel directional bias that
  // appears when two independently sampled high-resolution rows are mirrored.
  const directionalSnapshot = Buffer.from(runtime);
  for (let frame = 0; frame < 4; frame += 1) for (let localY = 0; localY < runtimeFrame; localY += 1) {
    for (let localX = 0; localX < runtimeFrame; localX += 1) {
      const sourceX = frame * runtimeFrame + localX;
      const sourceY = runtimeFrame + localY;
      const destinationX = frame * runtimeFrame + (runtimeFrame - 1 - localX);
      const destinationY = runtimeFrame * 2 + localY;
      const sourceOffset = (sourceY * runtimeSize + sourceX) * 4;
      const destinationOffset = (destinationY * runtimeSize + destinationX) * 4;
      directionalSnapshot.copy(runtime, destinationOffset, sourceOffset, sourceOffset + 4);
    }
  }

  for (let y = 0; y < runtimeSize; y += 1) for (let x = 0; x < runtimeSize; x += 1) {
    const sourceOffset = (y * runtimeSize + x) * 4;
    for (let dy = 0; dy < sourceCluster; dy += 1) for (let dx = 0; dx < sourceCluster; dx += 1) {
      const destinationOffset = (((y * sourceCluster + dy) * FRAME * 4) + x * sourceCluster + dx) * 4;
      runtime.copy(output, destinationOffset, sourceOffset, sourceOffset + 4);
    }
  }
}

const crcTable = Array.from({ length: 256 }, (_, value) => {
  let crc = value;
  for (let bit = 0; bit < 8; bit += 1) crc = (crc & 1) ? (0xedb88320 ^ (crc >>> 1)) : (crc >>> 1);
  return crc >>> 0;
});
function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const chunk = Buffer.alloc(data.length + 12);
  chunk.writeUInt32BE(data.length, 0); typeBuffer.copy(chunk, 4); data.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), data.length + 8);
  return chunk;
}

const outputSize = FRAME * 4;
const scanlines = Buffer.alloc(outputSize * (outputSize * 4 + 1));
for (let y = 0; y < outputSize; y += 1) {
  const rowOffset = y * (outputSize * 4 + 1);
  scanlines[rowOffset] = 0;
  output.copy(scanlines, rowOffset + 1, y * outputSize * 4, (y + 1) * outputSize * 4);
}
const outputHeader = Buffer.alloc(13);
outputHeader.writeUInt32BE(outputSize, 0); outputHeader.writeUInt32BE(outputSize, 4);
outputHeader[8] = 8; outputHeader[9] = 6; outputHeader[10] = 0; outputHeader[11] = 0; outputHeader[12] = 0;
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, Buffer.concat([
  PNG_SIGNATURE,
  pngChunk('IHDR', outputHeader),
  pngChunk('IDAT', zlib.deflateSync(scanlines, { level: 9 })),
  pngChunk('IEND', Buffer.alloc(0)),
]));

console.log(`${outputPath}: ${outputSize}x${outputSize} RGBA, ${FRAME}px frames → ${runtimeFrame}px runtime, ${uniformHeight ? `uniform ${targetHeight}px frame height` : `scale ${scale.toFixed(4)}`}, shared baseline ${baseline}px${stabilize ? ', stabilized torso axis' : ''}${runtimeGrid ? ', runtime-grid aligned' : ''}${lockHeads ? ', direction heads locked' : ''}${femaleFrontAlign ? ', female front aligned' : ''}`);
