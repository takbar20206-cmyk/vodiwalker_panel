'use client';
import { useEffect, useState } from 'react';
import { useApp } from './AppProvider';

export function DailyRewardClient() {
  const { t, toast, refresh } = useApp();
  const [state, setState] = useState<'loading' | 'available' | 'claimed'>('loading');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const last = localStorage.getItem('gid_daily') || '';
    const today = new Date().toISOString().slice(0, 10);
    setState(last === today ? 'claimed' : 'available');
  }, []);

  const claim = async () => {
    setBusy(true);
    try {
      const r = await fetch('/api/daily', { method: 'POST' });
      const d = await r.json();
      if (d.ok || d.already) {
        const today = new Date().toISOString().slice(0, 10);
        localStorage.setItem('gid_daily', today);
        setState('claimed');
        toast(d.ok ? `+${d.amount} XP 🎉` : t('claimed'));
        refresh();
      } else {
        toast(d.error || t('error_generic'), 'error');
      }
    } catch {
      toast(t('error_generic'), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card p-5 relative overflow-hidden">
      <div className="absolute -top-8 -end-8 w-24 h-24 rounded-full bg-[#ffc857]/10 blur-2xl" />
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-extrabold tracking-widest text-[#ffc857] uppercase mb-1">🎁 {t('daily_reward')}</div>
          <div className="text-sm text-mute">+20 XP — {t('claim')}</div>
        </div>
        <button
          onClick={claim}
          disabled={state !== 'available' || busy}
          className={state === 'claimed' ? 'badge badge-gold' : 'btn-neon !py-2 text-xs'}
        >
          {state === 'loading' ? '…' : state === 'claimed' ? t('claimed') : t('claim')}
        </button>
      </div>
    </div>
  );
}
