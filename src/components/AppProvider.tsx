'use client';
import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

export type Me = {
  id: number;
  username: string;
  email: string;
  role: string;
  language: string;
  theme: string;
  avatar_path: string | null;
  display_name: string;
  xp: number;
  level: number;
  country: string;
  bio: string;
  cover_path: string | null;
  followers_count: number;
  following_count: number;
  friends_count: number;
  posts_count: number;
} | null;

type Ctx = {
  user: Me;
  loading: boolean;
  unread: number;
  unreadMessages: number;
  setUser: (u: Me) => void;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  toast: (msg: string, kind?: 'success' | 'error') => void;
  lang: 'fa' | 'en';
  setLang: (l: 'fa' | 'en') => void;
  t: (k: string) => string;
};

const AppCtx = createContext<Ctx | null>(null);

// minimal dictionary access — falls back to key
import { dict } from '@/lib/i18n';

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Me>(null);
  const [loading, setLoading] = useState(true);
  const [unread, setUnread] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [toasts, setToasts] = useState<{ id: number; msg: string; kind: string }[]>([]);
  const [lang, setLangState] = useState<'fa' | 'en'>('fa');
  const router = useRouter();

  const toast = useCallback((msg: string, kind: 'success' | 'error' = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const r = await fetch('/api/auth/me', { cache: 'no-store' });
      const d = await r.json();
      setUser(d.user);
      setUnread(d.unread || 0);
      setUnreadMessages(d.unreadMessages || 0);
      if (d.user?.language === 'en' || d.user?.language === 'fa') setLangState(d.user.language);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const c = document.cookie.match(/gid_lang=(fa|en)/);
    if (c) setLangState(c[1] as 'fa' | 'en');
    refresh();
    const iv = setInterval(() => {
      if (document.cookie.includes('gid_session')) refresh();
    }, 45000);
    return () => clearInterval(iv);
  }, [refresh]);

  const setLang = useCallback((l: 'fa' | 'en') => {
    setLangState(l);
    document.cookie = `gid_lang=${l}; path=/; max-age=${60 * 60 * 24 * 365}`;
    document.documentElement.lang = l;
    document.documentElement.dir = l === 'fa' ? 'rtl' : 'ltr';
    fetch('/api/actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'language', lang: l }),
    }).catch(() => {});
  }, []);

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    setUnread(0);
    setUnreadMessages(0);
    router.push('/');
    router.refresh();
  }, [router]);

  const t = useCallback(
    (k: string) => {
      const table = dict[lang] as Record<string, string>;
      return table[k] ?? dict.en[k as keyof typeof dict.en] ?? k;
    },
    [lang]
  );

  return (
    <AppCtx.Provider value={{ user, loading, unread, unreadMessages, setUser, refresh, logout, toast, lang, setLang, t }}>
      {children}
      <div className="toast-wrap">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`}>{t.msg}</div>
        ))}
      </div>
    </AppCtx.Provider>
  );
}

export function useApp(): Ctx {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error('useApp outside provider');
  return ctx;
}
