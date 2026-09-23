'use client';
import { useEffect, useState } from 'react';
import { useApp } from '@/components/AppProvider';
import { Avatar } from '@/components/Nav';
import { Tabs, Loading, ErrorBox, Empty } from '@/components/UI';
import { timeAgo } from '@/components/ReportButton';

const TABS = ['dashboard', 'users', 'posts', 'clips', 'comments', 'games', 'achievements', 'clans', 'reports', 'challenges'] as const;
type Tab = (typeof TABS)[number];

export default function AdminPage() {
  const { t, user, loading, toast, lang } = useApp();
  const [tab, setTab] = useState<Tab>('dashboard');
  const [data, setData] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // inline create forms
  const [gameForm, setGameForm] = useState({ name: '', name_fa: '', genre: '', accent: '#00a8ff', platforms: 'PC' });
  const [achForm, setAchForm] = useState({ slug: '', name: '', name_fa: '', description: '', description_fa: '', icon: 'trophy', xp_reward: 50 });
  const [chForm, setChForm] = useState({ slug: '', title: '', title_fa: '', description: '', description_fa: '', kind: 'daily', xp_reward: 100, proof_required: true });

  const load = async (tb: Tab = tab) => {
    setIsLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/admin?tab=${tb}`, { cache: 'no-store' });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error || 'Failed');
      }
      setData(await r.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role === 'admin') load(tab);
    else if (user && user.role !== 'admin') { setError(t('admin_only')); setIsLoading(false); }
  }, [tab, user]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <div className="max-w-6xl mx-auto px-4 py-10"><Loading /></div>;

  const act = async (payload: Record<string, unknown>) => {
    setBusy(true);
    try {
      const r = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      toast('✓');
      load();
    } catch (e: any) { toast(e.message, 'error'); } finally { setBusy(false); }
  };

  const stats = data.stats;
  const label = (id: Tab) => ({
    dashboard: `📊 ${t('admin_dashboard')}`,
    users: `👥 ${t('admin_users')}`,
    posts: `📝 ${t('admin_posts')}`,
    clips: `🎬 ${t('admin_clips')}`,
    comments: `💬 ${t('admin_comments')}`,
    games: `🎮 ${t('admin_games')}`,
    achievements: `🏆 ${t('admin_achievements')}`,
    clans: `🛡 ${t('admin_clans')}`,
    reports: `🚨 ${t('admin_reports')}`,
    challenges: `⚡ ${t('admin_challenges')}`,
  }[id]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 fade-in">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <h1 className="text-2xl font-black">🛡 GAMER ID — {t('nav_admin')}</h1>
        <span className="badge badge-hot">ADMIN · @{user?.username}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[230px_1fr] gap-5">
        <nav className="flex md:flex-col gap-1.5 overflow-x-auto pb-2 md:pb-0">
          {TABS.map((tb) => (
            <button key={tb} onClick={() => setTab(tb)} className={`tab text-start whitespace-nowrap ${tab === tb ? 'active' : ''}`}>
              {label(tb)}
            </button>
          ))}
        </nav>

        <div>
          {error && <ErrorBox message={error} onRetry={() => load()} />}
          {isLoading && <Loading />}

          {!isLoading && !error && tab === 'dashboard' && stats && (
            <div className="space-y-5 fade-in">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <Stat label={t('total_users')} value={stats.total_users} icon="👥" />
                <Stat label={t('active_users')} value={stats.active_users} icon="⚡" />
                <Stat label={t('total_clips')} value={stats.total_clips} icon="🎬" />
                <Stat label={t('total_posts')} value={stats.total_posts} icon="📝" />
                <Stat label={t('total_clans')} value={stats.total_clans} icon="🛡" />
                <Stat label={t('reports_open')} value={stats.reports_open} icon="🚨" danger={stats.reports_open > 0} />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="card p-4">
                  <div className="text-xs font-black tracking-widest text-[#00a8ff] uppercase mb-3">{t('admin_users')} — latest</div>
                  <div className="space-y-2">
                    {(data.recentUsers || []).map((u: any) => (
                      <div key={u.id} className="flex items-center gap-2 text-sm p-2 bg-[#0d111c] rounded-lg">
                        <span className="font-bold">@{u.username}</span>
                        <span className="text-mute text-xs">{u.email}</span>
                        <span className="badge ms-auto">LV {u.level} · {u.xp}XP</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="card p-4">
                  <div className="text-xs font-black tracking-widest text-[#ff2e63] uppercase mb-3">{t('admin_reports')} — latest</div>
                  <div className="space-y-2">
                    {(data.recentReports || []).map((r: any) => (
                      <div key={r.id} className="flex items-center gap-2 text-sm p-2 bg-[#0d111c] rounded-lg">
                        <span className="badge badge-hot">{r.reason}</span>
                        <span className="text-mute text-xs">{r.target_type} #{r.target_id}</span>
                        <span className="ms-auto text-mute text-xs">{timeAgo(r.created_at)}</span>
                      </div>
                    ))}
                    {!(data.recentReports || []).length && <div className="text-mute text-sm">✓ {t('empty_title')}</div>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {!isLoading && !error && tab === 'users' && (
            <div className="card overflow-x-auto fade-in">
              <table className="tbl">
                <thead>
                  <tr><th>ID</th><th>{t('username')}</th><th>{t('email')}</th><th>{t('level')}</th><th>{t('xp')}</th><th>Status</th><th></th></tr>
                </thead>
                <tbody>
                  {(data.rows || []).map((u: any) => (
                    <tr key={u.id}>
                      <td className="text-mute">{u.id}</td>
                      <td>
                        <a href={`/${u.username}`} className="font-bold hover:text-[#7cc9ff]">@{u.username}</a>
                        {u.role === 'admin' && <span className="badge badge-hot ms-2 !text-[9px]">ADMIN</span>}
                      </td>
                      <td className="text-mute">{u.email}</td>
                      <td><span className="badge">LV {u.level}</span></td>
                      <td className="text-[#7cc9ff] font-bold">{u.xp}</td>
                      <td>{u.is_active ? <span className="badge badge-lime">ACTIVE</span> : <span className="badge badge-hot">BANNED</span>}</td>
                      <td>
                        {u.role !== 'admin' && (
                          <button
                            className={u.is_active ? 'btn-danger !py-1 !px-2 !text-[11px]' : 'btn-ghost !py-1 !px-2 !text-[11px]'}
                            disabled={busy}
                            onClick={() => act({ action: u.is_active ? 'ban_user' : 'unban_user', user_id: u.id })}
                          >
                            {u.is_active ? t('ban') : t('unban')}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!isLoading && !error && tab === 'posts' && (
            <div className="space-y-2 fade-in">
              {(data.rows || []).map((p: any) => (
                <div key={p.id} className="card p-3.5 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-mute">@{p.username} · {timeAgo(p.created_at)} · ♥{p.likes_count} 💬{p.comments_count}</div>
                    <div className="text-sm mt-1 line-clamp-2">{p.content || `[${p.type}]`}</div>
                  </div>
                  <button className="btn-danger !py-1 !px-2.5 !text-[11px] shrink-0" disabled={busy} onClick={() => { if (confirm('Delete?')) act({ action: 'delete_post', id: p.id }); }}>
                    {t('delete')}
                  </button>
                </div>
              ))}
              {!(data.rows || []).length && <Empty icon="📝" />}
            </div>
          )}

          {!isLoading && !error && tab === 'clips' && (
            <div className="space-y-2 fade-in">
              {(data.rows || []).map((c: any) => (
                <div key={c.id} className="card p-3.5 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm truncate">{c.title}</div>
                    <div className="text-xs text-mute">@{c.username} · ▶{c.views} · ♥{c.likes_count} · {timeAgo(c.created_at)}</div>
                  </div>
                  <button className="btn-danger !py-1 !px-2.5 !text-[11px] shrink-0" disabled={busy} onClick={() => { if (confirm('Delete?')) act({ action: 'delete_clip', id: c.id }); }}>
                    {t('delete')}
                  </button>
                </div>
              ))}
              {!(data.rows || []).length && <Empty icon="🎬" />}
            </div>
          )}

          {!isLoading && !error && tab === 'comments' && (
            <div className="space-y-2 fade-in">
              {(data.rows || []).map((c: any) => (
                <div key={c.id} className="card p-3.5 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-mute">@{c.username} · {c.target_type} #{c.target_id} · {timeAgo(c.created_at)}</div>
                    <div className="text-sm truncate">{c.content}</div>
                  </div>
                  <button className="btn-danger !py-1 !px-2.5 !text-[11px] shrink-0" disabled={busy} onClick={() => act({ action: 'delete_comment', id: c.id })}>
                    {t('delete')}
                  </button>
                </div>
              ))}
              {!(data.rows || []).length && <Empty icon="💬" />}
            </div>
          )}

          {!isLoading && !error && tab === 'games' && (
            <div className="space-y-4 fade-in">
              <div className="card p-4 grid grid-cols-2 sm:grid-cols-5 gap-3">
                <input className="input !text-sm" placeholder="Name *" value={gameForm.name} onChange={(e) => setGameForm({ ...gameForm, name: e.target.value })} />
                <input className="input !text-sm" placeholder="نام فارسی" value={gameForm.name_fa} onChange={(e) => setGameForm({ ...gameForm, name_fa: e.target.value })} />
                <input className="input !text-sm" placeholder="Genre" value={gameForm.genre} onChange={(e) => setGameForm({ ...gameForm, genre: e.target.value })} />
                <input className="input !text-sm !px-2" type="color" value={gameForm.accent} onChange={(e) => setGameForm({ ...gameForm, accent: e.target.value })} title="Accent" />
                <button
                  className="btn-neon !py-2 text-xs"
                  disabled={busy || !gameForm.name}
                  onClick={async () => { await act({ action: 'add_game', ...gameForm }); setGameForm({ name: '', name_fa: '', genre: '', accent: '#00a8ff', platforms: 'PC' }); }}
                >
                  ＋ {t('admin_games')}
                </button>
              </div>
              <div className="card overflow-x-auto">
                <table className="tbl">
                  <thead><tr><th>ID</th><th>{t('name')}</th><th>Genre</th><th>Platform</th><th></th></tr></thead>
                  <tbody>
                    {(data.rows || []).map((g: any) => (
                      <tr key={g.id}>
                        <td className="text-mute">{g.id}</td>
                        <td className="font-bold">{lang === 'fa' ? g.name_fa : g.name} <span className="text-mute font-normal text-xs">({g.slug})</span></td>
                        <td><span className="badge">{g.genre || '—'}</span></td>
                        <td className="text-mute text-xs">{g.platforms}</td>
                        <td><button className="btn-danger !py-1 !px-2 !text-[11px]" disabled={busy} onClick={() => { if (confirm('Delete game + all user entries?')) act({ action: 'delete_game', id: g.id }); }}>{t('delete')}</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!isLoading && !error && tab === 'achievements' && (
            <div className="space-y-4 fade-in">
              <div className="card p-4 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                <input className="input !text-xs" placeholder="slug *" value={achForm.slug} onChange={(e) => setAchForm({ ...achForm, slug: e.target.value })} />
                <input className="input !text-xs" placeholder="Name *" value={achForm.name} onChange={(e) => setAchForm({ ...achForm, name: e.target.value })} />
                <input className="input !text-xs" placeholder="نام فارسی" value={achForm.name_fa} onChange={(e) => setAchForm({ ...achForm, name_fa: e.target.value })} />
                <input className="input !text-xs" placeholder="Description" value={achForm.description} onChange={(e) => setAchForm({ ...achForm, description: e.target.value })} />
                <input className="input !text-xs" placeholder="توضیح" value={achForm.description_fa} onChange={(e) => setAchForm({ ...achForm, description_fa: e.target.value })} />
                <input className="input !text-xs" placeholder="icon" value={achForm.icon} onChange={(e) => setAchForm({ ...achForm, icon: e.target.value })} />
                <input className="input !text-xs" type="number" value={achForm.xp_reward} onChange={(e) => setAchForm({ ...achForm, xp_reward: Number(e.target.value) })} />
                <button
                  className="btn-neon !py-2 !text-xs"
                  disabled={busy || !achForm.slug || !achForm.name}
                  onClick={async () => { await act({ action: 'add_achievement', ...achForm }); setAchForm({ slug: '', name: '', name_fa: '', description: '', description_fa: '', icon: 'trophy', xp_reward: 50 }); }}
                >
                  ＋ ACH
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {(data.rows || []).map((a: any) => (
                  <div key={a.id} className="card p-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-extrabold text-xs">{lang === 'fa' ? a.name_fa : a.name}</div>
                      <button className="text-mute hover:text-[#ff2e63] text-xs" disabled={busy} onClick={() => { if (confirm('Delete?')) act({ action: 'delete_achievement', id: a.id }); }}>✕</button>
                    </div>
                    <div className="text-mute text-[10px] mt-1 line-clamp-2">{lang === 'fa' ? a.description_fa : a.description}</div>
                    <div className="flex gap-1.5 mt-2">
                      <span className="badge badge-gold !text-[9px]">+{a.xp_reward} XP</span>
                      <span className="badge badge-mute !text-[9px]">✓ {a.unlocked_count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!isLoading && !error && tab === 'clans' && (
            <div className="card overflow-x-auto fade-in">
              <table className="tbl">
                <thead><tr><th>ID</th><th>{t('clan_name')}</th><th>{t('leader')}</th><th>LV</th><th>XP</th><th>{t('members')}</th><th></th></tr></thead>
                <tbody>
                  {(data.rows || []).map((c: any) => (
                    <tr key={c.id}>
                      <td className="text-mute">{c.id}</td>
                      <td><a href={`/clans/${c.slug}`} className="font-bold hover:text-[#c4aaff]">{c.name}</a></td>
                      <td>@{c.leader_username}</td>
                      <td><span className="badge">{c.level}</span></td>
                      <td className="text-[#7cc9ff]">{c.xp}</td>
                      <td>{c.members_count}</td>
                      <td><button className="btn-danger !py-1 !px-2 !text-[11px]" disabled={busy} onClick={() => { if (confirm('Delete clan?')) act({ action: 'delete_clan', id: c.id }); }}>{t('delete')}</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!(data.rows || []).length && <Empty icon="🛡" />}
            </div>
          )}

          {!isLoading && !error && tab === 'reports' && (
            <div className="space-y-2 fade-in">
              <div className="flex gap-2 flex-wrap">
                {['open', 'resolved', 'dismissed', ''].map((s) => (
                  <button key={s || 'all'} className="btn-ghost !py-1.5 !text-xs" onClick={() => {
                    (async () => {
                      setIsLoading(true);
                      try {
                        const r = await fetch(`/api/admin?tab=reports${s ? `&status=${s}` : ''}`);
                        setData(await r.json());
                      } finally { setIsLoading(false); }
                    })();
                  }}>
                    {s || t('all')}
                  </button>
                ))}
              </div>
              {(data.rows || []).map((r: any) => (
                <div key={r.id} className="card p-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`badge ${r.status === 'open' ? 'badge-hot' : 'badge-lime'}`}>{r.status}</span>
                    <span className="badge">{r.reason}</span>
                    <span className="text-xs text-mute">{t(`report_target_${r.target_type}`)} #{r.target_id}</span>
                    <span className="text-xs text-mute ms-auto">by @{r.reporter} · {timeAgo(r.created_at)}</span>
                  </div>
                  {r.details && <p className="text-sm mt-2 text-[#c5cde0]">{r.details}</p>}
                  {r.status === 'open' && (
                    <div className="flex gap-2 mt-3">
                      <button className="btn-neon !py-1.5 !text-xs" disabled={busy} onClick={() => act({ action: 'resolve_report', id: r.id, status: 'resolved', note: 'Reviewed' })}>
                        ✓ {t('resolve')}
                      </button>
                      <button className="btn-ghost !py-1.5 !text-xs" disabled={busy} onClick={() => act({ action: 'resolve_report', id: r.id, status: 'dismissed', note: 'No violation' })}>
                        ✕ {t('cancel')}
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {!(data.rows || []).length && <Empty icon="🚨" />}
            </div>
          )}

          {!isLoading && !error && tab === 'challenges' && (
            <div className="space-y-4 fade-in">
              <div className="card p-4 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-9 gap-2">
                <input className="input !text-xs" placeholder="slug *" value={chForm.slug} onChange={(e) => setChForm({ ...chForm, slug: e.target.value })} />
                <input className="input !text-xs" placeholder="Title *" value={chForm.title} onChange={(e) => setChForm({ ...chForm, title: e.target.value })} />
                <input className="input !text-xs" placeholder="عنوان" value={chForm.title_fa} onChange={(e) => setChForm({ ...chForm, title_fa: e.target.value })} />
                <input className="input !text-xs" placeholder="Description" value={chForm.description} onChange={(e) => setChForm({ ...chForm, description: e.target.value })} />
                <input className="input !text-xs" placeholder="توضیح" value={chForm.description_fa} onChange={(e) => setChForm({ ...chForm, description_fa: e.target.value })} />
                <select className="input !text-xs" value={chForm.kind} onChange={(e) => setChForm({ ...chForm, kind: e.target.value })}>
                  <option value="daily">daily</option><option value="weekly">weekly</option><option value="special">special</option>
                </select>
                <input className="input !text-xs" type="number" value={chForm.xp_reward} onChange={(e) => setChForm({ ...chForm, xp_reward: Number(e.target.value) })} />
                <label className="flex items-center gap-1 text-[11px] text-mute px-2">proof
                  <input type="checkbox" checked={chForm.proof_required} onChange={(e) => setChForm({ ...chForm, proof_required: e.target.checked })} className="accent-[#00a8ff]" />
                </label>
                <button
                  className="btn-neon !py-2 !text-xs"
                  disabled={busy || !chForm.slug || !chForm.title}
                  onClick={async () => { await act({ action: 'add_challenge', ...chForm }); setChForm({ slug: '', title: '', title_fa: '', description: '', description_fa: '', kind: 'daily', xp_reward: 100, proof_required: true }); }}
                >
                  ＋ CH
                </button>
              </div>
              <div className="card overflow-x-auto">
                <table className="tbl">
                  <thead><tr><th>Title</th><th>Kind</th><th>XP</th><th>Users</th><th>Done</th><th>Status</th><th></th></tr></thead>
                  <tbody>
                    {(data.rows || []).map((c: any) => (
                      <tr key={c.id}>
                        <td className="font-bold text-sm">{lang === 'fa' ? c.title_fa : c.title}</td>
                        <td><span className="badge">{c.kind}</span></td>
                        <td className="text-[#ffd98a] font-bold">+{c.xp_reward}</td>
                        <td>{c.participants}</td>
                        <td>{c.completions}</td>
                        <td>{c.active ? <span className="badge badge-lime">ON</span> : <span className="badge badge-mute">OFF</span>}</td>
                        <td className="space-x-1 rtl:space-x-reverse">
                          <button className="btn-ghost !py-1 !px-2 !text-[11px]" disabled={busy} onClick={() => act({ action: 'toggle_challenge', id: c.id })}>toggle</button>
                          <button className="btn-danger !py-1 !px-2 !text-[11px]" disabled={busy} onClick={() => { if (confirm('Delete?')) act({ action: 'delete_challenge', id: c.id }); }}>{t('delete')}</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, icon, danger }: { label: string; value: number; icon: string; danger?: boolean }) {
  return (
    <div className={`card p-4 text-center ${danger ? 'border-[#ff2e63]/50' : ''}`}>
      <div className="text-xl mb-1">{icon}</div>
      <div className={`text-2xl font-black ${danger ? 'text-[#ff8fa8]' : 'neon-text'}`}>{value ?? 0}</div>
      <div className="text-[11px] text-mute font-bold mt-1">{label}</div>
    </div>
  );
}
