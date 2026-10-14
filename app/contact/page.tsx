import StaticPage from '@/components/layout/static_page';
import { SITE } from '@/lib/site_config';

export const metadata = {
  title: 'اتصل بنا | مزاد سوريا',
  description: 'تواصل مع فريق مزاد سوريا للاستفسارات والبلاغات والإعلانات المميزة.',
  alternates: { canonical: '/contact' },
};

export default function ContactPage() {
  const wa = (text: string) => `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(text)}`;
  return (
    <StaticPage title="اتصل بنا">
      <p>أسرع طريقة للوصول إلينا هي واتساب. نردّ عادةً خلال ساعات العمل.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <a
          href={wa('مرحباً، لدي استفسار عن مزاد سوريا')}
          className="block rounded-2xl bg-green-600 px-5 py-4 text-center font-bold !text-white !no-underline hover:bg-green-700"
        >
          💬 استفسار عام
        </a>
        <a
          href={wa('مرحباً، أريد الاستفسار عن الإعلانات المميزة وباقات التجّار')}
          className="block rounded-2xl bg-emerald-900 px-5 py-4 text-center font-bold !text-white !no-underline hover:bg-emerald-800"
        >
          ⭐ الإعلانات المميزة والتجّار
        </a>
      </div>
      <h2>أنواع الطلبات</h2>
      <ul>
        <li>
          <strong>بلاغ عن إعلان:</strong> زر «إبلاغ» في صفحة الإعلان أسرع، وإن لزم أرسل لنا رقم الإعلان.
        </li>
        <li>
          <strong>حذف حسابك أو بياناتك:</strong> أرسل لنا من البريد المسجّل في حسابك. يمكنك أيضاً حذف إعلاناتك بنفسك من صفحة «حسابي».
        </li>
        <li>
          <strong>مشكلة تقنية:</strong> اذكر الصفحة التي واجهت فيها المشكلة ونوع جهازك.
        </li>
      </ul>
    </StaticPage>
  );
}
