// Generates apps/desktop/build/icon.png (512x512, brand gradient, rounded
// corners) using only Node built-ins — no image libraries required.
// electron-builder derives .ico/.icns from this single 512px PNG.
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const SIZE = 512;
const RADIUS = 112;
const TOP = [99, 102, 241]; // #6366f1
const BOTTOM = [34, 211, 238]; // #22d3ee

function inRoundedRect(x, y) {
  const r = RADIUS;
  const cx = Math.min(Math.max(x, r), SIZE - 1 - r);
  const cy = Math.min(Math.max(y, r), SIZE - 1 - r);
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= r * r;
}

// Raw scanlines: each row = 1 filter byte (0) + RGBA * SIZE
const raw = Buffer.alloc((SIZE * 4 + 1) * SIZE);
let offset = 0;
for (let y = 0; y < SIZE; y++) {
  raw[offset++] = 0; // filter: none
  const t = y / (SIZE - 1);
  for (let x = 0; x < SIZE; x++) {
    if (inRoundedRect(x, y)) {
      raw[offset++] = Math.round(TOP[0] + (BOTTOM[0] - TOP[0]) * t);
      raw[offset++] = Math.round(TOP[1] + (BOTTOM[1] - TOP[1]) * t);
      raw[offset++] = Math.round(TOP[2] + (BOTTOM[2] - TOP[2]) * t);
      raw[offset++] = 255;
    } else {
      offset += 4; // transparent
    }
  }
}

// ── PNG encoding ────────────────────────────────────────────────
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  crcTable[n] = c >>> 0;
}
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
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

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // color type: RGBA
ihdr[10] = 0; // compression
ihdr[11] = 0; // filter
ihdr[12] = 0; // interlace

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', zlib.deflateSync(raw)),
  chunk('IEND', Buffer.alloc(0)),
]);

const out = path.join(__dirname, '..', 'build', 'icon.png');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, png);
console.log('Wrote', out, `(${png.length} bytes)`);
