export const SITE = {
  name: 'مزاد سوريا',
  // عنوان الموقع الرسمي (يُستخدم في sitemap وروابط المشاركة)
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://mazad-syria.onrender.com').replace(/\/$/, ''),
  tagline: 'بيع واشترِ كل شيء في سوريا بسهولة وأمان',
  // ضع رقم واتساب الخاص بك (بصيغة دولية بدون +) في ملف .env.local:
  // NEXT_PUBLIC_WHATSAPP=963XXXXXXXXX
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP ?? '963900000000',
};

export type Plan = {
  id: string;
  name: string;
  price: string;
  period: string;
  features: string[];
  highlight?: boolean;
};

// الأسعار أدناه أمثلة مبدئية: عدّلها حسب سوقك
export const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'إعلان عادي',
    price: 'مجاني',
    period: '',
    features: ['نشر إعلان مع صورة', 'ظهور في نتائج البحث', 'تواصل مباشر مع المشترين'],
  },
  {
    id: 'featured-7',
    name: 'مميز 7 أيام',
    price: '$5',
    period: 'لكل إعلان',
    features: ['يظهر في أعلى الصفحة الرئيسية', 'شارة "مميز" على الإعلان', 'أولوية في نتائج البحث'],
    highlight: true,
  },
  {
    id: 'featured-30',
    name: 'مميز 30 يوماً',
    price: '$15',
    period: 'لكل إعلان',
    features: ['كل مزايا الإعلان المميز', 'مدة أطول بسعر أوفر', 'مناسب للسيارات والعقارات'],
  },
];

// خيارات تمييز الإعلان (أمثلة مبدئية: عدّل الأسعار حسب سوقك)
export const FEATURE_OPTIONS = [
  { days: 7, price: 5, label: '7 أيام' },
  { days: 30, price: 15, label: '30 يوماً' },
  { days: 90, price: 35, label: '90 يوماً' },
] as const;

export function featurePrice(days: number): number | null {
  return FEATURE_OPTIONS.find((o) => o.days === days)?.price ?? null;
}

// رابط واتساب جاهز لإرسال إثبات الدفع لطلب تمييز
export function featureRequestWhatsAppUrl(req: { id: number; listingId: number; days: number; amount: number }) {
  const text = `مرحباً، أرسلت طلب تمييز رقم ${req.id} للإعلان رقم ${req.listingId} لمدة ${req.days} يوماً بمبلغ $${req.amount}. هذا إثبات الدفع:`;
  return `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(text)}`;
}

// ===== باقات التجار (أسعار مبدئية: عدّلها حسب سوقك) =====
export type DealerPlanId = 'dealer' | 'dealer_pro';

// الحد الأقصى للإعلانات الفعّالة لمن ليس لديه اشتراك تاجر
export const FREE_LISTING_LIMIT = 5;

export const DEALER_PLANS: Record<
  DealerPlanId,
  { name: string; monthly: number; limit: number; features: string[] }
> = {
  dealer: {
    name: 'تاجر',
    monthly: 10,
    limit: 30,
    features: ['حتى 30 إعلاناً فعّالاً', 'صفحة عامة باسم معرضك', 'شعار ووصف وعنوان وأرقام تواصل'],
  },
  dealer_pro: {
    name: 'تاجر مميّز',
    monthly: 25,
    limit: 100,
    features: ['حتى 100 إعلان فعّال', 'شارة "موثّق" بعد مراجعة الإدارة', 'كل مزايا باقة تاجر'],
  },
};

// مدد الاشتراك: الاشتراك السنوي يُحسب بسعر 10 أشهر
export const DEALER_TERMS = [
  { months: 1, pay: 1, label: 'شهر' },
  { months: 3, pay: 3, label: '3 أشهر' },
  { months: 12, pay: 10, label: 'سنة (وفّر شهرين)' },
] as const;

export function isDealerPlan(v: unknown): v is DealerPlanId {
  return v === 'dealer' || v === 'dealer_pro';
}

export function dealerPrice(plan: DealerPlanId, months: number): number | null {
  const term = DEALER_TERMS.find((t) => t.months === months);
  return term ? DEALER_PLANS[plan].monthly * term.pay : null;
}

export function planRequestWhatsAppUrl(req: { id: number; plan: DealerPlanId; months: number; amount: number }) {
  const text = `مرحباً، أرسلت طلب اشتراك رقم ${req.id} في باقة ${DEALER_PLANS[req.plan].name} لمدة ${req.months} شهراً بمبلغ $${req.amount}. هذا إثبات الدفع:`;
  return `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(text)}`;
}
