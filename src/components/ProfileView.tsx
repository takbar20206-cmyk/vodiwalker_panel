'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from './AppProvider';
import { Avatar } from './Nav';
import { Loading, ErrorBox, XpBar, Empty, Modal } from './UI';
import { ReportButton, timeAgo } from './ReportButton';
import { Feed } from './Feed';

type ProfileData = {
  profile: Record<string, any>;
  games: any[];
  achievements: any[];
  clan: any;
  relations: { following: boolean; friend: boolean; friendPending: boolean; friendIncoming: boolean; isSelf: boolean };
  isSelf: boolean;
};

const COUNTRIES = ['IR', 'US', 'GB', 'DE', 'TR', 'AE', 'FR', 'CA', 'JP', 'KR', 'BR', 'IN', 'RU', 'ES', 'IT', 'NL', 'SE', 'PL', 'UA', 'Other'];

export function ProfileView({ username, initialEdit, viewerId, viewerRole }: { username: string; initialEdit: boolean; viewerId: number | null; viewerRole: string | null }) {
  const { t, user, toast, refresh } = useApp();
  const router = useRouter();
  const [data, setData] = useState<ProfileData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'posts' | 'games' | 'achievements'>('posts');
  const [editOpen, setEditOpen] = useState(initialEdit && !!user);
  const [addGameOpen, setAddGameOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const r = await fetch(`/api/users/${username}`, { cache: 'no-store' });
      if (!r.ok) throw new Error((await r.json()).error || 'Failed');
      setData(await r.json());
      fetch('/api/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'profile_view', username }),
      }).catch(() => {});
    } catch (e: any) {
      setError(e.message);
    }
  }, [username]);

  useEffect(() => { load(); }, [load]);

  if (error) return <div className="max-w-5xl mx-auto px-4 py-10"><ErrorBox message={error} onRetry={load} /></div>;
  if (!data) return <div className="max-w-5xl mx-auto px-4 py-10"><Loading /></div>;

  const p = data.profile;
  const rel = data.relations;

  const follow = async () => {
    if (!user) return router.push('/login');
    setBusy(true);
    try {
      const r = await fetch('/api/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: p.id }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setData((x) => x && ({ ...x, relations: { ...x.relations, following: d.following }, profile: { ...x.profile, followers_count: x.profile.followers_count + (d.following ? 1 : -1) } }));
      if (d.following) toast('+2 XP');
      refresh();
    } catch (e: any) { toast(e.message, 'error'); } finally { setBusy(false); }
  };

  const addFriend = async (action: 'request' | 'accept' | 'decline' | 'remove' = 'request') => {
    if (!user) return router.push('/login');
    try {
      const r = await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: p.id, action }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setData((x) => x && ({
        ...x,
        relations: {
          ...x.relations,
          friend: d.status === 'accepted',
          friendPending: d.status === 'pending',
          friendIncoming: false,
        },
      }));
      toast(d.status === 'accepted' ? `+10 XP · ${t('friends')}` : t('friend_request_sent'));
    } catch (e: any) { toast(e.message, 'error'); }
  };

  const message = async () => {
    if (!user) return router.push('/login');
    try {
      const r = await fetch('/api/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start_chat', user_id: p.id }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      router.push(`/messages?thread=${d.threadId}`);
    } catch (e: any) { toast(e.message, 'error'); }
  };

  const share = async () => {
    const url = `${location.origin}/${p.username}`;
    try {
      if (navigator.share) await navigator.share({ title: `${p.display_name || p.username} · GAMER ID`, url });
      else { await navigator.clipboard.writeText(url); toast(t('copied')); }
    } catch { /* cancelled */ }
  };

  const welcome = typeof window !== 'undefined' && location.search.includes('welcome=1');

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-6 fade-in">
      {/* Cover */}
      <div className="relative rounded-2xl overflow-hidden h-40 sm:h-56 card !p-0">
        {p.cover_path ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.cover_path} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#00a8ff]/25 via-[#4d5cff]/15 to-[#9b6bff]/25 hero-grid" />
        )}
        <div className="absolute inset-0 cover-overlay" />
      </div>

      {/* Header */}
      <div className="relative -mt-12 sm:-mt-16 px-2 sm:px-4 flex flex-col sm:flex-row sm:items-end gap-4">
        <Avatar avatar={p.avatar_path} name={p.display_name || p.username} size={110} ring />
        <div className="flex-1 min-w-0 pb-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-black truncate">{p.display_name || p.username}</h1>
            <span className="badge">@{p.username}</span>
            {p.role === 'admin' && <span className="badge badge-hot">ADMIN</span>}
            {data.clan && <span className="badge" style={{ borderColor: '#9b6bff66', color: '#c4aaff' }}>🛡 {data.clan.name}</span>}
          </div>
          <div className="text-mute text-sm mt-1 flex items-center gap-3 flex-wrap">
            {p.country && <span>🌍 {p.country}</span>}
            <span>📈 {t('global_rank')} #{p.rank}</span>
            <span>👁 {p.profile_views} {t('views')}</span>
            {p.created_at && <span>Joined {new Date(String(p.created_at).replace(' ', 'T') + 'Z').toLocaleDateString()}</span>}
          </div>
          {p.bio && <p className="text-[15px] mt-2 max-w-2xl leading-relaxed">{p.bio}</p>}
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2 pb-2">
          {data.isSelf ? (
            <>
              <button className="btn-neon !py-2 text-sm" onClick={() => setEditOpen(true)}>✎ {t('edit_profile')}</button>
              <button className="btn-ghost !py-2 text-sm" onClick={() => setAddGameOpen(true)}>＋ {t('add_game')}</button>
            </>
          ) : (
            <>
              <button className={rel.following ? 'btn-ghost !py-2 text-sm' : 'btn-neon !py-2 text-sm'} disabled={busy} onClick={follow}>
                {rel.following ? t('unfollow') : t('follow')}
              </button>
              {rel.friend ? (
                <span className="badge badge-lime !py-2">✓ {t('friends')}</span>
              ) : rel.friendPending ? (
                <span className="badge badge-mute !py-2">{t('pending')}</span>
              ) : rel.friendIncoming ? (
                <button className="btn-neon !py-2 text-sm" onClick={() => addFriend('accept')}>✓ {t('accept')}</button>
              ) : (
                <button className="btn-ghost !py-2 text-sm" onClick={() => addFriend('request')}>＋ {t('add_friend')}</button>
              )}
              <button className="btn-ghost !py-2 text-sm" onClick={message}>✉ {t('message')}</button>
              <button className="btn-ghost !py-2 text-sm" onClick={share}>↗ {t('share_profile')}</button>
              <ReportButton targetType="user" targetId={p.id} className="btn-ghost !py-2 text-xs" />
            </>
          )}
        </div>
      </div>

      {/* Stats + XP */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
        <StatCard label={t('followers')} value={p.followers_count} href={`/${p.username}?tab=followers`} />
        <StatCard label={t('following')} value={p.following_count} />
        <StatCard label={t('friends')} value={p.friends_count} />
        <StatCard label={t('posts')} value={p.postsCount} />
      </div>

      <div className="card p-4 mt-4">
        <div className="flex items-center justify-between mb-2">
          <div className="font-extrabold text-sm">⚡ {t('level')} {p.level} — {p.xp} XP</div>
          <div className="text-xs text-mute">{data.achievements.filter((a: any) => a.unlocked).length}/{data.achievements.length} {t('achievements_count')}</div>
        </div>
        <XpBar xp={p.xp} level={p.level} />
      </div>

      {welcome && (
        <div className="card p-4 mt-4 border-[#7cff6b]/40 fade-in">
          🎉 <b>Welcome to GAMER ID, {p.display_name || p.username}!</b> Your profile is live at <code>/{p.username}</code>. Add games & complete your profile to earn XP.
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mt-6 overflow-x-auto pb-1">
        {(['posts', 'games', 'achievements'] as const).map((tb) => (
          <button key={tb} className={`tab ${tab === tb ? 'active' : ''}`} onClick={() => setTab(tb)}>
            {t(tb === 'posts' ? 'posts' : tb === 'games' ? 'games' : 'achievements')}
            {tb === 'games' ? ` (${data.games.length})` : tb === 'achievements' ? ` (${data.achievements.filter((a: any) => a.unlocked).length})` : ''}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {tab === 'posts' && <Feed scope="user" userId={p.id} />}
        {tab === 'games' && <GamesGrid games={data.games} isSelf={!!data.isSelf} onChanged={load} />}
        {tab === 'achievements' && <AchievementsGrid achievements={data.achievements} />}
      </div>

      {editOpen && data.isSelf && (
        <EditProfileModal data={data} onClose={() => setEditOpen(false)} onSaved={() => { setEditOpen(false); load(); refresh(); }} />
      )}
      {addGameOpen && data.isSelf && (
        <AddGameModal onClose={() => setAddGameOpen(false)} onAdded={() => { setAddGameOpen(false); load(); refresh(); }} existingIds={data.games.map((g: any) => g.game_id)} />
      )}
    </div>
  );
}

function StatCard({ label, value, href }: { label: string; value: number; href?: string }) {
  const inner = (
    <div className="card card-hover p-4 text-center">
      <div className="text-2xl font-black neon-text">{value ?? 0}</div>
      <div className="text-xs text-mute font-semibold mt-1">{label}</div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

export function GamesGrid({ games, isSelf, onChanged }: { games: any[]; isSelf: boolean; onChanged?: () => void }) {
  const { t, toast } = useApp();
  const remove = async (id: number) => {
    if (!confirm(`${t('remove')}?`)) return;
    try {
      const r = await fetch(`/api/games?id=${id}`, { method: 'DELETE' });
      if (!r.ok) throw new Error((await r.json()).error);
      toast(t('remove'));
      onChanged?.();
    } catch (e: any) { toast(e.message, 'error'); }
  };

  if (!games.length) return <Empty icon="🎮" title={t('empty_title')} desc={isSelf ? t('add_game') : undefined} />;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {games.map((g) => (
        <div key={g.id} className="card card-hover overflow-hidden group">
          <div className="relative h-32 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={g.cover_path} alt={g.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
            <div className="absolute inset-0 cover-overlay" />
            <div className="absolute bottom-2 start-3 font-extrabold text-sm" style={{ color: g.accent }}>{g.name}</div>
            {isSelf && (
              <button onClick={() => remove(g.id)} className="absolute top-2 end-2 text-xs bg-black/60 hover:bg-[#ff2e63] rounded-lg px-2 py-1 opacity-0 group-hover:opacity-100 transition" title={t('remove')}>
                ✕
              </button>
            )}
          </div>
          <div className="p-4 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
            <Field label={t('rank')} value={g.rank || '—'} />
            <Field label={t('hours_played')} value={`${g.hours}h`} />
            <Field label={`${t('level')}`} value={`Lv ${g.level}`} />
            <Field label={t('platform')} value={g.platform} />
            <Field label={t('main_character')} value={g.main_character || '—'} />
            <Field label={t('main_weapon')} value={g.main_weapon || '—'} />
          </div>
        </div>
      ))}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="text-mute text-[10px] font-bold uppercase tracking-wide">{label}</div>
      <div className="font-bold text-[#dbe4f7] mt-0.5 truncate">{value}</div>
    </div>
  );
}

export function AchievementsGrid({ achievements }: { achievements: any[] }) {
  const { t, lang } = useApp();
  if (!achievements.length) return <Empty icon="🏆" />;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {achievements.map((a) => (
        <div key={a.id} className={`ach-badge ${a.unlocked ? 'unlocked' : 'locked'}`}>
          <div className="text-2xl mb-1.5">{achIcon(a.icon)}</div>
          <div className="font-extrabold text-[11px] tracking-wide">{lang === 'fa' ? a.name_fa : a.name}</div>
          <div className="text-[10px] text-mute mt-1 leading-snug">{lang === 'fa' ? a.description_fa : a.description}</div>
          <div className="mt-2 badge badge-gold !text-[10px]">+{a.xp_reward} XP</div>
          <div className={`mt-1.5 text-[9px] font-black ${a.unlocked ? 'text-[#ffd98a]' : 'text-mute'}`}>
            {a.unlocked ? `✓ ${t('unlocked')}` : `🔒 ${t('locked')}`}
          </div>
          {a.unlocked_at && <div className="text-[9px] text-mute mt-0.5">{String(a.unlocked_at).slice(0, 10)}</div>}
        </div>
      ))}
    </div>
  );
}

function achIcon(icon: string): string {
  const map: Record<string, string> = {
    crosshair: '🎯', skull: '💀', medal: '🏅', moon: '🌙', clock: '⏱️', crown: '👑',
    'user-check': '✅', gamepad: '🎮', layers: '🗂️', edit: '✏️', video: '🎬',
    star: '⭐', users: '👥', shield: '🛡️', trophy: '🏆',
  };
  return map[icon] || '🏆';
}

function EditProfileModal({ data, onClose, onSaved }: { data: ProfileData; onClose: () => void; onSaved: () => void }) {
  const { t, toast } = useApp();
  const p = data.profile;
  const [form, setForm] = useState({
    display_name: p.display_name || '',
    bio: p.bio || '',
    country: p.country || '',
    is_public: p.is_public ? '1' : '0',
    show_country: p.show_country ? '1' : '0',
    show_email: p.show_email ? '1' : '0',
  });
  const [avatar, setAvatar] = useState<File | null>(null);
  const [cover, setCover] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (avatar) fd.append('avatar', avatar);
      if (cover) fd.append('cover', cover);
      const r = await fetch('/api/profile', { method: 'PATCH', body: fd });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      toast(t('settings_saved'));
      onSaved();
    } catch (e: any) { toast(e.message, 'error'); } finally { setBusy(false); }
  };

  return (
    <Modal open onClose={onClose} title={`✎ ${t('edit_profile')}`}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">{t('display_name')}</label>
            <input className="input" value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} maxLength={60} />
          </div>
          <div>
            <label className="label">{t('country')}</label>
            <select className="input" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })}>
              <option value="">—</option>
              {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="label">{t('bio')}</label>
          <textarea className="input" rows={3} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} maxLength={300} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">🖼 {t('logo')} ({t('profile')})</label>
            <input type="file" accept="image/*" className="input !py-1.5 text-xs" onChange={(e) => {
              const f = e.target.files?.[0] || null;
              setAvatar(f);
              setPreview(f ? URL.createObjectURL(f) : null);
            }} />
            {preview && // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="" className="mt-2 h-16 w-16 rounded-full object-cover" />}
          </div>
          <div>
            <label className="label">🏞 {t('banner')}</label>
            <input type="file" accept="image/*" className="input !py-1.5 text-xs" onChange={(e) => {
              const f = e.target.files?.[0] || null;
              setCover(f);
              setCoverPreview(f ? URL.createObjectURL(f) : null);
            }} />
            {coverPreview && // eslint-disable-next-line @next/next/no-img-element
              <img src={coverPreview} alt="" className="mt-2 h-16 w-full rounded-lg object-cover" />}
          </div>
        </div>
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_public === '1'} onChange={(e) => setForm({ ...form, is_public: e.target.checked ? '1' : '0' })} /> Public profile</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.show_country === '1'} onChange={(e) => setForm({ ...form, show_country: e.target.checked ? '1' : '0' })} /> Show country</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.show_email === '1'} onChange={(e) => setForm({ ...form, show_email: e.target.checked ? '1' : '0' })} /> Show email</label>
        </div>
        <div className="flex gap-2 justify-end">
          <button className="btn-ghost !py-2 text-sm" onClick={onClose}>{t('cancel')}</button>
          <button className="btn-neon !py-2 text-sm" onClick={submit} disabled={busy}>{busy ? t('creating') : t('save')}</button>
        </div>
      </div>
    </Modal>
  );
}

export function AddGameModal({ onClose, onAdded, existingIds }: { onClose: () => void; onAdded: () => void; existingIds: number[] }) {
  const { t, toast, lang } = useApp();
  const [games, setGames] = useState<any[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [form, setForm] = useState({ hours: 0, rank: '', level: 1, main_character: '', main_weapon: '', platform: 'PC' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch('/api/games').then((r) => r.json()).then((d) => setGames(d.games || []));
  }, []);

  const submit = async () => {
    if (!selected) return toast(t('fill_all'), 'error');
    setBusy(true);
    try {
      const r = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game_id: selected, ...form }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      toast('+25 XP 🎮');
      onAdded();
    } catch (e: any) { toast(e.message, 'error'); } finally { setBusy(false); }
  };

  const available = games.filter((g) => !existingIds.includes(g.id));

  return (
    <Modal open onClose={onClose} title={`🎮 ${t('add_game')}`} wide>
      <div className="space-y-4">
        <div>
          <label className="label">{t('games')}</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto pe-1">
            {available.map((g) => (
              <button
                key={g.id}
                onClick={() => setSelected(g.id)}
                className={`relative rounded-xl overflow-hidden border transition h-20 ${selected === g.id ? 'border-[#00a8ff] shadow-[0_0_16px_rgba(0,168,255,0.4)]' : 'border-[#1c2233] hover:border-[#00a8ff]/40'}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={g.cover_path} alt={g.name} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                <div className="absolute inset-0 cover-overlay" />
                <span className="absolute bottom-1 start-2 text-[11px] font-extrabold" style={{ color: g.accent }}>{lang === 'fa' ? g.name_fa : g.name}</span>
              </button>
            ))}
            {!available.length && <div className="col-span-full text-mute text-sm py-4 text-center">{t('empty_title')}</div>}
          </div>
        </div>
        {selected !== null && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 fade-in">
            <div>
              <label className="label">{t('hours_played')}</label>
              <input type="number" min={0} className="input" value={form.hours} onChange={(e) => setForm({ ...form, hours: Number(e.target.value) })} />
            </div>
            <div>
              <label className="label">{t('rank')}</label>
              <input className="input" value={form.rank} onChange={(e) => setForm({ ...form, rank: e.target.value })} placeholder="Legendary / Global Elite…" maxLength={60} />
            </div>
            <div>
              <label className="label">{t('level')}</label>
              <input type="number" min={1} className="input" value={form.level} onChange={(e) => setForm({ ...form, level: Number(e.target.value) })} />
            </div>
            <div>
              <label className="label">{t('main_character')}</label>
              <input className="input" value={form.main_character} onChange={(e) => setForm({ ...form, main_character: e.target.value })} maxLength={60} />
            </div>
            <div>
              <label className="label">{t('main_weapon')}</label>
              <input className="input" value={form.main_weapon} onChange={(e) => setForm({ ...form, main_weapon: e.target.value })} maxLength={60} />
            </div>
            <div>
              <label className="label">{t('platform')}</label>
              <select className="input" value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })}>
                {['PC', 'PlayStation', 'Xbox', 'Mobile', 'Switch'].map((x) => <option key={x}>{x}</option>)}
              </select>
            </div>
          </div>
        )}
        <div className="flex justify-end gap-2">
          <button className="btn-ghost !py-2 text-sm" onClick={onClose}>{t('cancel')}</button>
          <button className="btn-neon !py-2 text-sm" disabled={busy || selected === null} onClick={submit}>
            {busy ? t('creating') : `＋ ${t('add_game')}`}
          </button>
        </div>
      </div>
    </Modal>
  );
}
