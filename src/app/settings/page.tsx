'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/components/AppProvider';
import { Loading, Empty } from '@/components/UI';

const TABS = ['account', 'profile', 'privacy', 'security', 'notifications', 'language', 'theme', 'connected'] as const;
type Tab = (typeof TABS)[number];

export default function SettingsPage() {
  const { t, user, loading, toast, refresh, lang, setLang, logout } = useApp();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('account');
  const [busy, setBusy] = useState(false);

  const [account, setAccount] = useState({ username: '', email: '' });
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const [profile, setProfile] = useState({ display_name: '', bio: '', country: '' });
  const [privacy, setPrivacy] = useState({ is_public: true, show_country: true, show_email: false, show_activity: true });
  const [notif, setNotif] = useState({ new_follower: true, message: true, achievement: true, challenge: true, clan: true, clip: true });
  const [theme, setTheme] = useState('dark');
  const [connected, setConnected] = useState<any[]>([]);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push('/login?next=/settings'); return; }
    setAccount({ username: user.username, email: user.email });
    setProfile({ display_name: user.display_name || '', bio: user.bio || '', country: user.country || '' });
    const savedN = localStorage.getItem('gid_notif');
    if (savedN) { try { setNotif(JSON.parse(savedN)); } catch {} }
    setTheme(user.theme || 'dark');
    fetch(`/api/games?userId=${user.id}`).then((r) => r.json()).then((d) => setConnected(d.games || [])).catch(() => {});
    fetch(`/api/users/${user.username}`).then((r) => r.json()).then((d) => {
      if (d.profile) {
        setPrivacy({
          is_public: !!d.profile.is_public,
          show_country: !!d.profile.show_country,
          show_email: !!d.profile.show_email,
          show_activity: !!d.profile.show_activity,
        });
        setProfile({ display_name: d.profile.display_name || '', bio: d.profile.bio || '', country: d.profile.country || '' });
      }
    }).catch(() => {});
  }, [user, loading, router]);

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-10"><Loading /></div>;
  if (!user) return null;

  const save = async (payload: Record<string, unknown>, msg = t('settings_saved')) => {
    setBusy(true);
    try {
      const r = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      toast(msg);
      refresh();
    } catch (e: any) { toast(e.message, 'error'); } finally { setBusy(false); }
  };

  const saveProfile = async () => {
    setBusy(true);
    try {
      const r = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...profile,
          is_public: privacy.is_public ? 1 : 0,
          show_country: privacy.show_country ? 1 : 0,
          show_email: privacy.show_email ? 1 : 0,
          show_activity: privacy.show_activity ? 1 : 0,
        }),
      });
      if (!r.ok) throw new Error((await r.json()).error);
      toast(t('settings_saved'));
      refresh();
    } catch (e: any) { toast(e.message, 'error'); } finally { setBusy(false); }
  };

  const changePassword = async () => {
    if (pw.newPassword.length < 8) return toast(t('weak_password'), 'error');
    setBusy(true);
    try {
      const r = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pw),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      toast(t('reset_done'));
      setPw({ currentPassword: '', newPassword: '' });
    } catch (e: any) { toast(e.message, 'error'); } finally { setBusy(false); }
  };

  const logoutAll = async () => {
    await fetch('/api/profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ logoutAll: true }) });
    await logout();
  };

  const tabLabel = (id: Tab) => {
    const map: Record<Tab, string> = {
      account: `⚙ ${t('settings_account')}`,
      profile: `👤 ${t('settings_profile')}`,
      privacy: `🔏 ${t('settings_privacy')}`,
      security: `🔒 ${t('settings_security')}`,
      notifications: `🔔 ${t('settings_notifications')}`,
      language: `🌐 ${t('settings_language')}`,
      theme: `🎨 ${t('settings_theme')}`,
      connected: `🎮 ${t('settings_connected')}`,
    };
    return map[id];
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 fade-in">
      <h1 className="text-2xl font-black mb-5">⚙ {t('settings')}</h1>

      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-5">
        <nav className="flex md:flex-col gap-1.5 overflow-x-auto pb-2 md:pb-0">
          {TABS.map((tb) => (
            <button
              key={tb}
              onClick={() => setTab(tb)}
              className={`tab text-start whitespace-nowrap ${tab === tb ? 'active' : ''}`}
            >
              {tabLabel(tb)}
            </button>
          ))}
        </nav>

        <div className="card p-5 min-h-[420px]">
          {tab === 'account' && (
            <div className="space-y-5 max-w-md">
              <h2 className="font-extrabold text-lg">{t('settings_account')}</h2>
              <div>
                <label className="label">{t('username')}</label>
                <input className="input" dir="ltr" value={account.username} onChange={(e) => setAccount({ ...account, username: e.target.value })} maxLength={24} />
              </div>
              <div>
                <label className="label">{t('email')}</label>
                <input className="input" dir="ltr" type="email" value={account.email} onChange={(e) => setAccount({ ...account, email: e.target.value })} />
              </div>
              <button className="btn-neon !py-2 text-sm" disabled={busy} onClick={() => save(account)}>
                {busy ? t('creating') : t('save')}
              </button>
              <hr className="border-[#1c2233]" />
              <div>
                <div className="font-extrabold text-sm text-[#ff8fa8] mb-2">{t('danger_zone')}</div>
                <div className="flex gap-2">
                  <button className="btn-danger !py-2 text-xs" onClick={logoutAll}>{t('logout_all')}</button>
                </div>
              </div>
            </div>
          )}

          {tab === 'profile' && (
            <div className="space-y-4 max-w-md">
              <h2 className="font-extrabold text-lg">👤 {t('settings_profile')}</h2>
              <div>
                <label className="label">{t('display_name')}</label>
                <input className="input" value={profile.display_name} onChange={(e) => setProfile({ ...profile, display_name: e.target.value })} maxLength={60} />
              </div>
              <div>
                <label className="label">{t('bio')}</label>
                <textarea className="input" rows={3} value={profile.bio} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} maxLength={300} />
              </div>
              <div>
                <label className="label">{t('country')}</label>
                <input className="input" value={profile.country} onChange={(e) => setProfile({ ...profile, country: e.target.value })} maxLength={60} />
              </div>
              <button className="btn-neon !py-2 text-sm" disabled={busy} onClick={saveProfile}>{busy ? t('creating') : t('save')}</button>
            </div>
          )}

          {tab === 'privacy' && (
            <div className="space-y-4 max-w-md">
              <h2 className="font-extrabold text-lg">🔏 {t('settings_privacy')}</h2>
              {([
                ['is_public', 'Public profile'],
                ['show_country', 'Show country'],
                ['show_email', 'Show email'],
                ['show_activity', 'Show activity'],
              ] as const).map(([key, label]) => (
                <label key={key} className="flex items-center justify-between p-3 bg-[#0d111c] rounded-xl border border-[#161b2a] cursor-pointer">
                  <span className="text-sm font-semibold">{label}</span>
                  <input
                    type="checkbox"
                    checked={privacy[key]}
                    onChange={(e) => setPrivacy({ ...privacy, [key]: e.target.checked })}
                    className="w-5 h-5 accent-[#00a8ff]"
                  />
                </label>
              ))}
              <button className="btn-neon !py-2 text-sm" disabled={busy} onClick={saveProfile}>{busy ? t('creating') : t('save')}</button>
            </div>
          )}

          {tab === 'security' && (
            <div className="space-y-5 max-w-md">
              <h2 className="font-extrabold text-lg">🔒 {t('settings_security')}</h2>
              <div>
                <label className="label">{t('current_password')}</label>
                <input className="input" dir="ltr" type="password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} />
              </div>
              <div>
                <label className="label">{t('new_password')}</label>
                <input className="input" dir="ltr" type="password" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} minLength={8} />
              </div>
              <button className="btn-neon !py-2 text-sm" disabled={busy || !pw.currentPassword || !pw.newPassword} onClick={changePassword}>
                {busy ? t('creating') : t('change_password')}
              </button>
              <div className="text-xs text-mute bg-[#0d111c] p-3 rounded-xl border border-[#161b2a]">
                🔐 Passwords are hashed with scrypt. Sessions are httpOnly cookies. Changing the password revokes other sessions.
              </div>
            </div>
          )}

          {tab === 'notifications' && (
            <div className="space-y-4 max-w-md">
              <h2 className="font-extrabold text-lg">🔔 {t('settings_notifications')}</h2>
              {([
                ['new_follower', 'New follower'],
                ['message', 'Messages'],
                ['achievement', 'Achievements'],
                ['challenge', 'Challenge completed'],
                ['clan', 'Clan invitations'],
                ['clip', 'Clip likes'],
              ] as const).map(([key, label]) => (
                <label key={key} className="flex items-center justify-between p-3 bg-[#0d111c] rounded-xl border border-[#161b2a] cursor-pointer">
                  <span className="text-sm font-semibold">{label}</span>
                  <input
                    type="checkbox"
                    checked={notif[key]}
                    onChange={(e) => {
                      const next = { ...notif, [key]: e.target.checked };
                      setNotif(next);
                      localStorage.setItem('gid_notif', JSON.stringify(next));
                      toast(t('settings_saved'));
                    }}
                    className="w-5 h-5 accent-[#00a8ff]"
                  />
                </label>
              ))}
            </div>
          )}

          {tab === 'language' && (
            <div className="space-y-4 max-w-md">
              <h2 className="font-extrabold text-lg">🌐 {t('settings_language')}</h2>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setLang('fa')}
                  className={`p-4 rounded-xl border text-center transition ${lang === 'fa' ? 'border-[#00a8ff] bg-[#00a8ff]/12 shadow-[0_0_16px_rgba(0,168,255,0.25)]' : 'border-[#1c2233] hover:border-[#00a8ff]/40'}`}
                >
                  <div className="text-2xl mb-1">🇮🇷</div>
                  <div className="font-bold text-sm">فارسی</div>
                  <div className="text-mute text-xs mt-0.5">RTL</div>
                </button>
                <button
                  onClick={() => setLang('en')}
                  className={`p-4 rounded-xl border text-center transition ${lang === 'en' ? 'border-[#00a8ff] bg-[#00a8ff]/12 shadow-[0_0_16px_rgba(0,168,255,0.25)]' : 'border-[#1c2233] hover:border-[#00a8ff]/40'}`}
                >
                  <div className="text-2xl mb-1">🇺🇸</div>
                  <div className="font-bold text-sm">English</div>
                  <div className="text-mute text-xs mt-0.5">LTR</div>
                </button>
              </div>
            </div>
          )}

          {tab === 'theme' && (
            <div className="space-y-4 max-w-lg">
              <h2 className="font-extrabold text-lg">🎨 {t('settings_theme')}</h2>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'dark', label: 'Dark', grad: 'from-[#10141f] to-[#05060a]' },
                  { id: 'neon', label: 'Neon', grad: 'from-[#00a8ff]/30 to-[#05060a]' },
                  { id: 'midnight', label: 'Midnight', grad: 'from-[#1a1040] to-[#05060a]' },
                ].map((th) => (
                  <button
                    key={th.id}
                    onClick={() => { setTheme(th.id); save({ theme: th.id }); }}
                    className={`p-3 rounded-xl border transition ${theme === th.id ? 'border-[#00a8ff] shadow-[0_0_16px_rgba(0,168,255,0.25)]' : 'border-[#1c2233] hover:border-[#00a8ff]/40'}`}
                  >
                    <div className={`h-14 rounded-lg bg-gradient-to-br ${th.grad} mb-2 border border-[#1c2233]`} />
                    <div className="font-bold text-xs">{th.label}</div>
                  </button>
                ))}
              </div>
              <div className="text-xs text-mute">
                💎 Premium Profile Themes / Exclusive Badges — {t('coming_soon_paid')}
              </div>
            </div>
          )}

          {tab === 'connected' && (
            <div className="space-y-4">
              <h2 className="font-extrabold text-lg">🎮 {t('connected_games')}</h2>
              <p className="text-mute text-sm">{t('connected_desc')}</p>
              {connected.length === 0 ? (
                <Empty icon="🎮" title={t('empty_title')} action={<a href={`/${user.username}?edit=1`} className="btn-neon text-sm">{t('add_game')}</a>} />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {connected.map((g) => (
                    <div key={g.id} className="flex items-center gap-3 p-3 bg-[#0d111c] rounded-xl border border-[#161b2a]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={g.cover_path} alt="" className="w-14 h-9 rounded object-cover" loading="lazy" />
                      <div className="min-w-0">
                        <div className="font-bold text-sm truncate" style={{ color: g.accent }}>{g.name}</div>
                        <div className="text-mute text-xs">{g.rank || '—'} · {g.hours}h · {g.platform}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
