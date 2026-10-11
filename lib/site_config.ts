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
  {
    id: 'business',
    name: 'باقة المعارض والشركات',
    price: '$49',
    period: 'شهرياً',
    features: ['إعلانات مميزة متعددة', 'صفحة خاصة بمعرضك', 'مساحة إعلانية بانر'],
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
