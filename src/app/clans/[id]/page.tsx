'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useApp } from '@/components/AppProvider';
import { Avatar } from '@/components/Nav';
import { Loading, ErrorBox, Modal, XpBar, Empty } from '@/components/UI';
import { timeAgo } from '@/components/ReportButton';

export default function ClanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t, user, toast, lang, refresh } = useApp();
  const [data, setData] = useState<{ clan: any; members: any[]; viewerMembership: { role: string; status: string } | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [chat, setChat] = useState<{ id: number } | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const r = await fetch(`/api/clans/${id}`, { cache: 'no-store' });
      if (!r.ok) throw new Error((await r.json()).error || 'Failed');
      setData(await r.json());
    } catch (e: any) { setError(e.message); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const act = async (action: string, extra: Record<string, unknown> = {}) => {
    if (!user) return (window.location.href = '/login');
    setBusy(true);
    try {
      const r = await fetch(`/api/clans/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      if (d.status === 'member') toast('+30 XP 🛡');
      if (action === 'respond_invite') toast(d.status === 'member' ? `+30 XP · ${t('clan_join')}` : t('cancel'));
      await load();
      refresh();
    } catch (e: any) { toast(e.message, 'error'); } finally { setBusy(false); }
  };

  if (error) return <div className="max-w-4xl mx-auto px-4 py-10"><ErrorBox message={error} onRetry={load} /></div>;
  if (!data) return <div className="max-w-4xl mx-auto px-4 py-10"><Loading /></div>;

  const { clan, members, viewerMembership } = data;
  const isLeader = viewerMembership?.role === 'leader';
  const isStaff = isLeader || viewerMembership?.role === 'co-leader';
  const isMember = !!viewerMembership && viewerMembership.status === 'member';
  const invited = viewerMembership?.status === 'invited';

  const openChat = async () => {
    if (!user) return (window.location.href = '/login');
    // find or create a group thread titled with the clan
    try {
      const r = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group: true, title: `🛡 ${clan.name}`, member_ids: members.map((m: any) => m.id) }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      window.location.href = `/messages?thread=${d.threadId}`;
    } catch (e: any) { toast(e.message, 'error'); }
  };

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-4 py-6 fade-in">
      {/* Banner */}
      <div className="relative rounded-2xl overflow-hidden h-40 sm:h-52 card !p-0">
        {clan.banner_path ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={clan.banner_path} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#9b6bff]/35 via-[#4d5cff]/20 to-[#00a8ff]/25 hero-grid" />
        )}
        <div className="absolute inset-0 cover-overlay" />
      </div>

      <div className="relative -mt-12 px-3 flex flex-col sm:flex-row sm:items-end gap-4">
        {clan.logo_path ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={clan.logo_path} alt="" className="w-24 h-24 rounded-2xl object-cover border-4 border-[#0b0e17] shadow-2xl" />
        ) : (
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#9b6bff] to-[#4d5cff] border-4 border-[#0b0e17] shadow-2xl flex items-center justify-center text-3xl font-black">
            {clan.name[0]}
          </div>
        )}
        <div className="flex-1 pb-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-black">{clan.name}</h1>
            <span className="badge">LV {clan.level}</span>
            <span className="badge badge-gold">⭐ {clan.xp} XP</span>
          </div>
          <div className="text-mute text-sm mt-1">
            👥 {clan.members_count} {t('members')} · {t('leader')}: <Link href={`/${clan.leader_username}`} className="text-[#7cc9ff] hover:underline">@{clan.leader_username}</Link>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 pb-2">
          {invited && (
            <button className="btn-neon !py-2 text-sm" disabled={busy} onClick={() => act('respond_invite', { accept: true })}>✓ {t('accept')}</button>
          )}
          {!isMember && !invited && (
            <button className="btn-neon !py-2 text-sm" disabled={busy} onClick={() => act('join')}>⚔ {t('clan_join')}</button>
          )}
          {isMember && !isLeader && (
            <button className="btn-danger !py-2 text-sm" disabled={busy} onClick={() => act('leave')}>{t('clan_leave')}</button>
          )}
          {isStaff && (
            <>
              <button className="btn-ghost !py-2 text-sm" onClick={() => setInviteOpen(true)}>＋ {t('clan_invite')}</button>
              <button className="btn-ghost !py-2 text-sm" onClick={openChat}>💬 {t('clan_chat')}</button>
            </>
          )}
        </div>
      </div>

      <div className="card p-4 mt-5">
        <div className="text-xs font-extrabold tracking-widest text-[#00a8ff] uppercase mb-2">{t('description')}</div>
        <p className="text-sm text-[#c5cde0] leading-relaxed">{clan.description || '—'}</p>
        {clan.games && (
          <div className="mt-3 flex flex-wrap gap-2">
            {String(clan.games).split(',').map((g: string) => g.trim()).filter(Boolean).map((g: string) => (
              <span key={g} className="badge">{g}</span>
            ))}
          </div>
        )}
        <div className="mt-4 max-w-md"><XpBar xp={clan.xp} level={clan.level} /></div>
      </div>

      {/* Members */}
      <div className="mt-6">
        <h2 className="font-black text-lg mb-3">👥 {t('members')} ({members.length})</h2>
        <div className="card divide-y divide-[#141824]">
          {members.map((m: any) => (
            <div key={m.id} className="flex items-center gap-3 p-3.5">
              <Link href={`/${m.username}`}>
                <Avatar avatar={m.avatar_path} name={m.display_name || m.username} level={m.level} size={40} />
              </Link>
              <Link href={`/${m.username}`} className="font-bold text-sm hover:text-[#7cc9ff] min-w-0 truncate">
                {m.display_name || m.username}
              </Link>
              <span className="text-mute text-xs">@{m.username}</span>
              <span className={`badge ${m.role === 'leader' ? 'badge-gold' : m.role === 'co-leader' ? 'badge-hot' : 'badge-mute'}`}>
                {m.role === 'leader' ? '👑 ' + t('leader') : m.role === 'co-leader' ? '⭐ CO-LEADER' : t('members')}
              </span>
              <span className="ms-auto text-mute text-xs hidden sm:block">{m.xp} XP</span>
              {isStaff && m.role === 'member' && user && m.id !== user.id && (
                <div className="flex gap-1.5">
                  <button className="text-[11px] btn-ghost !py-1 !px-2" onClick={() => act('promote', { user_id: m.id })}>↑</button>
                  <button className="text-[11px] btn-danger !py-1 !px-2" onClick={() => { if (confirm(`Kick @${m.username}?`)) act('kick', { user_id: m.id }); }}>✕</button>
                </div>
              )}
            </div>
          ))}
          {!members.length && <div className="p-6"><Empty icon="👥" /></div>}
        </div>
      </div>

      {inviteOpen && <InviteModal clanId={clan.id} onClose={() => setInviteOpen(false)} onInvited={() => { setInviteOpen(false); toast('✅'); }} />}
    </div>
  );
}

function InviteModal({ clanId, onClose, onInvited }: { clanId: number; onClose: () => void; onInvited: () => void }) {
  const { t, toast } = useApp();
  const [q, setQ] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!q.trim()) { setResults([]); return; }
    const tm = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}&type=players`)
        .then((r) => r.json())
        .then((d) => setResults(d.players || []))
        .catch(() => {});
    }, 200);
    return () => clearTimeout(tm);
  }, [q]);

  const invite = async (userId: number) => {
    setBusy(true);
    try {
      const r = await fetch(`/api/clans/${clanId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'invite', user_id: userId }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      toast('📨 ' + t('invite'));
      onInvited();
    } catch (e: any) { toast(e.message, 'error'); } finally { setBusy(false); }
  };

  return (
    <Modal open onClose={onClose} title={`＋ ${t('clan_invite')}`}>
      <input className="input" placeholder={t('search_placeholder')} value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
      <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
        {results.map((p) => (
          <div key={p.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-[#00a8ff]/8 transition">
            <Avatar avatar={p.avatar_path} name={p.display_name || p.username} size={36} />
            <div className="min-w-0 flex-1">
              <div className="font-bold text-sm truncate">{p.display_name || p.username}</div>
              <div className="text-mute text-xs">@{p.username}</div>
            </div>
            <button className="btn-neon !py-1.5 !px-3 text-xs" disabled={busy} onClick={() => invite(p.id)}>
              {t('invite')}
            </button>
          </div>
        ))}
        {q && !results.length && <div className="text-center text-mute text-sm py-6">{t('search_no_results')}</div>}
      </div>
    </Modal>
  );
}
