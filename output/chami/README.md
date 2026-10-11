# Chami spritesheet

Chami is a Persian calico cat designed from the user's description, guided by the small expressions and fluffy pixel-art style in the supplied dog spritesheet.

- Orange and black dominate the coat, with small cream-white markings.
- Eight frames on a transparent 4-column × 2-row sheet.
- Sheet: 1536 × 768 pixels. Each frame: 384 × 384 pixels.
- PNG and lossless WebP exports preserve transparency.
- `chami-avatar.png` is the first still frame.
- `chami.json` records the exact rectangles and suggested animation timing in milliseconds. Frame indices start at zero.

Open `preview.html` in a browser to see the blink, gentle breathing/tail movement, and light/dark backgrounds. It works offline when its adjacent spritesheet file is present. Animation starts paused when reduced motion is enabled.

`chami-preview.gif` is a portable animated preview of the combined sequence.

The top row is a blink sequence: open → half closed → closed → half open. The lower row is a subtle idle sequence: rest → breath → tail → settled. The combined preview uses both sequences with quiet pauses.

The built-in image generation tool created the artwork. `prompt.md` contains the prompts. The source artwork is retained in `source-generated.png`; `scripts/pack-chami-sprites.mjs` in the project exports equally padded frame cells without repainting the cat. Final assets also live in `src/assets/chami/` and are now integrated throughout the app.

Chami now replaces Pip in the landing page, dashboard, navigation, and study chat. The shared ChamiAvatar component animates larger placements, pauses when offscreen or hidden, and uses a still image for reduced motion and smaller avatars. Existing chat records are preserved.
