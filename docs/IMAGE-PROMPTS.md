# IMAGE PROMPTS, HERO VIDEO, LOGO AND PHOTO PROCESSING

Everything about pictures for Albada (البدع) is here. The website prompt (`PROMPT.md`) tells your coding tool to follow this file.

## 0. Read this first (honest notes)
1. **The three screenshots from the client** (`references/03-client-photos-reference-only/`) are other shops' ads. They carry those shops' names and phone numbers, and they are low-quality screenshots. They can't be "enhanced" and used legally or cleanly, so they are style references only. Ask the client for his own original photos instead (phone photos are fine, see section 6).
2. **AI product photos can mislead customers.** An AI picture of "Naimi lamb" can't show what Naimi lamb really looks like, and Naimi, Najdi and Harri will look almost the same. Use AI images for the hero, backgrounds and as stand-ins until real photos exist. When AI images are used on product pages, add a small label "صورة توضيحية" / "Illustrative image". Real photos of the real meat sell better and avoid complaints.
3. **Never ask an AI image tool to write Arabic text** inside an image. It garbles the letters. All Arabic and English text stays on the website as real text. This is also why the logo was drawn from real font outlines (section 5).
4. I could not generate pictures or video from here. Run the prompts below in your image or video tool.

## 1. THE STYLE BLOCK (identical for every image)
Copy this block word for word into every image prompt. Only replace `{SUBJECT}`. Do not edit any other word, so all images match in style, color and light.

```
Premium studio food photograph of {SUBJECT}. Shot on a dark charcoal slate surface against a seamless deep burgundy backdrop with a soft radial glow (center #A51D26 fading to #4A0A0F at the edges). Warm soft key light from the upper left, gentle rim light from behind, soft realistic shadows, shallow depth of field, ultra sharp texture, natural realistic meat color, high-end butcher catalog look. Square 1:1 composition, the subject centered and filling about 65% of the frame with clean empty space around it. One small rosemary sprig and 5-6 black peppercorns are the only props. No text, no letters, no logos, no watermark, no packaging branding, no hands, no people, no price tags.
```

**Negative prompt** (if your tool has one):
```
text, letters, Arabic writing, English writing, logo, watermark, label, price tag, hands, people, cartoon, illustration, plastic look, oversaturated, blurry, extra bones, deformed meat, fake marbling, cluttered background, different backdrop color, neon colors
```

**How to keep all images the same**
- Use the same model, the same size (2048x2048), and the same settings for all of them.
- Generate the first image (the hero still or Hawar meat). When you like it, use it as the **style reference image** for every next one (image reference or "style reference" feature), and keep the same seed if your tool has one.
- Make 4 versions per product and pick the best. Reject any image with text, odd bones, or a different backdrop.
- Save as PNG or JPG into a folder called `images-raw/` with the exact file names in the table below. The script in section 4 turns them into the final website files.

## 2. THE SUBJECT LINE FOR EACH PRODUCT
File name = the product id in `data/products.json`. Replace `{SUBJECT}` in the style block with the text in the right column.

| File name | `{SUBJECT}` |
|---|---|
| `hawar-local.png` | raw fresh young camel (hawar) meat, bone-in chunks and ribs in a loose pile, lean deep-red meat with thin creamy fat |
| `hawar-local-boneless.png` | raw fresh boneless young camel meat, thick lean cubes and one thick slab, deep red, very little fat |
| `naimi-local.png` | raw fresh lamb shoulder pieces on the bone, rosy pink meat with clean white fat |
| `najdi-local.png` | raw fresh lamb leg pieces on the bone, rosy pink meat with clean white fat, different arrangement from the shoulder |
| `harri-local.png` | four raw fresh lamb rib chops with the bones showing, rosy pink meat with white fat |
| `goat-local.png` | raw fresh goat meat pieces on the bone, darker leaner meat with very little fat |
| `calf-local.png` | raw fresh calf meat cut with the bone, pale pink-red meat, thin white fat |
| `calf-local-boneless.png` | raw fresh boneless calf meat cubes and one thick slice, pale pink-red |
| `burger-meat.png` | five raw red-meat burger patties fanned out in a row, round and even, with thin baking paper between them |
| `burger-hawar.png` | five raw young camel burger patties fanned out in a row, deep red, round and even, thin baking paper between them |
| `burger-beef.png` | an open plain white unbranded cardboard box with six raw beef burger patties stacked with baking paper between them |
| `kabsa-barriah-2.png` | a large plated serving of Arabian kabsa for two: spiced golden rice topped with tender lamb pieces, toasted nuts and fried onions, light steam, shown at a three-quarter angle (leave out the rosemary and peppercorns for this one) |

Notes: Naimi, Najdi and Harri are breeds. The picture can't show the breed, so each one uses a different cut to avoid three identical photos. The breed name stays in the product title on the page.

## 3. HERO IMAGE AND LIVE HERO VIDEO (right under the header on the home page)

### 3.1 Still image (also used as the video poster)
Use the same style block, with these two subjects. Ask for the composition in the prompt.
- **Portrait 9:16 (phones, 1080x1920)**: `{SUBJECT}` = a thick dry-aged lamb rack and a heavy butcher's knife resting beside it, low in the frame. The top 40% of the image stays empty deep burgundy glow (for the headline).
- **Landscape 16:9 (desktop, 1920x1080)**: `{SUBJECT}` = a thick dry-aged lamb rack and a heavy butcher's knife, placed on the LEFT third of the frame. The right half stays empty deep burgundy glow (the Arabic headline sits on the right).
Change "Square 1:1 composition, the subject centered and filling about 65% of the frame" in the style block to the composition above for these two images only.

### 3.2 Live video, option A: AI (image-to-video)
Give your video tool the approved still image and this prompt:
```
Slow cinematic push-in, 8 seconds, seamless loop. Subtle motion only: a few salt flakes fall in slow motion onto the meat, soft steam rises, the warm light flickers very slightly, the camera drifts about 3% closer. No cuts, no people, no hands, no text, no logos. Keep the burgundy backdrop and the colors identical to the still image.
```
Make it twice: 9:16 for phones and 16:9 for desktop. If the loop isn't seamless, play the clip forward then backward (ping-pong) in an editor.

### 3.3 Live video, option B: film it at the shop (best result)
Shoot 6 to 10 clips of 4 to 8 seconds, with a phone on a tripod, at the highest quality, 60 fps if possible (for slow motion). Window light, not the ceiling light. Clean dark surface.
1. A sharp knife slowly slicing a thick piece of meat (close up).
2. Salt or spices falling onto the meat in slow motion.
3. A fresh cut piece being placed on a tray or scale.
4. A slow side-to-side camera move across neatly arranged cuts.
5. A tray of burger patties, slow push-in.
6. A pan or grill with the meat sizzling (for a "ready to cook" feeling).
Rules: no faces unless the person agrees; no other brands' packaging; no phone numbers or signs in view; keep the subject in the middle third so it works in both portrait and landscape crops. Film both vertical (phone upright) and horizontal.

### 3.4 Turn the video into website files (ffmpeg)
Put the final edit in a file called `hero-source-portrait.mp4` and `hero-source-landscape.mp4`, then run:
```
ffmpeg -i hero-source-portrait.mp4 -t 8 -an -vf "scale=720:-2,fps=30" -c:v libx264 -profile:v main -crf 28 -preset slow -pix_fmt yuv420p -movflags +faststart public/hero/hero-portrait-720.mp4
ffmpeg -i hero-source-portrait.mp4 -t 8 -an -vf "scale=720:-2,fps=30" -c:v libvpx-vp9 -crf 36 -b:v 0 -row-mt 1 public/hero/hero-portrait-720.webm
ffmpeg -i hero-source-landscape.mp4 -t 8 -an -vf "scale=1280:-2,fps=30" -c:v libx264 -profile:v main -crf 28 -preset slow -pix_fmt yuv420p -movflags +faststart public/hero/hero-landscape-720.mp4
ffmpeg -i hero-source-landscape.mp4 -t 8 -an -vf "scale=1280:-2,fps=30" -c:v libvpx-vp9 -crf 36 -b:v 0 -row-mt 1 public/hero/hero-landscape-720.webm
ffmpeg -ss 0.5 -i hero-source-portrait.mp4 -frames:v 1 -vf "scale=720:-2" -q:v 3 public/hero/poster-portrait.jpg
ffmpeg -ss 0.5 -i hero-source-landscape.mp4 -frames:v 1 -vf "scale=1280:-2" -q:v 3 public/hero/poster-landscape.jpg
```
Each video file must be under 2.5 MB (raise `-crf` to 30 or 32 if it is bigger). No sound track (`-an`). The website picks the portrait set under 768px wide and the landscape set at 768px and wider, with JavaScript (`matchMedia`), because the `media` attribute doesn't work on video sources.

## 4. SCRIPT: SAME CROP, SIZE AND TONE FOR ALL PRODUCT IMAGES
Create `scripts/process-images.mjs` in the website project. Install once: `npm i -D sharp`. Put the raw images in `images-raw/` (named by product id, see the table). Run: `node scripts/process-images.mjs`. It writes `public/images/products/{id}.webp` (1600px) and `{id}-640.webp` (640px).
```js
import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';

const IN = 'images-raw';
const OUT = 'public/images/products';
await fs.mkdir(OUT, { recursive: true });

for (const file of await fs.readdir(IN)) {
  if (!/\.(png|jpe?g|webp)$/i.test(file)) continue;
  const id = path.parse(file).name;
  const base = sharp(path.join(IN, file))
    .rotate()
    .resize(1600, 1600, { fit: 'cover', position: 'attention' })
    .normalise({ lower: 1, upper: 99 })
    .modulate({ saturation: 1.04 })
    .sharpen({ sigma: 0.6 });
  await base.clone().webp({ quality: 82 }).toFile(path.join(OUT, `${id}.webp`));
  await base.clone().resize(640, 640).webp({ quality: 80 }).toFile(path.join(OUT, `${id}-640.webp`));
  console.log('done', id);
}
```
This script only makes real photos and AI images consistent (crop, brightness range, a little sharpening). It can't fix a bad photo or remove a messy background. For that, retake the photo.

## 5. THE LOGO
The logo is already made, in the folder `logo/`:
- `albada-logo-round.svg` — the client's round logo (red circle, beige ring, "البدع", a rule with a small cleaver, "ALBADA", the tagline). Footer, app icon, share image.
- `albada-mark.svg` — the same badge with only "البدع", readable down to favicon size (phone header, favicon).
- `albada-logo.svg` — badge + name block for beige backgrounds (desktop header).

How it was made: `node scripts/brand-albada.mjs`. The letters are the exact outlines of the original lettering ("البدع" in Lalezar, "ALBADA" in Playfair Display, the tagline in IBM Plex Sans Arabic), taken word by word from the first logo pack, so no font is needed and the Arabic stays correctly joined. Colors: red #A51D26, beige #F4ECDF, black #141110.
This is a clean first version. If the client wants a different mark (for example a camel silhouette), give these files to a designer as the layout and spacing base. Do not use an AI image tool to write the Arabic name.

## 6. IF YOU TAKE REAL PHOTOS (best option)
- Natural window light, no flash. Dark slate, dark board or deep red cloth as the surface. Same spot and same angle for every product.
- Top-down or 45 degrees, subject centered, the meat fresh and cleanly cut, no packaging, no hands, no shop clutter.
- Photograph each product the same way: one pile, then a close-up. Square or leave room to crop square.
- Name files by product id (see section 2) and put them in `images-raw/`.
