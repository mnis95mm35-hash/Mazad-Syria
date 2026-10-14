import type { NextConfig } from "next";

// سياسة المحتوى: تجريبية (Report-Only) أولاً، فلا تمنع شيئاً وتكتب أي مخالفة في كونسول المتصفح.
// بعد التأكد من خلوّ الكونسول من مخالفات على الموقع الحي نحوّلها إلى Content-Security-Policy.
const csp = [
  "default-src 'self'",
  // وضع التطوير فقط: React يستخدم eval لتتبّع الأخطاء، ولا يُستخدم في الإنتاج
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "production" ? "" : " 'unsafe-eval'"} https://challenges.cloudflare.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.supabase.co",
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
      // 5 صور × 3 ميغابايت كحد أقصى + بقية الحقول
      bodySizeLimit: "20mb",
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
          { key: "Content-Security-Policy-Report-Only", value: csp },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
