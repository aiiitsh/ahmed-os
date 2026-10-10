// Generates public/icon-192.png and public/icon-512.png:
// a white glowing "A" on black, with no image dependencies (raw PNG via zlib).
import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
const crc32 = (buf) => {
  let c = 0xffffffff
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td))
  return Buffer.concat([len, td, crc])
}

function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

function render(size) {
  // Glyph in unit coordinates (0..1), kept inside the maskable safe zone.
  const segs = [
    [0.5, 0.27, 0.32, 0.73],
    [0.5, 0.27, 0.68, 0.73],
    [0.385, 0.57, 0.615, 0.57],
  ]
  const stroke = 0.045
  const raw = Buffer.alloc(size * (size * 3 + 1))
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0
    for (let x = 0; x < size; x++) {
      const u = (x + 0.5) / size, v = (y + 0.5) / size
      let d = Infinity
      for (const s of segs) d = Math.min(d, segDist(u, v, ...s))
      const edge = 1.2 / size
      const core = Math.max(0, Math.min(1, (stroke - d) / edge + 0.5))
      const glow = 0.55 * Math.exp(-((d / 0.05) ** 2)) + 0.25 * Math.exp(-((d / 0.12) ** 2))
      const halo = 0.1 * Math.exp(-(((u - 0.5) ** 2 + (v - 0.45) ** 2) / 0.08))
      const val = Math.round(255 * Math.min(1, core + glow * (1 - core) + halo))
      const o = y * (size * 3 + 1) + 1 + x * 3
      raw[o] = raw[o + 1] = raw[o + 2] = val
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

for (const s of [192, 512]) writeFileSync(new URL(`../public/icon-${s}.png`, import.meta.url), render(s))
console.log('icons written')
