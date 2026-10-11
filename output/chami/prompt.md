# Chami artwork prompts

Mode: built-in image generation, followed by a built-in layout refinement. Reference: the user-provided dog spritesheet in samo.zip; its pixel-art appearance and small animation changes informed the design.

## Initial generation

Use case: stylized-concept.
Asset type: production sprite animation sheet for Chami, the future cat study companion in a mobile MedTech Mate web app.
Primary request: Create a compact eight-frame spritesheet of ONE consistent Persian calico cat named Chami, with a simple blink and tiny idle movements.
Style guide from the inspected Samo dog spritesheet: cute low-resolution 2D pixel art, fluffy rounded silhouette, large head, short legs, small triangular ears, warm dark pixel outlines, clear chunky pixel clusters, very limited flat-color shading, charming tiny expression changes. Use this visual language as the guide, but create a CAT, not a dog. Do not reproduce the magenta background artifacts of the reference.
Subject: female Persian cat, thick long plush fur, round flat Persian face, tiny short muzzle, little pink nose, small rounded triangular ears, big gentle amber eyes, softly smiling cat mouth, whiskers, large fluffy curled tail. Chami has orange and near-black fur as her dominant coat colors (together about 85–90% of the coat); only a small cream-white chin and chest tuft and tiny front toe tips (10–15%). Warm copper orange plus deep charcoal black irregular calico patches. Pick one distinctive face and body patch pattern and preserve it IDENTICALLY in all eight frames. Definitely not a mostly white cat. Full body sitting, facing front with her fluffy tail curled beside the body. No clothes, collar, props, hearts or effects.
Layout: exactly FOUR equal columns and TWO equal rows, eight square sprite cells, row-major left to right. Preferred whole-sheet size 1536 x 768 pixels (each cell 384 square), or the same exact 2:1 proportions at an equivalent resolution. Cells perfectly aligned with no borders, separators, padding between cells or labels. Each complete cat centered at the same coordinates inside its cell, seated paws on an identical baseline at about 86% of cell height. Keep all tails and fur tips within their own cell; leave modest transparent padding around the complete cat. Match scale and head position across all eight sprites so animation does not jitter.
Frame order:
Top row 0: neutral seated cat, eyes fully open.
Top row 1: same cat and pose, eyelids halfway closed.
Top row 2: same cat and pose, both eyes gently fully closed for a blink.
Top row 3: same cat and pose, eyelids halfway open, exactly matching frame 1.
Bottom row 4: neutral eyes-open cat matching frame 0, settled idle.
Bottom row 5: same seated eyes-open cat with the smallest chest expansion for breathing, paws fixed.
Bottom row 6: same eyes-open cat with tiny relaxed tail-tip shift only, body and paws fixed.
Bottom row 7: same eyes-open neutral seated cat back at rest, matching frame 4.
Constraints: precisely 8 consistent frames; changes limited to eyelids and very small breathing/tail-tip movements. No walking, jumping, spinning, new poses, differently colored cats, changes of coat pattern, changes of body scale, or changes of viewpoint. Clean readable pixel art that still looks cute at 96 pixels tall. No text, names, captions, watermark, tile grid, scenery, cast shadow or background.
Scene/backdrop: genuinely transparent alpha background for the entire sheet, including all spaces between sprites. Never paint a checkerboard. Do not add colored rectangles.

## Layout refinement

Edit the supplied Chami spritesheet with ONE targeted correction: fix the sprite-cell layout and padding so it is usable as a real animation sheet. Preserve Chami's exact Persian cat appearance, pixel-art rendering, orange/black dominant calico patch identity, small cream-white chest and toes, amber eyes, and the same eight frame states. Do not change character design.
The existing sprites are too wide and run into adjacent cells. Recreate precisely 4 columns by 2 rows of eight equally spaced square transparent cells, a 2:1 canvas. Suggested canvas 1536x768 with eight 384x384 cells. Every sprite must be reduced to occupy ONLY 65–70% of its cell width and about 75% cell height, keeping at least 15% fully transparent margin on BOTH horizontal sides of EACH cell. At least 10% transparent margin top and bottom too. Keep the entire fluffy tail inside its cell; tail may be curled snugly against the body. All full-body cats, including their tails, must fit completely with generous transparent gutters between cats and away from outer canvas edges. NO neighboring sprites touching, NO cropping, NO overflow.
Keep paws on precisely the same baseline and cat face at precisely the same center position relative to each cell; all frames have the same scale. Left to right top row: eyes open, half closed, closed, half open. Left to right bottom row: relaxed open-eyed rest, very small chest expansion, tiny tail-tip sway, open-eyed rest again. Keep coat patches invariant and pose changes extremely subtle. No extra frames or objects.
Transparent alpha background everywhere outside each cat; no painted checkerboard, text, grid lines, tile outlines, shadows or colored rectangular artifacts.

## Export

The generated artwork was packed into equally sized transparent cells with Sharp. Artwork pixels were cropped, scaled uniformly with nearest-neighbor sampling, and placed on a fixed baseline; no character details were repainted. Source artwork is preserved in source-generated.png. Run `node scripts/pack-chami-sprites.mjs output/chami/source-generated.png` from the project root to recreate the exports.
