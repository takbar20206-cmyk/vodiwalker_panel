import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const publicDir = join(root, 'public');
const resDir = join(root, 'android/app/src/main/res');

const iconSvg = readFileSync(join(publicDir, 'icon.svg'), 'utf8');
const maskableSvg = readFileSync(join(publicDir, 'icon-maskable.svg'), 'utf8');

function render(svg, width, height, outPath) {
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: width } });
  const image = resvg.render();
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, image.asPng());
  return `${width}x${height}`;
}

/** Dark splash canvas with the logo centred. */
function splashSvg(width, height) {
  const side = Math.min(width, height);
  const logo = Math.round(side * 0.3);
  const x = (width - logo) / 2;
  const y = (height - logo) / 2;
  const inner = iconSvg
    .replace(/<\?xml[^>]*\?>/g, '')
    .replace(/^<svg[^>]*>/, '')
    .replace(/<\/svg>\s*$/, '');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs><clipPath id="logo-clip"><rect width="512" height="512" rx="118" /></clipPath></defs>
    <rect width="${width}" height="${height}" fill="#070b16"/>
    <g transform="translate(${x} ${y}) scale(${logo / 512})"><g clip-path="url(#logo-clip)">${inner}</g></g>
  </svg>`;
}

const outputs = [];

// ---- Web / PWA -------------------------------------------------------------
for (const { size, name } of [
  { size: 192, name: 'icons/icon-192.png' },
  { size: 512, name: 'icons/icon-512.png' },
  { size: 180, name: 'icons/apple-touch-icon.png' },
  { size: 32, name: 'favicon.png' },
]) {
  outputs.push(render(iconSvg, size, size, join(publicDir, name)));
}
outputs.push(render(maskableSvg, 512, 512, join(publicDir, 'icons/maskable-512.png')));

// ---- Android ---------------------------------------------------------------
if (existsSync(resDir)) {
  const density = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };

  // Legacy launcher icons (API < 26). Adaptive icons use vector drawables.
  for (const [name, scale] of Object.entries(density)) {
    const legacy = Math.round(48 * scale);
    outputs.push(render(iconSvg, legacy, legacy, join(resDir, `mipmap-${name}/ic_launcher.png`)));
    outputs.push(render(maskableSvg, legacy, legacy, join(resDir, `mipmap-${name}/ic_launcher_round.png`)));
  }

  // Splash screens (mirrors the Capacitor template sizes).
  const splash = {
    'drawable': [480, 320],
    'drawable-land-mdpi': [320, 480],
    'drawable-land-hdpi': [480, 800],
    'drawable-land-xhdpi': [720, 1280],
    'drawable-land-xxhdpi': [960, 1600],
    'drawable-land-xxxhdpi': [1280, 1920],
    'drawable-port-mdpi': [320, 480],
    'drawable-port-hdpi': [480, 800],
    'drawable-port-xhdpi': [720, 1280],
    'drawable-port-xxhdpi': [960, 1600],
    'drawable-port-xxxhdpi': [1280, 1920],
  };
  for (const [folder, [width, height]] of Object.entries(splash)) {
    outputs.push(render(splashSvg(width, height), width, height, join(resDir, folder, 'splash.png')));
  }
}

console.log(`✓ generated ${outputs.length} icon/splash assets`);
