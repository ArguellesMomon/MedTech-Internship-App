import sharp from 'sharp';
import fs from 'node:fs/promises';
// Preserve the sprite grid dimensions; only compress the runtime assets.
// The PNGs remain the source and the delivery bundle retains the lossless sheet.
for (const name of ['chami-avatar', 'chami-spritesheet']) {
  const source = `src/assets/chami/${name}.png`;
  const target = `src/assets/chami/${name}.webp`;
  await sharp(source).webp({ quality: 90, alphaQuality: 100, effort: 6 }).toFile(target);
  console.log(
    JSON.stringify({
      name,
      before: (await fs.stat(source)).size,
      after: (await fs.stat(target)).size,
    }),
  );
}
