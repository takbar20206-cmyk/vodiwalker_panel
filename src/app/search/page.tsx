'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useApp } from '@/components/AppProvider';
import { Avatar } from '@/components/Nav';
import { Tabs, Empty, Loading } from '@/components/UI';

function SearchInner() {
  const sp = useSearchParams();
  const { t, lang } = useApp();
  const [q, setQ] = useState(sp.get('q') || '');
  const [type, setType] = useState('all');
  const [data, setData] = useState<any>({ players: [], games: [], clans: [], clips: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const query = sp.get('q');
    if (query) setQ(query);
  }, [sp]);

  useEffect(() => {
    if (!q.trim()) { setData({ players: [], games: [], clans: [], clips: [] }); return; }
    const ctrl = new AbortController();
    const tm = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(q)}&type=${type}`, { signal: ctrl.signal });
        if (r.ok) setData(await r.json());
      } catch { /* aborted */ }
      finally { setLoading(false); }
    }, 220);
    return () => { clearTimeout(tm); ctrl.abort(); };
  }, [q, type]);

  const empty = data.players.length + data.games.length + data.clans.length + data.clips.length === 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 fade-in">
      <h1 className="text-2xl font-black mb-4">🔎 {t('search')}</h1>
      <input
        className="input !text-base"
        placeholder={t('search_placeholder')}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        autoFocus
        maxLength={80}
      />
      <div className="mt-4">
        <Tabs
          tabs={[
            { id: 'all', label: t('filter_all') },
            { id: 'players', label: t('search_players') },
            { id: 'games', label: t('games') },
            { id: 'clans', label: t('nav_clans') },
            { id: 'clips', label: t('search_clips') },
          ]}
          active={type}
          onChange={setType}
        />
      </div>

      <div className="mt-6 space-y-6">
        {loading && <Loading />}
        {!loading && q && empty && <Empty icon="⌕" title={t('search_no_results')} />}
        {!q && <Empty icon="🔎" title={t('search_placeholder')} />}

        {data.players?.length > 0 && (
          <Section title={`👥 ${t('search_players')}`}>
            {data.players.map((p: any) => (
              <a key={`p${p.id}`} href={`/${p.username}`} className="flex items-center gap-3 p-3 card card-hover">
                <Avatar avatar={p.avatar_path} name={p.display_name || p.username} level={p.level} size={44} />
                <div className="min-w-0">
                  <div className="font-bold text-sm">{p.display_name || p.username}</div>
                  <div className="text-mute text-xs">@{p.username} {p.country && `· ${p.country}`}</div>
                  {p.bio && <div className="text-mute text-xs truncate">{p.bio}</div>}
                </div>
                <span className="badge ms-auto shrink-0">LV {p.level}</span>
              </a>
            ))}
          </Section>
        )}

        {data.games?.length > 0 && (
          <Section title={`🎮 ${t('games')}`}>
            {data.games.map((g: any) => (
              <a key={`g${g.id}`} href={`/games`} className="flex items-center gap-3 p-3 card card-hover">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={g.cover_path} alt="" className="w-16 h-10 rounded-md object-cover" loading="lazy" />
                <div>
                  <div className="font-bold text-sm" style={{ color: g.accent }}>{lang === 'fa' ? g.name_fa : g.name}</div>
                  <div className="text-mute text-xs">{g.name}</div>
                </div>
              </a>
            ))}
          </Section>
        )}

        {data.clans?.length > 0 && (
          <Section title={`🛡 ${t('nav_clans')}`}>
            {data.clans.map((c: any) => (
              <a key={`c${c.id}`} href={`/clans/${c.slug}`} className="flex items-center gap-3 p-3 card card-hover">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#9b6bff] to-[#4d5cff] flex items-center justify-center font-black">{c.name[0]}</div>
                <div>
                  <div className="font-bold text-sm">{c.name}</div>
                  <div className="text-mute text-xs">LV {c.level} · {c.members_count} {t('members')}</div>
                </div>
              </a>
            ))}
          </Section>
        )}

        {data.clips?.length > 0 && (
          <Section title={`🎬 ${t('search_clips')}`}>
            {data.clips.map((c: any) => (
              <a key={`cl${c.id}`} href="/explore" className="flex items-center gap-3 p-3 card card-hover">
                <div className="w-16 h-10 rounded-md bg-[#151a29] flex items-center justify-center">▶</div>
                <div className="min-w-0">
                  <div className="font-bold text-sm truncate">{c.title}</div>
                  <div className="text-mute text-xs">@{c.username} · {c.views} {t('views')}</div>
                </div>
              </a>
            ))}
          </Section>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-black tracking-widest text-[#00a8ff] uppercase mb-2">{title}</div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchInner />
    </Suspense>
  );
}
