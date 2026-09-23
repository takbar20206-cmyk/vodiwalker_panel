'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useApp } from '@/components/AppProvider';
import { Suspense } from 'react';

function LoginForm() {
  const { t, setUser, refresh, toast } = useApp();
  const router = useRouter();
  const sp = useSearchParams();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const r = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || t('invalid_login'));
      await refresh();
      toast(t('welcome_back'));
      const next = sp.get('next');
      router.push(next && next.startsWith('/') ? next : '/');
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-10 relative overflow-hidden">
      <div className="absolute inset-0 hero-glow opacity-60" />
      <div className="absolute inset-0 hero-grid" />
      <form onSubmit={submit} className="relative w-full max-w-md glass rounded-2xl p-7 fade-in">
        <div className="text-center mb-7">
          <div className="text-3xl mb-2">🎮</div>
          <h1 className="text-2xl font-black">{t('login_title')}</h1>
          <p className="text-mute text-sm mt-1">Your Gaming Identity.</p>
        </div>

        {error && (
          <div className="mb-4 px-3 py-2.5 rounded-xl bg-[#ff2e63]/10 border border-[#ff2e63]/35 text-[#ffb3c4] text-sm font-semibold">
            ⚠ {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="label">{t('email')} / {t('username')}</label>
            <input className="input" value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoComplete="username" required maxLength={200} />
          </div>
          <div>
            <label className="label">{t('password')}</label>
            <div className="relative">
              <input
                className="input pe-12"
                type={show ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button type="button" onClick={() => setShow(!show)} className="absolute end-3 top-1/2 -translate-y-1/2 text-mute text-sm">
                {show ? '🙈' : '👁'}
              </button>
            </div>
          </div>
          <Link href="/forgot-password" className="text-xs text-[#7cc9ff] hover:underline block text-end">
            {t('forgot_title')}?
          </Link>
          <button type="submit" disabled={busy} className="btn-neon w-full !py-3.5">
            {busy ? <span className="inline-flex items-center gap-2"><span className="spinner !w-4 !h-4 !border-2" /> {t('creating')}</span> : `⚡ ${t('login_submit')}`}
          </button>
        </div>

        <div className="mt-6 text-center text-sm text-mute">
          {t('or_register')}{' '}
          <Link href="/register" className="text-[#7cc9ff] font-bold hover:underline">
            {t('register')}
          </Link>
        </div>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
