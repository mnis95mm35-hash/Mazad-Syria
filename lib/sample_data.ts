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
  featuredUntil?: Date | null;
  images?: string[];
  status?: 'pending' | 'active' | 'hidden' | 'blocked';
  userId?: string | null;
  currency?: 'USD' | 'SYP';
  subcategory?: string | null;
  area?: string | null;
  expiresAt?: Date | null;
};

export const CATEGORIES = [
  { slug: 'cars', label: 'سيارات', icon: '🚗' },
  { slug: 'real-estate', label: 'عقارات', icon: '🏠' },
  { slug: 'electronics', label: 'إلكترونيات', icon: '📱' },
  { slug: 'furniture', label: 'أثاث', icon: '🛋️' },
  { slug: 'jobs', label: 'وظائف', icon: '💼' },
  { slug: 'services', label: 'خدمات', icon: '🛠️' },
];

// المحافظات السورية الأربع عشرة
export const CITIES = [
  'دمشق',
  'ريف دمشق',
  'حلب',
  'حمص',
  'حماة',
  'اللاذقية',
  'طرطوس',
  'إدلب',
  'دير الزور',
  'الرقة',
  'الحسكة',
  'درعا',
  'السويداء',
  'القنيطرة',
];
