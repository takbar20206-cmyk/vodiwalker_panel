'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/components/AppProvider';
import { Avatar } from '@/components/Nav';
import { Tabs, Loading, ErrorBox, Empty } from '@/components/UI';

type Row = {
  id: number;
  username: string;
  display_name: string;
  avatar_path: string | null;
  level: number;
  xp: number;
  country: string;
  achievements_count: number;
  period_xp: number;
};

export default function LeaderboardPage() {
  const { t, user } = useApp();
  const [scope, setScope] = useState('global');
  const [period, setPeriod] = useState('all');
  const [game, setGame] = useState(0);
  const [games, setGames] = useState<{ id: number; name: string }[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewerRank, setViewerRank] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [country, setCountry] = useState('');

  useEffect(() => {
    fetch('/api/games').then((r) => r.json()).then((d) => setGames(d.games || [])).catch(() => {});
  }, []);

  const load = useCallback(
    async (p = 1) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ scope, period, page: String(p) });
        if (game) params.set('game', String(game));
        if (scope === 'country' && country) params.set('country', country);
        const r = await fetch(`/api/leaderboard?${params}`, { cache: 'no-store' });
        if (!r.ok) throw new Error((await r.json()).error || 'Failed');
        const d = await r.json();
        setRows(d.rows);
        setPages(d.pages);
        setPage(d.page);
        setViewerRank(d.viewerRank);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    },
    [scope, period, game, country]
  );

  useEffect(() => { load(1); }, [load]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 fade-in">
      <div className="mb-6 flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black">🏆 {t('nav_leaderboard')}</h1>
          <p className="text-mute text-sm mt-1">XP-based rankings — global & period filters</p>
        </div>
        {viewerRank && (
          <div className="glass rounded-xl px-4 py-2 text-sm font-bold">
            {t('rank')}: <span className="neon-text">#{viewerRank}</span>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <Tabs
          tabs={[
            { id: 'global', label: `🌍 ${t('leaderboard_global')}` },
            { id: 'country', label: `🏳 ${t('leaderboard_country')}` },
          ]}
          active={scope}
          onChange={setScope}
        />
        <div className="flex-1" />
        <Tabs
          tabs={[
            { id: 'weekly', label: t('leaderboard_weekly') },
            { id: 'monthly', label: t('leaderboard_monthly') },
            { id: 'all', label: t('leaderboard_all') },
          ]}
          active={period}
          onChange={setPeriod}
        />
      </div>

      <div className="flex flex-wrap gap-3 mb-5">
        {scope === 'country' && (
          <input className="input !w-40" placeholder={t('country')} value={country} onChange={(e) => setCountry(e.target.value)} maxLength={60} />
        )}
        <select className="input !w-52" value={game} onChange={(e) => setGame(Number(e.target.value))}>
          <option value={0}>🎮 {t('leaderboard_game')}: {t('all')}</option>
          {games.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      </div>

      {loading && <Loading />}
      {error && <ErrorBox message={error} onRetry={() => load(1)} />}
      {!loading && !error && rows.length === 0 && <Empty icon="🏆" />}

      {!loading && rows.length > 0 && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: 70 }}>{t('rank')}</th>
                  <th>{t('search_players')}</th>
                  <th>{t('level')}</th>
                  <th>{t('xp')}</th>
                  <th className="hidden sm:table-cell">{t('achievements_count')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const rank = (page - 1) * 25 + i + 1;
                  const isMe = user?.id === r.id;
                  return (
                    <tr key={r.id} className={isMe ? 'bg-[#00a8ff]/8' : ''}>
                      <td>
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-black ${
                          rank === 1 ? 'rank-1' : rank === 2 ? 'rank-2' : rank === 3 ? 'rank-3' : 'bg-[#151a29] text-mute'
                        }`}>
                          {rank}
                        </span>
                      </td>
                      <td>
                        <Link href={`/${r.username}`} className="flex items-center gap-3 hover:text-[#7cc9ff] transition min-w-[180px]">
                          <Avatar avatar={r.avatar_path} name={r.display_name || r.username} size={36} />
                          <div>
                            <div className="font-bold text-sm">{r.display_name || r.username} {isMe && <span className="badge !text-[9px] ms-1">{t('you')}</span>}</div>
                            <div className="text-mute text-xs">@{r.username} {r.country && `· ${r.country}`}</div>
                          </div>
                        </Link>
                      </td>
                      <td><span className="badge">LV {r.level}</span></td>
                      <td className="font-black text-[#7cc9ff]">{period === 'all' ? r.xp : r.period_xp}</td>
                      <td className="hidden sm:table-cell">🏅 {r.achievements_count}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {page < pages && (
        <div className="flex justify-center gap-2 mt-5">
          <button className="btn-ghost !py-2 text-sm" disabled={page <= 1} onClick={() => load(page - 1)}>← {t('prev')}</button>
          <span className="self-center text-mute text-sm px-3">{page} {t('of')} {pages}</span>
          <button className="btn-ghost !py-2 text-sm" disabled={page >= pages} onClick={() => load(page + 1)}>{t('next')} →</button>
        </div>
      )}
    </div>
  );
}
