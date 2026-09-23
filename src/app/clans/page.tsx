'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/components/AppProvider';
import { Loading, ErrorBox, Empty, Modal, XpBar } from '@/components/UI';

type Clan = {
  id: number;
  name: string;
  slug: string;
  description: string;
  logo_path: string;
  banner_path: string;
  level: number;
  xp: number;
  members_count: number;
  games: string;
  leader_username: string;
  leader_avatar: string | null;
};

export default function ClansPage() {
  const { t, user, toast, lang } = useApp();
  const [clans, setClans] = useState<Clan[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/clans${q ? `?q=${encodeURIComponent(q)}` : ''}`, { cache: 'no-store' });
      if (!r.ok) throw new Error((await r.json()).error || 'Failed');
      const d = await r.json();
      setClans(d.clans || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [q]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 fade-in">
      <div className="flex items-end justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-black">🛡 {t('nav_clans')}</h1>
          <p className="text-mute text-sm mt-1">{t('feat_clan_desc')}</p>
        </div>
        <button className="btn-neon !py-2 text-sm" onClick={() => (user ? setCreateOpen(true) : (window.location.href = '/login'))}>
          ＋ {t('clan_create')}
        </button>
      </div>

      <input className="input mb-5" placeholder={`${t('search')} ${t('nav_clans')}…`} value={q} onChange={(e) => setQ(e.target.value)} maxLength={80} />

      {loading && <Loading />}
      {error && <ErrorBox message={error} onRetry={load} />}
      {!loading && !error && clans.length === 0 && <Empty icon="🛡" />}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {clans.map((c) => (
          <Link key={c.id} href={`/clans/${c.slug}`} className="card card-hover overflow-hidden block group">
            <div className="relative h-24">
              {c.banner_path ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.banner_path} alt="" className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#9b6bff]/30 to-[#00a8ff]/25" />
              )}
              <div className="absolute inset-0 cover-overlay" />
              <div className="absolute -bottom-6 start-4">
                {c.logo_path ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.logo_path} alt="" className="w-14 h-14 rounded-xl object-cover border-2 border-[#0b0e17] shadow-lg" />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#9b6bff] to-[#4d5cff] border-2 border-[#0b0e17] shadow-lg flex items-center justify-center text-xl font-black">
                    {c.name[0]}
                  </div>
                )}
              </div>
            </div>
            <div className="pt-8 p-4">
              <div className="flex items-center gap-2">
                <span className="font-extrabold group-hover:text-[#c4aaff] transition">{c.name}</span>
                <span className="badge">LV {c.level}</span>
              </div>
              <p className="text-xs text-mute mt-1.5 line-clamp-2 min-h-[2rem]">{c.description || '—'}</p>
              <div className="flex items-center gap-3 mt-3 text-xs text-mute font-semibold">
                <span>👥 {c.members_count} {t('members')}</span>
                <span>⭐ {c.xp} {t('xp')}</span>
                <span className="ms-auto">@{c.leader_username}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {createOpen && <CreateClanModal onClose={() => setCreateOpen(false)} onCreated={load} />}
    </div>
  );
}

function CreateClanModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { t, toast } = useApp();
  const [form, setForm] = useState({ name: '', description: '', games: '' });
  const [logo, setLogo] = useState<File | null>(null);
  const [banner, setBanner] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('name', form.name);
      fd.append('description', form.description);
      fd.append('games', form.games);
      if (logo) fd.append('logo', logo);
      if (banner) fd.append('banner', banner);
      const r = await fetch('/api/clans', { method: 'POST', body: fd });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      toast('🛡 ' + t('clan_create'));
      onCreated();
      onClose();
    } catch (e: any) { toast(e.message, 'error'); } finally { setBusy(false); }
  };

  return (
    <Modal open onClose={onClose} title={`🛡 ${t('clan_create')}`}>
      <div className="space-y-4">
        <div>
          <label className="label">{t('clan_name')} *</label>
          <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required maxLength={40} />
        </div>
        <div>
          <label className="label">{t('description')}</label>
          <textarea className="input" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={500} />
        </div>
        <div>
          <label className="label">{t('games')} (comma separated)</label>
          <input className="input" value={form.games} onChange={(e) => setForm({ ...form, games: e.target.value })} placeholder="CODM, Valorant" maxLength={200} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">{t('logo')}</label>
            <input type="file" accept="image/*" className="input !py-1.5 text-xs" onChange={(e) => setLogo(e.target.files?.[0] || null)} />
          </div>
          <div>
            <label className="label">{t('banner')}</label>
            <input type="file" accept="image/*" className="input !py-1.5 text-xs" onChange={(e) => setBanner(e.target.files?.[0] || null)} />
          </div>
        </div>
        <div className="text-[11px] text-mute">+50 XP {t('reward')}</div>
        <div className="flex justify-end gap-2">
          <button className="btn-ghost !py-2 text-sm" onClick={onClose}>{t('cancel')}</button>
          <button className="btn-neon !py-2 text-sm" disabled={busy || !form.name.trim()} onClick={submit}>
            {busy ? t('creating') : t('clan_create')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
