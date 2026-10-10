export type Listing = {
  id: number;
  title: string;
  description: string | null;
  price: number;
  category: string;
  city: string;
  imageUrl: string | null;
  sellerName: string;
  sellerPhone: string | null;
  createdAt: Date;
  isFeatured?: boolean;
};

export const CATEGORIES = [
  { slug: 'cars', label: 'سيارات', icon: '🚗' },
  { slug: 'real-estate', label: 'عقارات', icon: '🏠' },
  { slug: 'electronics', label: 'إلكترونيات', icon: '📱' },
  { slug: 'furniture', label: 'أثاث', icon: '🛋️' },
  { slug: 'jobs', label: 'وظائف', icon: '💼' },
  { slug: 'services', label: 'خدمات', icon: '🛠️' },
];

export const CITIES = ['دمشق', 'حلب', 'حمص', 'اللاذقية', 'حماة', 'طرطوس'];

const d = (days: number) => new Date(Date.now() - days * 86400000);

export const SAMPLE_LISTINGS: Listing[] = [
  { id: 1, title: 'هيونداي إلنترا 2018 بحالة ممتازة', description: 'سيارة نظيفة جداً، صيانة دورية، فل أوبشن، ممشى 80 ألف كم.', price: 14500, category: 'cars', city: 'دمشق', imageUrl: null, sellerName: 'أحمد', sellerPhone: '0900000001', createdAt: d(1), isFeatured: true },
  { id: 2, title: 'شقة 120 متر في المزة للبيع', description: 'طابق ثالث، إطلالة مفتوحة، اكساء ديلوكس، قريبة من الخدمات.', price: 85000, category: 'real-estate', city: 'دمشق', imageUrl: null, sellerName: 'مكتب الأمان', sellerPhone: '0900000002', createdAt: d(2), isFeatured: true },
  { id: 3, title: 'آيفون 13 برو 256GB', description: 'مستعمل بحالة الوكالة مع العلبة والشاحن، بطارية 91%.', price: 650, category: 'electronics', city: 'حلب', imageUrl: null, sellerName: 'سامر', sellerPhone: '0900000003', createdAt: d(0) },
  { id: 4, title: 'غرفة نوم كاملة خشب زان', description: 'سرير مع خزانة وكومودينات، حالة جيدة جداً.', price: 900, category: 'furniture', city: 'حمص', imageUrl: null, sellerName: 'ليلى', sellerPhone: '0900000004', createdAt: d(4) },
  { id: 5, title: 'مطلوب محاسب بدوام كامل', description: 'خبرة سنتين على الأقل، إتقان إكسل، الراتب حسب الخبرة.', price: 300, category: 'jobs', city: 'اللاذقية', imageUrl: null, sellerName: 'شركة النور', sellerPhone: '0900000005', createdAt: d(3) },
  { id: 6, title: 'خدمات صيانة وتركيب مكيفات', description: 'صيانة وتعبئة غاز وتركيب، خدمة سريعة في جميع المناطق.', price: 20, category: 'services', city: 'حماة', imageUrl: null, sellerName: 'ورشة الأمين', sellerPhone: '0900000006', createdAt: d(5) },
];
