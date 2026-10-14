// آمن للاستخدام في الخادم والمتصفح (بلا اعتماديات)

// الصور الجديدة تُرفع بنسختين: -l (الكبيرة) و -s (المصغّرة 480px).
// الصور القديمة بلا نسخة مصغّرة، فنعيد رابطها كما هو.
export function thumbUrl<T extends string | null | undefined>(url: T): T | string {
  if (url && /-l\.webp$/.test(url)) return url.replace(/-l\.webp$/, '-s.webp');
  return url;
}
