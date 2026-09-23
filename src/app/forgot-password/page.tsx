'use client';
import { useState } from 'react';
import { useApp } from '@/components/AppProvider';
import Link from 'next/link';

export default function ForgotPage() {
  const { t, toast } = useApp();
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [resultToken, setResultToken] = useState('');

  const request = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await fetch('/api/auth/forgot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      if (d.token) setResultToken(d.token);
      setStep(2);
      toast(t('forgot_sent'));
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const reset = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await fetch('/api/auth/forgot', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      toast(t('reset_done'));
      window.location.href = '/login';
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-10 relative overflow-hidden">
      <div className="absolute inset-0 hero-glow opacity-50" />
      <div className="relative w-full max-w-md glass rounded-2xl p-7 fade-in">
        <h1 className="text-2xl font-black text-center mb-2">🔑 {t('forgot_title')}</h1>
        <p className="text-mute text-sm text-center mb-6">GAMER ID — Your Gaming Identity.</p>

        {step === 1 ? (
          <form onSubmit={request} className="space-y-4">
            <div>
              <label className="label">{t('email')}</label>
              <input className="input" dir="ltr" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <button className="btn-neon w-full" disabled={busy}>
              {busy ? t('creating') : t('forgot_submit')}
            </button>
          </form>
        ) : (
          <form onSubmit={reset} className="space-y-4">
            {resultToken && (
              <div className="px-3 py-2 rounded-xl bg-[#ffc857]/10 border border-[#ffc857]/35 text-[#ffd98a] text-xs">
                Reset token (dev mode, no SMTP): <code className="font-mono break-all">{resultToken}</code>
              </div>
            )}
            <div>
              <label className="label">Token</label>
              <input className="input" dir="ltr" value={token} onChange={(e) => setToken(e.target.value)} required placeholder="paste reset token" />
            </div>
            <div>
              <label className="label">{t('new_password')}</label>
              <input className="input" dir="ltr" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
            </div>
            <button className="btn-neon w-full" disabled={busy}>
              {busy ? t('creating') : t('reset_done')}
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          <Link href="/login" className="text-sm text-[#7cc9ff] hover:underline">← {t('nav_login')}</Link>
        </div>
      </div>
    </div>
  );
}
