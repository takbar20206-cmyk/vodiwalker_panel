'use client';
import Link from 'next/link';
import { useEffect } from 'react';
import { useApp } from '@/components/AppProvider';

export default function NotFound() {
  const { t } = useApp();
  useEffect(() => {
    document.title = `${t('not_found_title')} · GAMER ID`;
  }, [t]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 hero-glow opacity-50" />
      <div className="absolute inset-0 hero-grid" />
      <div className="relative text-center fade-in">
        <div className="text-7xl sm:text-9xl font-black neon-text opacity-90">{t('error_404')}</div>
        <div className="text-xl font-bold mt-4">{t('not_found_title')}</div>
        <p className="text-mute mt-2 text-sm max-w-md mx-auto">{t('not_found_desc')}</p>
        <Link href="/" className="btn-neon inline-block mt-8">← {t('back_home')}</Link>
      </div>
    </div>
  );
}
