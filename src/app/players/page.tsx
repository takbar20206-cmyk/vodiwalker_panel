'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/components/AppProvider';
import { Avatar } from '@/components/Nav';
import { Loading, ErrorBox, Empty, XpBar } from '@/components/UI';

type Player = {
  id: number;
  username: string;
  display_name: string;
  bio: string;
  country: string;
  avatar_path: string | null;
  level: number;
  xp: number;
  followers_count: number;
};

export default function PlayersPage() {
  const { t } = useApp();
  const [players, setPlayers] = useState<Player[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    const tm = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(q)}&type=players`, { signal: ctrl.signal });
        if (!r.ok) throw new Error('Failed');
        const d = await r.json();
        setPlayers(d.players || []);
      } catch (e: any) {
        if (e.name !== 'AbortError') setError(e.message);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => { clearTimeout(tm); ctrl.abort(); };
  }, [q]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-black">👥 {t('nav_players')}</h1>
        <p className="text-mute text-sm mt-1">{t('hero_sub')}</p>
      </div>

      <div className="relative mb-6">
        <input
          className="input !ps-11"
          placeholder={t('search_placeholder')}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <span className="absolute start-4 top-1/2 -translate-y-1/2 text-mute">⌕</span>
      </div>

      {loading && <Loading />}
      {error && <ErrorBox message={error} />}
      {!loading && !error && players.length === 0 && <Empty icon="👥" />}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {players.map((p) => (
          <Link key={p.id} href={`/${p.username}`} className="card card-hover p-5 block">
            <div className="flex items-center gap-3">
              <Avatar avatar={p.avatar_path} name={p.display_name || p.username} level={p.level} size={54} ring />
              <div className="min-w-0 flex-1">
                <div className="font-extrabold truncate">{p.display_name || p.username}</div>
                <div className="text-mute text-xs">@{p.username} {p.country && `· ${p.country}`}</div>
                <div className="text-[11px] text-[#7cc9ff] font-bold mt-0.5">{p.followers_count} {t('followers')}</div>
              </div>
            </div>
            {p.bio && <p className="text-xs text-mute mt-3 line-clamp-2 leading-relaxed">{p.bio}</p>}
            <div className="mt-3"><XpBar xp={p.xp} level={p.level} /></div>
          </Link>
        ))}
      </div>
    </div>
  );
}
