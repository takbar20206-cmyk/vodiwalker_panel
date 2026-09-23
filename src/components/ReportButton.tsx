'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from './AppProvider';

const REASONS = [
  { id: 'spam', key: 'report_reason_spam' },
  { id: 'harassment', key: 'report_reason_harassment' },
  { id: 'inappropriate', key: 'report_reason_inappropriate' },
  { id: 'cheating', key: 'report_reason_cheating' },
  { id: 'other', key: 'report_reason_other' },
];

export function ReportButton({ targetType, targetId, className }: { targetType: string; targetId: number; className?: string }) {
  const { t, toast, user } = useApp();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('spam');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!user) return toast(t('login_first'), 'error');
    setBusy(true);
    try {
      const r = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_type: targetType, target_id: targetId, reason, details }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed');
      toast(t('report_sent'));
      setOpen(false);
      setDetails('');
    } catch (e: any) {
      toast(e.message || t('already_reported'), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true); }} className={className || 'text-xs text-mute hover:text-[#ff8fa8] transition font-semibold'}>
        ⚑ {t('report')}
      </button>
      {open && (
        <div className="fixed inset-0 z-[95] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="glass rounded-2xl w-full max-w-md fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-[#1c2233] font-extrabold">{t('report')} — {t(`report_target_${targetType}`)}</div>
            <div className="p-5 space-y-4">
              <div>
                <label className="label">{t('what_wrong')}</label>
                <div className="grid grid-cols-1 gap-2">
                  {REASONS.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setReason(r.id)}
                      className={`px-3 py-2 rounded-xl text-sm font-semibold text-start border transition ${
                        reason === r.id ? 'border-[#00a8ff]/70 bg-[#00a8ff]/12 text-white' : 'border-[#1c2233] text-mute hover:border-[#00a8ff]/30'
                      }`}
                    >
                      {t(r.key)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">{t('optional_details')}</label>
                <textarea className="input" rows={3} value={details} onChange={(e) => setDetails(e.target.value)} maxLength={500} />
              </div>
              <div className="flex gap-2 justify-end">
                <button className="btn-ghost !py-2 text-sm" onClick={() => setOpen(false)}>{t('cancel')}</button>
                <button className="btn-danger !py-2 text-sm" disabled={busy} onClick={submit}>
                  {busy ? t('creating') : t('report_submit')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function timeAgo(iso: string): string {
  if (!iso) return '';
  // sqlite datetime('now') is UTC without timezone
  const s = iso.includes('T') ? iso : iso.replace(' ', 'T') + 'Z';
  const d = new Date(s);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return 'now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return d.toLocaleDateString();
}
