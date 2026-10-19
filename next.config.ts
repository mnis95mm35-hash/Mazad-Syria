import type { NextConfig } from "next";

// سياسة المحتوى: مُلزِمة في الإنتاج، وتجريبية (Report-Only) في التطوير حتى لا تعطّل أدوات التطوير.
// إن ظهر أي شيء محجوب على الموقع الحي، سترى في الكونسول سطراً يبدأ بـ "Refused to ..." يحدد المصدر.
const isProd = process.env.NODE_ENV === "production";
const csp = [
  "default-src 'self'",
  // وضع التطوير فقط: React يستخدم eval لتتبّع الأخطاء، ولا يُستخدم في الإنتاج
  `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"} https://challenges.cloudflare.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.supabase.co https://tile.openstreetmap.org",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co https://challenges.cloudflare.com",
  "frame-src https://challenges.cloudflare.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // 5 صور × 3 ميغابايت كحد أقصى للإعلان العادي، وصور استيراد المنشورات (دفعات صغيرة) + بقية الحقول
      bodySizeLimit: "40mb",
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=31536000" },
          { key: isProd ? "Content-Security-Policy" : "Content-Security-Policy-Report-Only", value: csp },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(self)" },
        ],
      },
    ];
  },
};

export default nextConfig;
