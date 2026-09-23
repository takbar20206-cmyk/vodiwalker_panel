'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/components/AppProvider';

export default function RegisterPage() {
  const { t, refresh, toast } = useApp();
  const router = useRouter();
  const [form, setForm] = useState({ username: '', email: '', password: '', passwordConfirm: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (form.password !== form.passwordConfirm) throw new Error(t('password_mismatch'));
      if (form.password.length < 8) throw new Error(t('weak_password'));
      const r = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const d = await r.json();
      if (!r.ok) {
        if (d.code === 'USERNAME_TAKEN') throw new Error(t('username_taken'));
        if (d.code === 'EMAIL_TAKEN') throw new Error(t('email_taken'));
        throw new Error(d.error || t('error_generic'));
      }
      await refresh();
      toast('🎉 GAMER ID created');
      router.push(`/${d.user.username}?welcome=1`);
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const strength = Math.min(4, Math.floor(form.password.length / 3) + (/[^a-zA-Z0-9]/.test(form.password) ? 1 : 0) + (/\d/.test(form.password) ? 1 : 0));

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-10 relative overflow-hidden">
      <div className="absolute inset-0 hero-glow opacity-60" />
      <div className="absolute inset-0 hero-grid" />
      <form onSubmit={submit} className="relative w-full max-w-md glass rounded-2xl p-7 fade-in">
        <div className="text-center mb-7">
          <div className="text-3xl mb-2">⚡</div>
          <h1 className="text-2xl font-black">{t('register_title')}</h1>
          <p className="text-mute text-sm mt-1">{t('join_free')} — {t('hero_title')}</p>
        </div>

        {error && (
          <div className="mb-4 px-3 py-2.5 rounded-xl bg-[#ff2e63]/10 border border-[#ff2e63]/35 text-[#ffb3c4] text-sm font-semibold">
            ⚠ {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="label">{t('username')}</label>
            <input className="input" dir="ltr" placeholder="e.g. shir_talabi" value={form.username} onChange={set('username')} required maxLength={24} pattern="[a-zA-Z0-9_]{3,24}" title="3-24 chars: letters, numbers, _" />
          </div>
          <div>
            <label className="label">{t('email')}</label>
            <input className="input" dir="ltr" type="email" value={form.email} onChange={set('email')} required maxLength={200} />
          </div>
          <div>
            <label className="label">{t('password')}</label>
            <input className="input" dir="ltr" type="password" value={form.password} onChange={set('password')} required minLength={8} autoComplete="new-password" />
            <div className="flex gap-1 mt-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className={`h-1 flex-1 rounded-full transition ${i < strength ? (strength >= 3 ? 'bg-[#7cff6b]' : 'bg-[#ffc857]') : 'bg-[#1c2233]'}`} />
              ))}
            </div>
          </div>
          <div>
            <label className="label">{t('password_confirm')}</label>
            <input className="input" dir="ltr" type="password" value={form.passwordConfirm} onChange={set('passwordConfirm')} required autoComplete="new-password" />
          </div>
          <button type="submit" disabled={busy} className="btn-neon w-full !py-3.5">
            {busy ? t('creating') : `⚡ ${t('register_submit')}`}
          </button>
        </div>

        <div className="mt-6 text-center text-sm text-mute">
          {t('or_login')}{' '}
          <Link href="/login" className="text-[#7cc9ff] font-bold hover:underline">
            {t('nav_login')}
          </Link>
        </div>
      </form>
    </div>
  );
}
