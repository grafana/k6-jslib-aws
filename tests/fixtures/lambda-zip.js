// Package a handler in a single stored ZIP entry without an external tool.
export function lambdaZip(source) {
  const name = new TextEncoder().encode("index.js");
  const content = new TextEncoder().encode(source);
  let crc = 0xffffffff;
  for (const byte of content) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) {
      crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
  }
  crc = (crc ^ 0xffffffff) >>> 0;
  const localSize = 30 + name.length + content.length;
  const centralSize = 46 + name.length;
  const archive = new Uint8Array(localSize + centralSize + 22);
  const view = new DataView(archive.buffer);
  const u16 = (offset, value) => view.setUint16(offset, value, true);
  const u32 = (offset, value) => view.setUint32(offset, value, true);
  u32(0, 0x04034b50);
  u16(4, 20);
  u16(12, 33); // 1980-01-01
  u32(14, crc);
  u32(18, content.length);
  u32(22, content.length);
  u16(26, name.length);
  archive.set(name, 30);
  archive.set(content, 30 + name.length);
  const central = localSize;
  u32(central, 0x02014b50);
  u16(central + 4, 20);
  u16(central + 6, 20);
  u16(central + 14, 33);
  u32(central + 16, crc);
  u32(central + 20, content.length);
  u32(central + 24, content.length);
  u16(central + 28, name.length);
  archive.set(name, central + 46);
  const end = localSize + centralSize;
  u32(end, 0x06054b50);
  u16(end + 8, 1);
  u16(end + 10, 1);
  u32(end + 12, centralSize);
  u32(end + 16, localSize);
  return archive.buffer;
}
