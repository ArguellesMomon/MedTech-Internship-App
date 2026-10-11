import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

// Export the generated artwork into evenly padded cells without repainting it.
// Usage: node scripts/pack-chami-sprites.mjs <generated-transparent-sheet.png>
const source = process.argv[2];
if (!source) throw new Error('Provide the generated transparent source sheet.');
const assetDirectory = path.resolve('src/assets/chami');
const outputDirectory = path.resolve('output/chami');
await fs.mkdir(assetDirectory, { recursive: true });
await fs.mkdir(outputDirectory, { recursive: true });
const { data, info } = await sharp(source)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const bounds = [];

for (let row = 0; row < 2; row++) {
  const top = Math.floor((row * info.height) / 2);
  const bottom = Math.floor(((row + 1) * info.height) / 2);
  const runs = [];
  let start = null;
  let previous = -1;
  for (let x = 0; x < info.width; x++) {
    let used = false;
    for (let y = top; y < bottom; y++) {
      if (data[(y * info.width + x) * 4 + 3] > 8) {
        used = true;
        break;
      }
    }
    if (!used) continue;
    if (start === null) start = x;
    else if (x - previous > 12) {
      runs.push([start, previous]);
      start = x;
    }
    previous = x;
  }
  if (start !== null) runs.push([start, previous]);
  if (runs.length !== 4) throw new Error(`Expected four separate sprites in row ${row}.`);
  for (const [first, last] of runs) {
    // Preserve faint edge pixels around the visible silhouette.
    const left = Math.max(0, first - 4);
    const right = Math.min(info.width - 1, last + 4);
    let minY = bottom;
    let maxY = top;
    for (let y = top; y < bottom; y++) {
      for (let x = left; x <= right; x++) {
        if (data[(y * info.width + x) * 4 + 3] > 0) {
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }
      }
    }
    const y = Math.max(top, minY - 2);
    bounds.push({
      left,
      top: y,
      width: right - left + 1,
      height: Math.min(bottom - 1, maxY + 2) - y + 1,
    });
  }
}

const cell = 384;
const baseline = 328;
const scale = Math.min(
  272 / Math.max(...bounds.map((b) => b.width)),
  272 / Math.max(...bounds.map((b) => b.height)),
);
const frames = [];
for (const bound of bounds) {
  const width = Math.round(bound.width * scale);
  const height = Math.round(bound.height * scale);
  const art = await sharp(source)
    .extract(bound)
    .resize(width, height, { kernel: 'nearest' })
    .png()
    .toBuffer();
  const frame = await sharp({
    create: { width: cell, height: cell, channels: 4, background: '#00000000' },
  })
    .composite([{ input: art, left: Math.floor((cell - width) / 2), top: baseline - height }])
    .png()
    .toBuffer();
  frames.push(frame);
}

const sheet = await sharp({
  create: { width: cell * 4, height: cell * 2, channels: 4, background: '#00000000' },
})
  .composite(
    frames.map((input, index) => ({
      input,
      left: (index % 4) * cell,
      top: Math.floor(index / 4) * cell,
    })),
  )
  .png()
  .toBuffer();
await fs.writeFile(path.join(assetDirectory, 'chami-spritesheet.png'), sheet);
await sharp(sheet)
  .webp({ lossless: true, effort: 6 })
  .toFile(path.join(assetDirectory, 'chami-spritesheet.webp'));
await fs.writeFile(path.join(assetDirectory, 'chami-avatar.png'), frames[0]);
const manifest = {
  name: 'Chami',
  description:
    'A fluffy Persian calico cat with dominant orange and black fur and small cream-white markings.',
  image: 'chami-spritesheet.webp',
  png: 'chami-spritesheet.png',
  size: { width: cell * 4, height: cell * 2 },
  grid: { columns: 4, rows: 2, frameWidth: cell, frameHeight: cell },
  frames: [
    'eyes-open',
    'eyes-half-closed',
    'eyes-closed',
    'eyes-half-open',
    'idle-rest',
    'idle-breathe',
    'idle-tail',
    'idle-settle',
  ].map((name, index) => ({
    index,
    name,
    x: (index % 4) * cell,
    y: Math.floor(index / 4) * cell,
    width: cell,
    height: cell,
  })),
  animations: {
    blink: [
      { frame: 0, duration: 2400 },
      { frame: 1, duration: 90 },
      { frame: 2, duration: 140 },
      { frame: 3, duration: 90 },
    ],
    idle: [
      { frame: 4, duration: 850 },
      { frame: 5, duration: 650 },
      { frame: 6, duration: 650 },
      { frame: 7, duration: 850 },
    ],
    companion: [
      { frame: 0, duration: 1600 },
      { frame: 1, duration: 90 },
      { frame: 2, duration: 140 },
      { frame: 3, duration: 90 },
      { frame: 4, duration: 850 },
      { frame: 5, duration: 650 },
      { frame: 6, duration: 650 },
      { frame: 7, duration: 850 },
    ],
  },
};
await fs.writeFile(
  path.join(assetDirectory, 'chami.json'),
  JSON.stringify(manifest, null, 2) + '\n',
);
await sharp(frames, { join: { animated: true } })
  .gif({
    loop: 0,
    delay: manifest.animations.companion.map((step) => step.duration),
    effort: 7,
    dither: 0,
  })
  .toFile(path.join(outputDirectory, 'chami-preview.gif'));
for (const file of [
  'chami-spritesheet.png',
  'chami-spritesheet.webp',
  'chami-avatar.png',
  'chami.json',
]) {
  await fs.copyFile(path.join(assetDirectory, file), path.join(outputDirectory, file));
}
const { data: exported, info: exportedInfo } = await sharp(sheet)
  .raw()
  .toBuffer({ resolveWithObject: true });
let transparentPixels = 0;
for (let y = 0; y < exportedInfo.height; y++) {
  for (let x = 0; x < exportedInfo.width; x++) {
    const alpha = exported[(y * exportedInfo.width + x) * 4 + 3];
    if (!alpha) transparentPixels++;
    const localX = x % cell;
    const localY = y % cell;
    if (alpha && (localX < 48 || localX >= cell - 48 || localY < 48 || localY >= cell - 48)) {
      throw new Error('A sprite reaches its transparent safety margin.');
    }
  }
}
console.log(
  JSON.stringify(
    {
      frames: frames.length,
      width: exportedInfo.width,
      height: exportedInfo.height,
      transparent: transparentPixels > 0,
      paths: assetDirectory,
    },
    null,
    2,
  ),
);
