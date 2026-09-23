'use client';
import { useCallback, useEffect, useState } from 'react';
import { useApp } from '@/components/AppProvider';
import { Tabs, Loading, ErrorBox, Empty, Modal } from '@/components/UI';

type Challenge = {
  id: number;
  slug: string;
  title: string;
  title_fa: string;
  description: string;
  description_fa: string;
  kind: 'daily' | 'weekly' | 'special';
  xp_reward: number;
  proof_required: number;
  active: number;
  viewer: { status: string; proof_note: string; completed_at: string | null } | null;
};

export default function ChallengesPage() {
  const { t, user, toast, lang, refresh } = useApp();
  const [kind, setKind] = useState<'all' | 'daily' | 'weekly' | 'special'>('all');
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitFor, setSubmitFor] = useState<Challenge | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/challenges${kind !== 'all' ? `?kind=${kind}` : ''}`, { cache: 'no-store' });
      if (!r.ok) throw new Error((await r.json()).error || 'Failed');
      const d = await r.json();
      setChallenges(d.challenges || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [kind]);

  useEffect(() => { load(); }, [load]);

  const start = async (c: Challenge) => {
    if (!user) return toast(t('login_first'), 'error');
    try {
      const r = await fetch('/api/challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challenge_id: c.id, action: 'start' }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      toast('⚡ ' + t('challenge_active'));
      load();
    } catch (e: any) { toast(e.message, 'error'); }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-black">⚡ {t('nav_challenges')}</h1>
        <p className="text-mute text-sm mt-1">{t('feat_challenge_desc')}</p>
      </div>

      <Tabs
        tabs={[
          { id: 'all', label: t('filter_all') },
          { id: 'daily', label: `☀ ${t('challenge_daily')}` },
          { id: 'weekly', label: `📅 ${t('challenge_weekly')}` },
          { id: 'special', label: `🌟 ${t('challenge_special')}` },
        ]}
        active={kind}
        onChange={(id) => setKind(id as typeof kind)}
      />

      <div className="mt-5">
        {loading && <Loading />}
        {error && <ErrorBox message={error} onRetry={load} />}
        {!loading && !error && challenges.length === 0 && <Empty icon="⚡" />}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {challenges.map((c) => {
            const status = c.viewer?.status;
            const badge =
              status === 'completed' ? 'badge badge-lime' : status === 'active' ? 'badge badge-gold' : 'badge';
            return (
              <div key={c.id} className={`card card-hover p-5 relative overflow-hidden ${status === 'completed' ? 'border-[#7cff6b]/35' : ''}`}>
                <div className="absolute -top-10 -end-10 w-32 h-32 rounded-full blur-3xl" style={{ background: c.kind === 'special' ? 'rgba(255,200,87,0.12)' : c.kind === 'weekly' ? 'rgba(155,107,255,0.12)' : 'rgba(0,168,255,0.12)' }} />
                <div className="relative">
                  <div className="flex items-start justify-between gap-3">
                    <div className={`badge ${c.kind === 'special' ? 'badge-gold' : c.kind === 'weekly' ? '' : 'badge-lime'}`}>
                      {c.kind === 'daily' ? `☀ ${t('challenge_daily')}` : c.kind === 'weekly' ? `📅 ${t('challenge_weekly')}` : `🌟 ${t('challenge_special')}`}
                    </div>
                    <span className={badge}>{status === 'completed' ? `✓ ${t('challenge_completed')}` : status === 'active' ? t('challenge_active') : t('pending')}</span>
                  </div>

                  <h3 className="font-black text-lg mt-3">{lang === 'fa' ? c.title_fa : c.title}</h3>
                  <p className="text-mute text-sm mt-1 leading-relaxed">{lang === 'fa' ? c.description_fa : c.description}</p>

                  <div className="flex items-center gap-3 mt-4">
                    <span className="badge badge-gold">+{c.xp_reward} XP</span>
                    {c.proof_required ? <span className="badge badge-mute">📎 {t('challenge_submit')}</span> : null}
                  </div>

                  <div className="flex gap-2 mt-4">
                    {!user ? (
                      <a href="/login" className="btn-ghost !py-2 text-xs flex-1 text-center">{t('login_first')}</a>
                    ) : !status ? (
                      <button className="btn-neon !py-2 text-xs flex-1" onClick={() => start(c)}>▶ {t('challenge_start')}</button>
                    ) : status === 'active' ? (
                      <button className="btn-neon !py-2 text-xs flex-1" onClick={() => setSubmitFor(c)}>📎 {t('challenge_submit')}</button>
                    ) : (
                      <span className="badge badge-lime !py-2 flex-1 justify-center">✓ +{c.xp_reward} XP · {String(c.viewer?.completed_at || '').slice(0, 10)}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {submitFor && (
        <SubmitProofModal
          challenge={submitFor}
          onClose={() => setSubmitFor(null)}
          onDone={() => { setSubmitFor(null); load(); refresh(); }}
        />
      )}
    </div>
  );
}

function SubmitProofModal({ challenge, onClose, onDone }: { challenge: Challenge; onClose: () => void; onDone: () => void }) {
  const { t, toast, lang } = useApp();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      const r = await fetch('/api/challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challenge_id: challenge.id, action: 'submit', proof_note: note }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      toast(`🎉 +${d.xp} XP`);
      onDone();
    } catch (e: any) { toast(e.message, 'error'); } finally { setBusy(false); }
  };

  return (
    <Modal open onClose={onClose} title={`📎 ${t('challenge_submit')}`}>
      <div className="space-y-4">
        <div className="bg-[#0d111c] rounded-xl p-4 border border-[#161b2a]">
          <div className="font-bold text-sm">{lang === 'fa' ? challenge.title_fa : challenge.title}</div>
          <div className="badge badge-gold mt-2">+{challenge.xp_reward} XP</div>
        </div>
        <div>
          <label className="label">{t('proof_note')}</label>
          <textarea className="input" rows={4} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500}
            placeholder={challenge.proof_required ? 'Match ID / clip link / screenshot description…' : 'Optional note…'} />
        </div>
        <div className="flex justify-end gap-2">
          <button className="btn-ghost !py-2 text-sm" onClick={onClose}>{t('cancel')}</button>
          <button className="btn-neon !py-2 text-sm" disabled={busy || (!!challenge.proof_required && !note.trim())} onClick={submit}>
            {busy ? t('creating') : t('challenge_submit')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
