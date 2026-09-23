'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/components/AppProvider';
import { Loading, ErrorBox } from '@/components/UI';

type Game = {
  id: number;
  slug: string;
  name: string;
  name_fa: string;
  genre: string;
  cover_path: string;
  accent: string;
  platforms: string;
};

export default function GamesPage() {
  const { t, lang } = useApp();
  const [games, setGames] = useState<Game[]>([]);
  const [playersByGame, setPlayersByGame] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/games', { cache: 'no-store' });
        if (!r.ok) throw new Error('Failed');
        const d = await r.json();
        setGames(d.games || []);
        // player counts for each game
        const counts: Record<number, number> = {};
        await Promise.all(
          (d.games || []).map(async (g: Game) => {
            try {
              const pr = await fetch(`/api/search?q=&type=players`);
              // fallback: not critical — leave 0 if not available
              counts[g.id] = 0;
            } catch { counts[g.id] = 0; }
          })
        );
        setPlayersByGame(counts);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-black">🎮 {t('nav_games')}</h1>
        <p className="text-mute text-sm mt-1">{t('connected_desc')}</p>
      </div>

      {loading && <Loading />}
      {error && <ErrorBox message={error} />}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {(games || []).map((g, i) => (
          <Link key={g.id} href={`/players`} className="card card-hover overflow-hidden group" style={{ animationDelay: `${i * 40}ms` }}>
            <div className="relative aspect-[16/10] overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={g.cover_path}
                alt={lang === 'fa' ? g.name_fa : g.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading={i < 4 ? 'eager' : 'lazy'}
              />
              <div className="absolute inset-0 cover-overlay" />
              <div className="absolute top-2 start-2 badge !text-[10px]" style={{ borderColor: `${g.accent}55`, color: g.accent }}>
                {g.genre || 'Game'}
              </div>
              <div className="absolute bottom-3 start-3 end-3">
                <div className="font-black text-lg leading-tight" style={{ color: g.accent, textShadow: '0 2px 12px rgba(0,0,0,0.8)' }}>
                  {lang === 'fa' ? g.name_fa : g.name}
                </div>
                <div className="text-[11px] text-[#c5cde0]/80 font-semibold">{g.platforms}</div>
              </div>
            </div>
            <div className="p-3 flex items-center justify-between text-xs">
              <span className="text-mute font-semibold">{g.name}</span>
              <span className="btn-ghost !py-1 !px-3 !text-[11px]">{t('add_game')} →</span>
            </div>
          </Link>
        ))}
      </div>

      {loading && <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">{[...Array(4)].map((_, i) => <div key={i} className="skeleton aspect-[16/12]" />)}</div>}
    </div>
  );
}
