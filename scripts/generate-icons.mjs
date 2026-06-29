/**
 * PWA Icon Generation Pipeline
 *
 * Source of truth: public/icon.svg
 *
 * Generates:
 *   - icon-{72,96,128,144,152,192,384,512}.png  (regular icons)
 *   - icon-{192,512}-maskable.png               (Android adaptive icons)
 *   - apple-touch-icon.png                      (180×180 Apple touch icon)
 *   - favicon.ico (via favicon.png)             (32×32 favicon)
 *
 * Run: node scripts/generate-icons.mjs
 */

import sharp from 'sharp';
import { readFileSync, mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const MASKABLE_SIZES = [
  { size: 192, paddingPercent: 0.12 },
  { size: 512, paddingPercent: 0.12 },
];
const APPLE_TOUCH_SIZE = 180;
const FAVICON_SIZE = 32;

async function generateIcons() {
  mkdirSync(join(root, 'public'), { recursive: true });

  const sourceSvg = readFileSync(join(root, 'public', 'icon.svg'), 'utf-8');

  // Detect if SVG has a viewBox to preserve aspect ratio
  const hasViewBox = /viewBox\s*=\s*["']([^"']+)["']/i.test(sourceSvg);

  // Extract background color from SVG (fallback to black)
  const bgMatch = sourceSvg.match(/stop-color=["']([^"']+)["']/i);
  const bgColor = bgMatch ? bgMatch[1] : '#000000';

  // 1. Generate regular icons
  console.log('Generating regular icons...');
  for (const size of SIZES) {
    await sharp(Buffer.from(sourceSvg))
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(join(root, 'public', `icon-${size}.png`));
    console.log(`  ✓ icon-${size}.png`);
  }

  // 2. Generate maskable icons (branding centered with padding for Android safe zone)
  console.log('\nGenerating maskable icons...');
  for (const { size, paddingPercent } of MASKABLE_SIZES) {
    const padding = Math.round(size * paddingPercent);
    const innerSize = size - padding * 2;

    // Create a solid background the same color as the icon's dominant color
    // Render the source SVG scaled down to fit within the safe zone
    const base = await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: bgColor,
      },
    })
      .composite([
        {
          input: await sharp(Buffer.from(sourceSvg))
            .resize(innerSize, innerSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .png()
            .toBuffer(),
          top: padding,
          left: padding,
        },
      ])
      .png()
      .toFile(join(root, 'public', `icon-${size}-maskable.png`));
    console.log(`  ✓ icon-${size}-maskable.png`);
  }

  // 3. Generate Apple touch icon (180×180)
  console.log('\nGenerating Apple touch icon...');
  await sharp(Buffer.from(sourceSvg))
    .resize(APPLE_TOUCH_SIZE, APPLE_TOUCH_SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(join(root, 'public', 'apple-touch-icon.png'));
  console.log('  ✓ apple-touch-icon.png');

  // 4. Generate favicon (32×32 PNG — modern browsers use PNG favicons)
  console.log('\nGenerating favicon...');
  const faviconPng = await sharp(Buffer.from(sourceSvg))
    .resize(FAVICON_SIZE, FAVICON_SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(join(root, 'public', 'favicon.png'));
  console.log('  ✓ favicon.png');

  console.log('\nAll icons generated successfully!');
  console.log('Source: public/icon.svg');
}

generateIcons().catch((err) => {
  console.error('Icon generation failed:', err);
  process.exit(1);
});
