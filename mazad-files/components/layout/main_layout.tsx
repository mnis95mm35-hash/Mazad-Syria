import React from 'react';
import Navbar from '@/components/navbar/navbar';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Navbar />
      <main className="container mx-auto px-4 py-8">{children}</main>
      <footer className="border-t border-gray-200 py-6 text-center text-sm text-gray-500">
        © مزاد سوريا
      </footer>
    </div>
  );
}
