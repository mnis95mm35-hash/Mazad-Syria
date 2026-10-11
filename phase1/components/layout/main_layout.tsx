import React from 'react';
import Navbar from '@/components/navbar/navbar';
import Footer from '@/components/layout/footer';

export default function MainLayout({
  children,
  bare = false,
}: {
  children: React.ReactNode;
  bare?: boolean;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-stone-50" dir="rtl">
      <Navbar />
      <main className={bare ? 'flex-1' : 'container mx-auto flex-1 px-4 py-8'}>{children}</main>
      <Footer />
    </div>
  );
}
