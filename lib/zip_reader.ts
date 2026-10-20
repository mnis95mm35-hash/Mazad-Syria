// قارئ ZIP يعمل في المتصفح بلا مكتبات: يقرأ الفهرس من آخر الملف ثم يفك الملفات المطلوبة فقط،
// فلا يُحمَّل تصدير فيسبوك الضخم كله في الذاكرة. يدعم Zip64 والأسماء العربية.

export type ZipEntry = { name: string; method: number; flags: number; compSize: number; size: number; offset: number; file: Blob };

const u16 = (d: DataView, o: number) => d.getUint16(o, true);
const u32 = (d: DataView, o: number) => d.getUint32(o, true);
const u64 = (d: DataView, o: number) => Number(d.getBigUint64(o, true));

export async function readZip(file: Blob): Promise<ZipEntry[]> {
  const size = file.size;
  if (size < 22) throw new Error('الملف ليس ZIP صالحاً.');
  const tailLen = Math.min(size, 66000);
  const tail = new DataView(await file.slice(size - tailLen).arrayBuffer());
  let eocd = -1;
  for (let i = tailLen - 22; i >= 0; i--) {
    if (u32(tail, i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('الملف ليس ZIP صالحاً أو لم يكتمل تنزيله.');

  let cdSize = u32(tail, eocd + 12);
  let cdOffset = u32(tail, eocd + 16);
  if (u16(tail, eocd + 10) === 0xffff || cdSize === 0xffffffff || cdOffset === 0xffffffff) {
    const loc = eocd - 20;
    if (loc >= 0 && u32(tail, loc) === 0x07064b50) {
      const z64 = u64(tail, loc + 8);
      const z = new DataView(await file.slice(z64, z64 + 56).arrayBuffer());
      if (u32(z, 0) === 0x06064b50) {
        cdSize = u64(z, 40);
        cdOffset = u64(z, 48);
      }
    }
  }

  const cd = new DataView(await file.slice(cdOffset, cdOffset + cdSize).arrayBuffer());
  const dec = new TextDecoder();
  const out: ZipEntry[] = [];
  let p = 0;
  while (p + 46 <= cd.byteLength && u32(cd, p) === 0x02014b50) {
    const flags = u16(cd, p + 8);
    const method = u16(cd, p + 10);
    let compSize = u32(cd, p + 20);
    let usize = u32(cd, p + 24);
    const nl = u16(cd, p + 28);
    const el = u16(cd, p + 30);
    const cl = u16(cd, p + 32);
    let offset = u32(cd, p + 42);
    const name = dec.decode(new Uint8Array(cd.buffer, p + 46, nl));
    let q = p + 46 + nl;
    const end = q + el;
    while (q + 4 <= end) {
      const id = u16(cd, q);
      const len = u16(cd, q + 2);
      if (id === 1) {
        let r = q + 4;
        if (usize === 0xffffffff) { usize = u64(cd, r); r += 8; }
        if (compSize === 0xffffffff) { compSize = u64(cd, r); r += 8; }
        if (offset === 0xffffffff) offset = u64(cd, r);
      }
      q += 4 + len;
    }
    if (!name.endsWith('/')) out.push({ name: name.replace(/\\/g, '/'), method, flags, compSize, size: usize, offset, file });
    p += 46 + nl + el + cl;
  }
  return out;
}

const MIME: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
export const mimeOf = (name: string) => MIME[name.split('.').pop()?.toLowerCase() ?? ''] ?? 'application/octet-stream';

export async function entryBlob(e: ZipEntry): Promise<Blob> {
  if (e.flags & 1) throw new Error('الملف مشفّر.');
  const head = new DataView(await e.file.slice(e.offset, e.offset + 30).arrayBuffer());
  const start = e.offset + 30 + u16(head, 26) + u16(head, 28);
  const data = e.file.slice(start, start + e.compSize, mimeOf(e.name));
  if (e.method === 0) return data;
  if (e.method !== 8) throw new Error('طريقة ضغط غير مدعومة.');
  if (typeof DecompressionStream === 'undefined') throw new Error('المتصفح قديم، جرّب Chrome أو Safari حديث.');
  const stream = data.stream().pipeThrough(new DecompressionStream('deflate-raw'));
  const blob = await new Response(stream).blob();
  return new Blob([blob], { type: mimeOf(e.name) });
}

export async function entryText(e: ZipEntry): Promise<string> {
  return (await entryBlob(e)).text();
}
