'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useApp } from './AppProvider';

const PARTICLES = Array.from({ length: 26 }, (_, i) => i);
const FLOAT_ICONS = ['🎮', '🕹️', '⚔️', '🏆', '🎯', '💀', '🔥', '👑', '🔫', '⚡'];

export function HomeHero() {
  const { t } = useApp();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const particles = useMemo(
    () =>
      PARTICLES.map((i) => ({
        left: `${(i * 37) % 100}%`,
        top: `${40 + ((i * 53) % 60)}%`,
        animationDuration: `${5 + (i % 6)}s`,
        animationDelay: `${(i % 9) * 0.7}s`,
      })),
    []
  );

  return (
    <section className="relative overflow-hidden min-h-[86vh] flex items-center">
      {/* animated gradient base */}
      <div className="absolute inset-0 hero-glow" />
      <div className="absolute inset-0 hero-grid" />

      {mounted && particles.map((p, i) => <span key={i} className="particle" style={p} />)}

      {/* floating gaming icons */}
      {mounted &&
        FLOAT_ICONS.map((ic, i) => (
          <span
            key={ic + i}
            className="float-icon"
            style={{
              left: `${6 + ((i * 17) % 88)}%`,
              top: `${12 + ((i * 29) % 70)}%`,
              animationDelay: `${i * 0.8}s`,
              animationDuration: `${6 + (i % 4)}s`,
              fontSize: `${1.4 + (i % 3) * 0.7}rem`,
            }}
          >
            {ic}
          </span>
        ))}

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-20 w-full text-center">
        <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-xs font-bold text-[#7cc9ff] mb-8 fade-in">
          <span className="dot-online" />
          {t('join_free')} — Your Gaming Identity.
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight mb-6 fade-in" style={{ animationDelay: '0.1s' }}>
          <span className="neon-text">{t('hero_title')}</span>
        </h1>

        <p className="max-w-2xl mx-auto text-[15px] sm:text-lg text-[#9aa3b8] leading-relaxed mb-10 fade-in" style={{ animationDelay: '0.2s' }}>
          {t('hero_sub')}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 fade-in" style={{ animationDelay: '0.3s' }}>
          <Link href="/register" className="btn-neon text-sm sm:text-base px-8 py-4 w-full sm:w-auto">
            ⚡ {t('cta_create')}
          </Link>
          <Link href="/players" className="btn-ghost text-sm sm:text-base px-8 py-4 w-full sm:w-auto">
            👥 {t('cta_explore')}
          </Link>
        </div>

        {/* stats strip */}
        <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto fade-in" style={{ animationDelay: '0.45s' }}>
          {[
            ['XP & Levels', '📈'],
            ['Achievements', '🏆'],
            ['Squad Finder', '🎯'],
            ['ClipZone', '🎬'],
          ].map(([label, ic]) => (
            <div key={label} className="glass glass-hover rounded-2xl py-4 px-3">
              <div className="text-xl mb-1">{ic}</div>
              <div className="text-xs font-bold text-[#c5cde0]">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#05060a] to-transparent pointer-events-none" />
    </section>
  );
}
