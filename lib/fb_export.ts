// يستخرج المنشورات والصور من ملفات JSON داخل «تنزيل معلوماتك» من فيسبوك.
// الشكل يتغير بين الإصدارات، فالمحلل متسامح: يبحث في كل الكائنات عن ما يشبه المنشور.

export type FbPost = { key: string; ts: number; text: string; media: string[] };

// فيسبوك يكتب بايتات UTF-8 كأنها أحرف Latin-1 (فتظهر العربية رموزاً مشوّهة). نعيدها لأصلها.
export function fixMojibake(s: string): string {
  if (!/[\u0080-ÿ]/.test(s)) return s;
  for (let i = 0; i < s.length; i++) if (s.charCodeAt(i) > 255) return s;
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(s, (c) => c.charCodeAt(0)));
  } catch {
    return s;
  }
}

const IMG = /\.(jpe?g|png|webp)$/i;
type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);

function collectMedia(node: unknown, out: string[]) {
  if (Array.isArray(node)) return node.forEach((n) => collectMedia(n, out));
  if (!isObj(node)) return;
  const uri = node.uri;
  if (typeof uri === 'string' && IMG.test(uri) && !out.includes(uri)) out.push(uri);
  for (const v of Object.values(node)) if (typeof v === 'object') collectMedia(v, out);
}

function collectCaptions(node: unknown, out: string[]) {
  if (Array.isArray(node)) return node.forEach((n) => collectCaptions(n, out));
  if (!isObj(node)) return;
  const m = node.media;
  if (isObj(m) && typeof m.description === 'string' && m.description.trim()) out.push(m.description);
  for (const v of Object.values(node)) if (typeof v === 'object') collectCaptions(v, out);
}

export function extractPosts(json: unknown): FbPost[] {
  const found: FbPost[] = [];
  const visit = (node: unknown, depth: number) => {
    if (depth > 8) return;
    if (Array.isArray(node)) return node.forEach((n) => visit(n, depth + 1));
    if (!isObj(node)) return;
    const looksLikePost = typeof node.timestamp === 'number' && (Array.isArray(node.data) || Array.isArray(node.attachments));
    if (looksLikePost) {
      const texts: string[] = [];
      for (const d of (node.data as unknown[]) ?? []) if (isObj(d) && typeof d.post === 'string' && d.post.trim()) texts.push(d.post);
      if (texts.length === 0) collectCaptions(node.attachments, texts);
      const text = fixMojibake(texts.join('\n').trim());
      const media: string[] = [];
      collectMedia(node.attachments, media);
      if (text || media.length) found.push({ key: `${node.timestamp}|${text.slice(0, 40)}`, ts: node.timestamp as number, text, media });
      return;
    }
    for (const v of Object.values(node)) if (typeof v === 'object') visit(v, depth + 1);
  };
  visit(json, 0);
  return found;
}
