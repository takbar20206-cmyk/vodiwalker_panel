'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useApp } from './AppProvider';

export function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const cls = size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-3xl' : 'text-xl';
  return (
    <Link href="/" className="flex items-center gap-2 group" aria-label="GAMER ID">
      <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#00a8ff] to-[#4d5cff] shadow-[0_0_18px_rgba(0,168,255,0.5)] font-black text-white text-sm">
        G<span className="text-[10px]">ID</span>
      </span>
      <span className={`${cls} font-extrabold tracking-wide neon-text`}>GAMER&nbsp;ID</span>
    </Link>
  );
}

function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState('');
  const [data, setData] = useState<{ players: []; games: []; clans: []; clips: [] }>({ players: [], games: [], clans: [], clips: [] });
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { t } = useApp();

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!q.trim()) { setData({ players: [], games: [], clans: [], clips: [] }); return; }
    setLoading(true);
    const ctrl = new AbortController();
    const tm = setTimeout(async () => {
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        if (r.ok) setData(await r.json());
      } catch { /* aborted */ }
      finally { setLoading(false); }
    }, 180);
    return () => { clearTimeout(tm); ctrl.abort(); };
  }, [q]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  if (!open) return null;
  const go = (href: string) => { onClose(); setQ(''); router.push(href); };

  return (
    <div className="fixed inset-0 z-[90] bg-black/70 backdrop-blur-sm flex items-start justify-center pt-[10vh] px-4" onClick={onClose}>
      <div className="w-full max-w-2xl glass rounded-2xl overflow-hidden fade-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1c2233]">
          <span className="text-neon text-lg">⌕</span>
          <input
            ref={inputRef}
            className="flex-1 bg-transparent outline-none text-[15px] py-1"
            placeholder={t('search_placeholder')}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && q.trim()) go(`/search?q=${encodeURIComponent(q)}`); }}
          />
          {loading && <div className="spinner" />}
          <button onClick={onClose} className="text-mute hover:text-white text-sm font-bold px-2">ESC</button>
        </div>
        <div className="max-h-[55vh] overflow-y-auto p-2">
          {data.players.length > 0 && <ResultHeader label={t('search_players')} />}
          {data.players.map((p: any) => (
            <button key={`p${p.id}`} onClick={() => go(`/${p.username}`)} className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-[#00a8ff]/10 transition text-start">
              <Avatar avatar={p.avatar_path} name={p.display_name || p.username} level={p.level} />
              <div>
                <div className="font-bold text-sm">{p.display_name || p.username}</div>
                <div className="text-mute text-xs">@{p.username} · Lv {p.level}</div>
              </div>
            </button>
          ))}
          {data.games.length > 0 && <ResultHeader label={t('games')} />}
          {data.games.map((g: any) => (
            <button key={`g${g.id}`} onClick={() => go(`/games?highlight=${g.id}`)} className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-[#00a8ff]/10 transition text-start">
              <div className="h-9 w-14 rounded-md overflow-hidden bg-[#151a29] flex items-center justify-center text-xs font-bold" style={{ color: g.accent }}>{g.name.slice(0, 6)}</div>
              <div className="font-bold text-sm">{g.name}</div>
            </button>
          ))}
          {data.clans.length > 0 && <ResultHeader label={t('nav_clans')} />}
          {data.clans.map((c: any) => (
            <button key={`c${c.id}`} onClick={() => go(`/clans/${c.slug}`)} className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-[#00a8ff]/10 transition text-start">
              <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-[#9b6bff] to-[#4d5cff] flex items-center justify-center text-xs font-black">{c.name[0]}</div>
              <div className="font-bold text-sm">{c.name} <span className="text-mute font-normal text-xs">Lv {c.level} · {c.members_count} {t('members')}</span></div>
            </button>
          ))}
          {data.clips.length > 0 && <ResultHeader label={t('search_clips')} />}
          {data.clips.map((c: any) => (
            <button key={`cl${c.id}`} onClick={() => go(`/explore?clip=${c.id}`)} className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-[#00a8ff]/10 transition text-start">
              <div className="h-9 w-14 rounded-md bg-[#151a29] flex items-center justify-center">▶</div>
              <div>
                <div className="font-bold text-sm">{c.title}</div>
                <div className="text-mute text-xs">@{c.username} · {c.views} {t('views')}</div>
              </div>
            </button>
          ))}
          {!loading && q && data.players.length + data.games.length + data.clans.length + data.clips.length === 0 && (
            <div className="p-8 text-center text-mute text-sm">{t('search_no_results')}</div>
          )}
          {!q && (
            <div className="p-6 text-center text-mute text-sm">
              {t('search_placeholder')}
            </div>
          )}
        </div>
        <div className="px-4 py-2.5 border-t border-[#1c2233] text-xs text-mute flex justify-between">
          <span>Enter → /search</span>
          <span>GAMER ID</span>
        </div>
      </div>
    </div>
  );
}

function ResultHeader({ label, children }: { label: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="px-3 pt-3 pb-1 text-[11px] font-extrabold tracking-widest text-[#00a8ff] uppercase">
      {label}{children}
    </div>
  );
}

export function Avatar({ avatar, name, level, size = 40, ring }: { avatar?: string | null; name: string; level?: number; size?: number; ring?: boolean }) {
  const initials = (name || '?').trim().charAt(0).toUpperCase() || '?';
  return (
    <div className={`relative shrink-0 ${ring ? 'avatar-ring rounded-full' : ''}`} style={{ width: size, height: size }}>
      {avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatar} alt={name} width={size} height={size} className={`rounded-full object-cover w-full h-full ${ring ? '' : ''}`} loading="lazy" />
      ) : (
        <div
          className="rounded-full flex items-center justify-center font-black text-white bg-gradient-to-br from-[#00a8ff] via-[#4d5cff] to-[#9b6bff]"
          style={{ width: size, height: size, fontSize: size * 0.4 }}
        >
          {initials}
        </div>
      )}
      {level !== undefined && (
        <span className="absolute -bottom-1 -end-1 bg-[#0b0e17] border border-[#00a8ff]/60 text-[9px] font-black text-[#7cc9ff] rounded-full px-1.5 py-px leading-tight">
          {level}
        </span>
      )}
    </div>
  );
}

export function Navbar() {
  const { user, loading, logout, unread, unreadMessages, t, lang, setLang } = useApp();
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => { setMenuOpen(false); }, [pathname]);
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setSearchOpen(true); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const links = [
    { href: '/explore', label: t('nav_explore') },
    { href: '/players', label: t('nav_players') },
    { href: '/games', label: t('nav_games') },
    { href: '/clans', label: t('nav_clans') },
    { href: '/leaderboard', label: t('nav_leaderboard') },
    { href: '/squads', label: t('nav_squads') },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 glass border-b border-[#1c2233]/80">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-4">
          <Logo />
          <nav className="hidden lg:flex items-center gap-5 me-2">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className={`nav-link ${pathname?.startsWith(l.href) ? 'active' : ''}`}>
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="flex-1" />
          <button
            onClick={() => setSearchOpen(true)}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0a0d15] border border-[#1c2233] text-mute text-sm hover:border-[#00a8ff]/40 transition min-w-[160px]"
          >
            <span>⌕</span><span className="text-xs">{t('nav_search')}</span>
            <span className="ms-auto text-[10px] border border-[#1c2233] rounded px-1">Ctrl K</span>
          </button>
          <button onClick={() => setSearchOpen(true)} className="sm:hidden text-xl text-mute" aria-label="Search">⌕</button>

          <button onClick={() => setLang(lang === 'fa' ? 'en' : 'fa')} className="hidden sm:block text-xs font-bold px-2.5 py-1.5 rounded-lg border border-[#1c2233] text-mute hover:text-white hover:border-[#00a8ff]/40 transition" title="Language">
            {lang === 'fa' ? 'EN' : 'فا'}
          </button>

          {loading ? (
            <div className="spinner" />
          ) : user ? (
            <div className="flex items-center gap-2">
              <Link href="/notifications" className="relative p-2 text-lg text-mute hover:text-white transition" aria-label={t('nav_notifications')}>
                🔔
                {unread > 0 && <span className="absolute top-0.5 end-0.5 bg-[#ff2e63] text-[9px] font-black rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">{unread > 99 ? '99+' : unread}</span>}
              </Link>
              <Link href="/messages" className="relative p-2 text-lg text-mute hover:text-white transition mobile-hide-ico" aria-label={t('nav_messages')}>
                💬
                {unreadMessages > 0 && <span className="absolute top-0.5 end-0.5 bg-[#ff2e63] text-[9px] font-black rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">{unreadMessages > 99 ? '99+' : unreadMessages}</span>}
              </Link>
              <div className="relative">
                <button onClick={() => setMenuOpen((o) => !o)} className="flex items-center gap-2" aria-label="Menu">
                  <Avatar avatar={user.avatar_path} name={user.display_name || user.username} level={user.level} size={36} />
                </button>
                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                    <div className="absolute end-0 top-full mt-2 w-56 glass rounded-xl overflow-hidden z-50 fade-in shadow-2xl">
                      <div className="px-4 py-3 border-b border-[#1c2233]">
                        <div className="font-bold text-sm">{user.display_name || user.username}</div>
                        <div className="text-mute text-xs">@{user.username} · Lv {user.level}</div>
                        <div className="mt-2 xp-track"><div className="xp-fill" style={{ width: `${Math.min(100, (user.xp % 1000) / 10)}%` }} /></div>
                      </div>
                      <MenuLink href={`/${user.username}`}>{t('nav_profile')}</MenuLink>
                      <MenuLink href="/create">✂ {t('clip_upload')}</MenuLink>
                      <MenuLink href="/challenges">🎯 {t('nav_challenges')}</MenuLink>
                      <MenuLink href="/settings">⚙ {t('nav_settings')}</MenuLink>
                      {user.role === 'admin' && <MenuLink href="/admin">🛡 {t('nav_admin')}</MenuLink>}
                      <button
                        onClick={() => { setMenuOpen(false); logout(); }}
                        className="w-full text-start px-4 py-2.5 text-sm font-semibold text-[#ff8fa8] hover:bg-[#ff2e63]/10 transition"
                      >
                        {t('nav_logout')}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login" className="btn-ghost !py-1.5 !px-3.5 text-sm desktop-auth">{t('nav_login')}</Link>
              <Link href="/register" className="btn-neon !py-1.5 !px-3.5 text-sm">{t('nav_register')}</Link>
            </div>
          )}
        </div>
      </header>
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}

function MenuLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="block px-4 py-2.5 text-sm font-semibold text-[#c5cde0] hover:bg-[#00a8ff]/10 hover:text-white transition">
      {children}
    </Link>
  );
}

export function BottomNav() {
  const { user, t } = useApp();
  const pathname = usePathname();
  const items = [
    { href: '/', icon: '⌂', label: t('home') },
    { href: '/explore', icon: '◉', label: t('explore') },
    { href: '/create', icon: '+', label: t('create'), center: true },
    { href: '/messages', icon: '✉', label: t('nav_messages') },
    { href: user ? `/${user.username}` : '/login', icon: '☰', label: t('profile') },
  ];
  return (
    <nav className="bottom-nav mobile-only flex" aria-label="Mobile navigation">
      {items.map((it) => (
        <Link key={it.href} href={it.href} className={`bn-item ${pathname === it.href ? 'active' : ''}`}>
          {it.center ? (
            <span className="bn-create">{it.icon}</span>
          ) : (
            <span className="bn-ico">{it.icon}</span>
          )}
          <span>{it.label}</span>
        </Link>
      ))}
    </nav>
  );
}
