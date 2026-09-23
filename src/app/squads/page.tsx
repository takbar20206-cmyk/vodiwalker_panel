'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/components/AppProvider';
import { Avatar } from '@/components/Nav';
import { Tabs, Loading, ErrorBox, Empty, Modal } from '@/components/UI';
import { ReportButton, timeAgo } from '@/components/ReportButton';

type Squad = {
  id: number;
  user_id: number;
  game_id: number;
  game_name: string;
  game_accent: string;
  game_cover: string;
  mode: string;
  rank_needed: string;
  players_needed: number;
  seats_filled: number;
  mic: string;
  language: string;
  status: string;
  note: string;
  created_at: string;
  username: string;
  display_name: string;
  avatar_path: string | null;
  level: number;
  joined: boolean;
  isMine: boolean;
};

export default function SquadsPage() {
  const { t, user, toast } = useApp();
  const [tab, setTab] = useState<'find' | 'mine'>('find');
  const [squads, setSquads] = useState<Squad[]>([]);
  const [games, setGames] = useState<{ id: number; name: string }[]>([]);
  const [gameFilter, setGameFilter] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (gameFilter) params.set('game_id', String(gameFilter));
      if (tab === 'mine') params.set('mine', '1');
      const r = await fetch(`/api/squads?${params}`, { cache: 'no-store' });
      if (!r.ok) throw new Error((await r.json()).error || 'Failed');
      const d = await r.json();
      setSquads(d.squads || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [tab, gameFilter]);

  useEffect(() => {
    fetch('/api/games').then((r) => r.json()).then((d) => setGames(d.games || [])).catch(() => {});
  }, []);
  useEffect(() => { load(); }, [load]);

  const join = async (s: Squad) => {
    if (!user) return toast(t('login_first'), 'error');
    try {
      const r = await fetch(`/api/squads/${s.id}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: s.joined ? 'leave' : 'join' }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      toast(s.joined ? t('cancel') : t('squad_join_done'));
      load();
    } catch (e: any) { toast(e.message, 'error'); }
  };

  const closeSquad = async (s: Squad) => {
    try {
      const r = await fetch('/api/squads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: s.id, status: 'closed' }),
      });
      if (!r.ok) throw new Error((await r.json()).error);
      toast(t('closed'));
      load();
    } catch (e: any) { toast(e.message, 'error'); }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 fade-in">
      <div className="flex items-end justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-black">🎯 {t('find_squad')}</h1>
          <p className="text-mute text-sm mt-1">{t('feat_clan_desc')}</p>
        </div>
        <button className="btn-neon !py-2 text-sm" onClick={() => (user ? setCreateOpen(true) : (window.location.href = '/login'))}>
          ＋ {t('create_squad')}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <Tabs
          tabs={[
            { id: 'find', label: t('find_squad') },
            { id: 'mine', label: t('my_squads') },
          ]}
          active={tab}
          onChange={(id) => setTab(id as 'find' | 'mine')}
        />
        <div className="flex-1" />
        <select className="input !w-52" value={gameFilter} onChange={(e) => setGameFilter(Number(e.target.value))}>
          <option value={0}>🎮 {t('game')}: {t('all')}</option>
          {games.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      </div>

      {loading && <Loading />}
      {error && <ErrorBox message={error} onRetry={load} />}
      {!loading && !error && squads.length === 0 && (
        <Empty
          icon="🎯"
          title={tab === 'mine' ? t('empty_title') : t('looking')}
          action={user && tab === 'find' ? <button className="btn-neon text-sm" onClick={() => setCreateOpen(true)}>{t('create_squad')}</button> : undefined}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {squads.map((s) => (
          <div key={s.id} className="card card-hover overflow-hidden fade-in">
            <div className="relative h-24">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.game_cover} alt="" className="w-full h-full object-cover" loading="lazy" />
              <div className="absolute inset-0 cover-overlay" />
              <div className="absolute inset-0 flex items-center justify-between px-4">
                <div>
                  <div className="font-black" style={{ color: s.game_accent }}>{s.game_name}</div>
                  <div className="badge mt-1">{s.mode || '—'} {s.rank_needed && `· ${s.rank_needed}`}</div>
                </div>
                <span className={`badge ${s.status === 'looking' ? 'badge-lime' : 'badge-mute'}`}>
                  {s.status === 'looking' ? `● ${t('looking')}` : s.status === 'full' ? t('full') : t('closed')}
                </span>
              </div>
            </div>
            <div className="p-4">
              <div className="flex items-center gap-3">
                <Link href={`/${s.username}`}>
                  <Avatar avatar={s.avatar_path} name={s.display_name || s.username} level={s.level} size={40} />
                </Link>
                <Link href={`/${s.username}`} className="font-bold text-sm hover:text-[#7cc9ff]">{s.display_name || s.username}</Link>
                <span className="text-mute text-xs">@{s.username}</span>
                <span className="ms-auto text-[11px] text-mute">{timeAgo(s.created_at)}</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 text-xs">
                <Spec label={t('players_needed')} value={`${s.seats_filled}/${s.players_needed}`} />
                <Spec label={t('mic')} value={s.mic === 'required' ? `🔴 ${t('required')}` : `⚪ ${t('optional')}`} />
                <Spec label={t('language_')} value={s.language === 'persian' ? '🇮🇷 Persian' : '🇬🇧 English'} />
                <Spec label={t('rank_needed')} value={s.rank_needed || '—'} />
              </div>

              {s.note && <p className="text-xs text-mute mt-3 bg-[#0d111c] rounded-lg p-2.5 border border-[#161b2a]">💬 {s.note}</p>}

              <div className="flex items-center gap-2 mt-4">
                {s.isMine ? (
                  <>
                    <span className="badge badge-gold flex-1 justify-center !py-1.5">{t('my_squads')}</span>
                    <button className="btn-ghost !py-2 text-xs" onClick={() => closeSquad(s)}>{t('closed')}</button>
                  </>
                ) : s.status === 'looking' ? (
                  <button className={`${s.joined ? 'btn-ghost' : 'btn-neon'} !py-2.5 text-sm flex-1`} onClick={() => join(s)}>
                    {s.joined ? `✓ ${t('joined')} — ${t('leave_squad')}` : `⚡ ${t('squad_join')}`}
                  </button>
                ) : (
                  <span className="badge badge-mute flex-1 justify-center !py-1.5">{s.status === 'full' ? t('full') : t('closed')}</span>
                )}
                <ReportButton targetType="user" targetId={s.user_id} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {createOpen && (
        <CreateSquadModal
          games={games}
          onClose={() => setCreateOpen(false)}
          onCreated={() => { setCreateOpen(false); setTab('mine'); toast('+✅'); load(); }}
        />
      )}
    </div>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#0d111c] rounded-lg px-2.5 py-2 border border-[#161b2a]">
      <div className="text-[9px] text-mute font-bold uppercase tracking-wide">{label}</div>
      <div className="font-bold text-[#dbe4f7] mt-0.5 truncate">{value}</div>
    </div>
  );
}

function CreateSquadModal({ games, onClose, onCreated }: { games: { id: number; name: string }[]; onClose: () => void; onCreated: () => void }) {
  const { t, toast } = useApp();
  const [form, setForm] = useState({
    game_id: games[0]?.id ?? 0,
    mode: 'Ranked',
    rank_needed: '',
    players_needed: 2,
    mic: 'required',
    language: 'persian',
    note: '',
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!form.game_id && games[0]) setForm((f) => ({ ...f, game_id: games[0].id }));
  }, [games, form.game_id]);

  const submit = async () => {
    setBusy(true);
    try {
      const r = await fetch('/api/squads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      onCreated();
    } catch (e: any) { toast(e.message, 'error'); } finally { setBusy(false); }
  };

  return (
    <Modal open onClose={onClose} title={`🎯 ${t('create_squad')}`}>
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="label">GAME</label>
          <select className="input" value={form.game_id} onChange={(e) => setForm({ ...form, game_id: Number(e.target.value) })}>
            {games.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">{t('mode')}</label>
          <select className="input" value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })}>
            {['Ranked', 'Casual', 'Tournament', 'Scrim', 'Custom'].map((m) => <option key={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="label">{t('rank_needed')}</label>
          <input className="input" value={form.rank_needed} onChange={(e) => setForm({ ...form, rank_needed: e.target.value })} placeholder="Legendary" maxLength={60} />
        </div>
        <div>
          <label className="label">{t('players_needed')}</label>
          <input type="number" min={1} max={10} className="input" value={form.players_needed} onChange={(e) => setForm({ ...form, players_needed: Number(e.target.value) })} />
        </div>
        <div>
          <label className="label">{t('mic')}</label>
          <select className="input" value={form.mic} onChange={(e) => setForm({ ...form, mic: e.target.value })}>
            <option value="required">{t('required')}</option>
            <option value="optional">{t('optional')}</option>
          </select>
        </div>
        <div>
          <label className="label">{t('language_')}</label>
          <select className="input" value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })}>
            <option value="persian">Persian</option>
            <option value="english">English</option>
          </select>
        </div>
        <div className="col-span-2">
          <label className="label">{t('squad_note')}</label>
          <textarea className="input" rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} maxLength={300} placeholder="Need 2 for Legendary push…" />
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-5">
        <button className="btn-ghost !py-2 text-sm" onClick={onClose}>{t('cancel')}</button>
        <button className="btn-neon !py-2 text-sm" disabled={busy || !form.game_id} onClick={submit}>
          {busy ? t('creating') : t('create_squad')}
        </button>
      </div>
    </Modal>
  );
}
