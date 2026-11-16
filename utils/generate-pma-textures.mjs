import { writeFileSync } from 'node:fs';
import { Buffer } from 'node:buffer';
import process from 'node:process';
import { fileURLToPath, URL } from 'node:url';
import { join, resolve } from 'node:path';
import { deflateSync } from 'node:zlib';

const TEXTURE_SIZE_PX = 128;
const RGBA_CHANNELS = 4;
const BYTE_MAX = 255;
const PNG_BIT_DEPTH = 8;
const PNG_RGBA_COLOR_TYPE = 6;
const PNG_CHUNK_LENGTH_BYTES = 4;
const PNG_CRC_BYTES = 4;
const BITS_PER_BYTE = 8;
const PNG_IHDR_SIZE_BYTES = 13;
const PNG_BIT_DEPTH_OFFSET = 8;
const PNG_COLOR_TYPE_OFFSET = 9;
const CRC_POLYNOMIAL = 0xedb88320; // PNG's standard reversed CRC-32 polynomial.
const CRC_INITIAL = 0xffffffff;
const RGB = [255, 144, 48];
// Leave a transparent border around a solid center and a broad soft edge.
const DISC_RADIUS_PX = 58;
const SOFT_EDGE_WIDTH_PX = 28;

function chunk(type, data) {
  const payload = Buffer.concat([Buffer.from(type), data]);
  let crc = CRC_INITIAL;
  for (const byte of payload) {
    crc ^= byte;
    for (let bit = 0; bit < BITS_PER_BYTE; bit++) {
      crc = (crc >>> 1) ^ (crc & 1 ? CRC_POLYNOMIAL : 0);
    }
  }
  const length = Buffer.alloc(PNG_CHUNK_LENGTH_BYTES);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(PNG_CRC_BYTES);
  checksum.writeUInt32BE((crc ^ CRC_INITIAL) >>> 0);
  return Buffer.concat([length, payload, checksum]);
}

// Export the straight counterpart for pixel comparisons in browser checks.
export function createAlphaTexture(premultiplied = true) {
  const rowBytes = TEXTURE_SIZE_PX * RGBA_CHANNELS + 1; // PNG filter byte per row.
  const pixels = Buffer.alloc(rowBytes * TEXTURE_SIZE_PX);
  const center = (TEXTURE_SIZE_PX - 1) / 2;
  for (let y = 0; y < TEXTURE_SIZE_PX; y++) {
    for (let x = 0; x < TEXTURE_SIZE_PX; x++) {
      const distance = Math.hypot(x - center, y - center);
      const coverage = Math.max(0, Math.min(1, (DISC_RADIUS_PX - distance) / SOFT_EDGE_WIDTH_PX));
      const alpha = Math.round(BYTE_MAX * coverage);
      const offset = y * rowBytes + 1 + x * RGBA_CHANNELS;
      for (let channel = 0; channel < RGB.length; channel++) {
        pixels[offset + channel] = premultiplied ? Math.round((RGB[channel] * alpha) / BYTE_MAX) : RGB[channel];
      }
      pixels[offset + RGB.length] = alpha;
    }
  }
  const header = Buffer.alloc(PNG_IHDR_SIZE_BYTES);
  header.writeUInt32BE(TEXTURE_SIZE_PX, 0);
  header.writeUInt32BE(TEXTURE_SIZE_PX, PNG_CHUNK_LENGTH_BYTES);
  header[PNG_BIT_DEPTH_OFFSET] = PNG_BIT_DEPTH;
  header[PNG_COLOR_TYPE_OFFSET] = PNG_RGBA_COLOR_TYPE;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature.
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(pixels)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const outputDirectory = process.argv[2] ?? fileURLToPath(new URL('../demo/pma/', import.meta.url));
  writeFileSync(join(resolve(outputDirectory), 'pma.png'), createAlphaTexture());
  writeFileSync(join(resolve(outputDirectory), 'straight.png'), createAlphaTexture(false));
}
