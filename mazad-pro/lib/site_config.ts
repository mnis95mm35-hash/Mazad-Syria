export const SITE = {
  name: 'مزاد سوريا',
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
