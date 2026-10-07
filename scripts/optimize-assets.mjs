import sharp from 'sharp';
import fs from 'node:fs/promises';
const source = 'src/assets/Hamster.png',
  target = 'src/assets/Hamster.webp';
await sharp(source)
  .resize({ width: 384, height: 384, fit: 'inside', withoutEnlargement: true })
  .webp({ quality: 90, alphaQuality: 100 })
  .toFile(target);
console.log(
  JSON.stringify({ before: (await fs.stat(source)).size, after: (await fs.stat(target)).size }),
);
