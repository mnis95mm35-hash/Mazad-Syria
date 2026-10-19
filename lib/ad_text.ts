import { CITIES } from '@/lib/sample_data';
import { SUBCATEGORIES, areasOf } from '@/lib/taxonomy';

// يستخرج حقول الإعلان من نص حرّ (مثل منشور كتبه البائع نفسه). تخمين تقريبي لا يغني عن مراجعة الحقول.
export type ParsedAd = {
  title: string;
  description: string;
  price: number | null;
  currency: 'USD' | 'SYP' | null;
  city: string | null;
  area: string | null;
  category: string | null;
  subcategory: string | null;
  phone: string | null;
  sellerName: string | null;
  rooms: number | null;
  sizeM2: number | null;
  carYear: number | null;
  carKm: number | null;
};

const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

export function normalizeDigits(s: string): string {
  return s.replace(/[٠-٩۰-۹]/g, (c) => {
    const i = AR_DIGITS.indexOf(c);
    return String(i >= 0 ? i : FA_DIGITS.indexOf(c));
  });
}

// ينظّف بقايا النسخ من فيسبوك: روابط الوسوم بصيغة markdown، وأزرار «عرض المزيد»، والزخارف
export function cleanPostText(raw: string, keepTags = false): string {
  return normalizeDigits(raw)
    .replace(/\r/g, '')
    .replace(/\[([^\]]*)\]\((?:[^()]|\([^)]*\))*\)/g, '$1')
    .replace(/https?:\/\/\S+/g, '')
    .split('\n')
    .map((l) => l.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}‎‏]/gu, '').replace(/[_]{3,}|[-=*]{3,}/g, '').trim())
    .filter((l) => l && !/^(عرض أقل|عرض المزيد|see more|see less|…؟?)$/i.test(l) && (keepTags || !/^(#\S+\s*)+$/.test(l)))
    .join('\n');
}

// يفصل نصاً فيه عدة منشورات. الأولوية: فاصل --- ثم ترقيم متسلسل 1 2 3 ثم الأسطر الفارغة
export function splitPosts(raw: string): string[] {
  const text = normalizeDigits(raw).replace(/\r/g, '').trim();
  if (!text) return [];
  if (/^\s*(-{3,}|={3,})\s*$/m.test(text)) {
    return text.split(/^\s*(?:-{3,}|={3,})\s*$/m).map((p) => p.trim()).filter(Boolean);
  }
  // ترقيم متسلسل: سطر يبدأ بالرقم 1 ثم 2 ثم 3... متبوعاً بنص أو بسطر فارغ
  const lines = text.split('\n');
  const starts: number[] = [];
  let expect = 1;
  lines.forEach((l, i) => {
    const m = /^\s*(\d{1,3})\s*[.)\-:]?\s*(?=\D|$)/.exec(l);
    if (m && Number(m[1]) === expect && (starts.length > 0 || expect === 1)) {
      starts.push(i);
      expect++;
    }
  });
  if (starts.length >= 2) {
    return starts
      .map((s, k) => lines.slice(s, starts[k + 1] ?? lines.length).join('\n').replace(/^\s*\d{1,3}\s*[.)\-:]?\s*/, '').trim())
      .filter(Boolean);
  }
  return text.split(/\n\s*\n+/).map((p) => p.trim()).filter(Boolean);
}

const CATEGORY_WORDS: [string, RegExp][] = [
  ['real-estate', /(شقة|شقه|بيت|منزل|فيلا|فلل|أرض|ارض|دونم|عقار|محل|مكتب|مزرعة|مزارع|للإيجار|للايجار|طابو|طابق|م2|م²)/],
  ['cars', /(سيارة|سياره|موديل|كيلومتر|كم\s|بنزين|مازوت|أوتوماتيك|اوتوماتيك|محرك|نيسان|تويوتا|هيونداي|كيا|مرسيدس|بي إم|شيفروليه)/],
  ['electronics', /(جوال|موبايل|ايفون|آيفون|iphone|samsung|سامسونج|لابتوب|حاسوب|كمبيوتر|تلفزيون|شاشة|بلايستيشن|ايباد|آيباد|ساعة ذكية)/],
  ['furniture', /(غرفة نوم|طقم|كنب|أريكة|ثلاجة|غسالة|براد|مطبخ|سجاد|خزانة|مكيف|فرن|بوتاجاز)/],
  ['jobs', /(مطلوب|وظيفة|فرصة عمل|نحتاج موظف|دوام)/],
  ['services', /(خدمة|خدمات|توصيل|صيانة|تصليح|نقل عفش|تصميم|دروس|تدريس)/],
];

// الترتيب مهم: نبحث عن "ريف دمشق" قبل "دمشق"
function findCity(text: string): string | null {
  const sorted = [...CITIES].sort((a, b) => b.length - a.length);
  return sorted.find((c) => text.includes(c)) ?? null;
}

const NOT_NAME = /(واتس|واتساب|للتواصل|هاتف|جوال|موبايل|اتصال|اتصل|رقم|تواصل|للاستفسار|call|whatsapp)/i;

// يبحث عن الهاتف سطراً سطراً (لئلا تلتصق أرقام من أسطر مختلفة). الأرقام تقبل مسافات وشرطات داخلها
function findPhones(text: string): { phone: string; line: string }[] {
  const out: { phone: string; line: string }[] = [];
  for (const line of text.split('\n')) {
    const re = /(?:\+|00)?(?:963[\s-]?)?0?[\s-]?(9(?:[\s-]?\d){8})(?!\d)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(line))) {
      out.push({ phone: `0${m[1].replace(/\D/g, '')}`, line });
    }
  }
  return out;
}

function findSellerName(text: string): string | null {
  for (const line of text.split('\n')) {
    if (!findPhones(line).length) continue;
    const before = line.split(/(?:\+|00)?[\d][\d\s-]{7,}/)[0] ?? '';
    const words = before
      .replace(/[:_\-•،,.]/g, ' ')
      .split(/\s+/)
      .filter((w) => w && !NOT_NAME.test(w));
    const name = words.slice(-3).join(' ');
    if (name.length >= 2 && !/\d/.test(name)) return name;
  }
  return null;
}

function findPrice(text: string): { price: number; currency: 'USD' | 'SYP' } | null {
  const unit = '(\\$|دولار|دولارا|usd|ليرة|ل\\.?\\s?س|syp|مليون|ملايين|الف|ألف|آلاف|الاف)?';
  const num = '(\\d{1,3}(?:[,٬]\\d{3})+|\\d+(?:\\.\\d+)?)';
  const patterns = [
    new RegExp(`(?:السعر|بسعر|المطلوب|سعر|الأجرة|الاجرة)\\s*[:=]?\\s*${num}\\s*${unit}\\s*${unit}`, 'i'),
    new RegExp(`${num}\\s*${unit}\\s*(\\$|دولار|usd|ليرة|ل\\.?\\s?س|syp)`, 'i'),
    new RegExp(`\\$\\s*${num}()()`, 'i'),
  ];
  for (const re of patterns) {
    const m = re.exec(text);
    if (!m) continue;
    let n = Number(m[1].replace(/[,٬]/g, ''));
    if (!Number.isFinite(n) || n <= 0) continue;
    const words = `${m[2] ?? ''} ${m[3] ?? ''}`.toLowerCase();
    if (/مليون|ملايين/.test(words)) n *= 1_000_000;
    else if (/الف|ألف|آلاف|الاف/.test(words)) n *= 1000;
    const syp = /ليرة|ل\.?\s?س|syp|مليون|ملايين/.test(words);
    const usd = /\$|دولار|usd/.test(words) || re === patterns[2];
    return { price: n, currency: syp && !usd ? 'SYP' : 'USD' };
  }
  return null;
}

function findSize(text: string): number | null {
  // دونم = 1000 م² في سوريا. "2 دونم ونصف" = 2500
  const d = /(\d+(?:\.\d+)?)\s*دونم(\s*و\s*نصف)?/.exec(text);
  if (d) return Math.round((Number(d[1]) + (d[2] ? 0.5 : 0)) * 1000);
  const m = /(?:مساحة|مساحته|المساحة)\s*[:=]?\s*(\d{2,6})/.exec(text) ?? /(\d{2,5})\s*(?:م2|م²|متر)/.exec(text);
  return m ? Number(m[1]) : null;
}

function findRooms(text: string): number | null {
  const m = /(\d{1,2})\s*(?:نوم|غرف|غرفة)/.exec(text);
  const n = m ? Number(m[1]) : null;
  return n && n >= 1 && n <= 20 ? n : null;
}

export function parseAdText(raw: string): ParsedAd {
  const text = cleanPostText(raw);
  // الوسوم (#طرطوس_...) تحمل غالباً اسم المدينة والمنطقة، فنستخدمها للكشف فقط وليس للوصف
  const withTags = cleanPostText(raw, true).replace(/_/g, ' ');
  const phones = findPhones(text);
  const phone = phones[0]?.phone ?? null;
  const price = findPrice(text);
  const city = findCity(withTags);
  const sellerName = findSellerName(text);
  // المنطقة الأكثر تحديداً: نتجاهل «مدينة X» العامة ونفضّل الاسم الأطول
  const flat = withTags;
  const area = city
    ? ([...areasOf(city)].filter((a) => !a.startsWith('مدينة ')).sort((a, b) => b.length - a.length).find((a) => flat.includes(a)) ?? null)
    : null;

  let category: string | null = null;
  for (const [slug, re] of CATEGORY_WORDS) {
    if (new RegExp(re.source, 'i').test(text)) {
      category = slug;
      break;
    }
  }
  let subcategory: string | null = null;
  if (category === 'cars') {
    const hit = (SUBCATEGORIES.cars ?? []).find((s) => s.slug !== 'other-cars' && text.includes(s.label));
    subcategory = hit?.slug ?? null;
  }
  if (category === 'real-estate') {
    if (/(للإيجار|للايجار|ايجار|إيجار)/.test(text)) subcategory = 'apartment-rent';
    else if (/(أرض|ارض|دونم|مزرعة|مزارع)/.test(text)) subcategory = 'land';
    else if (/(محل|مكتب)/.test(text)) subcategory = 'shops-offices';
    else if (/(فيلا|فلل|بيت|منزل)/.test(text)) subcategory = 'houses-villas';
    else if (/(شقة|شقه)/.test(text)) subcategory = 'apartment-sale';
  }

  // الوصف: كل الأسطر ما عدا أسطر التواصل القصيرة (فيها رقم هاتف) وتُحوَّل شرطات القوائم إلى نقاط
  const bodyLines = text
    .split('\n')
    .filter((l) => !(findPhones(l).length && l.length < 70))
    .map((l) => l.replace(/^[_\-•*#]+\s*/, '• ').replace(/^•\s*$/, ''))
    .filter(Boolean);
  const description = bodyLines.join('\n').slice(0, 4000);

  let title = (bodyLines[0] ?? '').replace(/^[•#*\-\s]+/, '').slice(0, 120).trim();
  if (title && !/(للبيع|للإيجار|للايجار|مطلوب|للتقبيل)/.test(text) && ['real-estate', 'cars', 'electronics', 'furniture'].includes(category ?? '')) {
    title = `للبيع: ${title}`.slice(0, 120);
  }

  const home = category === 'real-estate' && subcategory !== 'land' && subcategory !== 'shops-offices';
  return {
    title,
    description,
    price: price?.price ?? null,
    currency: price?.currency ?? null,
    city,
    area,
    category,
    subcategory,
    phone,
    sellerName,
    rooms: home ? findRooms(text) : null,
    sizeM2: category === 'real-estate' ? findSize(text) : null,
    carYear: category === 'cars' ? (Number(/\b(19[89]\d|20[0-3]\d)\b/.exec(text)?.[1]) || null) : null,
    carKm: category === 'cars' ? (Number(/(\d{3,7})\s*(?:كم|km)/i.exec(text)?.[1]) || null) : null,
  };
}
