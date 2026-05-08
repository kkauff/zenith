// Generates simple solid-color PWA icons + favicon using only built-in modules.
// Run once during scaffolding; the generated PNGs are committed to /public.
// Re-run if you change the brand color or icon size set.
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = resolve(__dirname, '..', 'public');
mkdirSync(PUBLIC, { recursive: true });

// Brand color (matches CSS --bg) and a contrasting accent for the "Z" mark.
const BG = [15, 23, 42]; // #0f172a
const FG = [56, 189, 248]; // #38bdf8

// PNG CRC table (one-time precompute).
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

// Render a square icon: solid BG with a centered stylized "Z" stroke in FG.
function renderIcon(size) {
  const stride = size * 4 + 1; // 1 filter byte per scanline + RGBA
  const raw = Buffer.alloc(stride * size);

  // The Z is composed of three bands: top horizontal, diagonal, bottom
  // horizontal. Coordinates are inset from the edges so it has padding.
  const inset = Math.round(size * 0.22);
  const thick = Math.max(2, Math.round(size * 0.1));
  const top = inset;
  const bot = size - inset;
  const left = inset;
  const right = size - inset;

  for (let y = 0; y < size; y++) {
    const rowStart = y * stride;
    raw[rowStart] = 0; // filter: None
    for (let x = 0; x < size; x++) {
      let c = BG;
      // Top bar
      if (y >= top && y < top + thick && x >= left && x < right) c = FG;
      // Bottom bar
      else if (y >= bot - thick && y < bot && x >= left && x < right) c = FG;
      else {
        // Diagonal: from (right, top) down-left to (left, bot).
        // Pixel is on the diagonal if its (x,y) is within `thick` of the line.
        // Line: (x - right) / (left - right) == (y - top) / (bot - top)
        const t = (y - top) / (bot - top);
        if (t >= 0 && t <= 1) {
          const lineX = right + (left - right) * t;
          if (Math.abs(x - lineX) < thick / 2) c = FG;
        }
      }
      const px = rowStart + 1 + x * 4;
      raw[px] = c[0];
      raw[px + 1] = c[1];
      raw[px + 2] = c[2];
      raw[px + 3] = 255;
    }
  }

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const idat = deflateSync(raw);
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const sizes = [
  ['pwa-192x192.png', 192],
  ['pwa-512x512.png', 512],
  ['apple-touch-icon.png', 180],
];

for (const [name, size] of sizes) {
  writeFileSync(resolve(PUBLIC, name), renderIcon(size));
  console.log(`wrote ${name} (${size}x${size})`);
}

// Favicon: tiny SVG version of the same Z. Browsers render SVG favicons fine.
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="18" fill="#0f172a"/>
  <path d="M28 28 H72 L32 72 H72" stroke="#38bdf8" stroke-width="10" fill="none" stroke-linecap="square" stroke-linejoin="miter"/>
</svg>
`;
writeFileSync(resolve(PUBLIC, 'favicon.svg'), favicon);
console.log('wrote favicon.svg');
