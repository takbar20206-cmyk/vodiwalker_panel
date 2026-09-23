'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/components/AppProvider';
import { Avatar } from '@/components/Nav';
import { Loading, ErrorBox, Empty } from '@/components/UI';
import { timeAgo } from '@/components/ReportButton';

const ICONS: Record<string, string> = {
  follow: '👥',
  friend_request: '🤝',
  friend_accept: '🤝',
  message: '💬',
  achievement: '🏆',
  challenge_completed: '⚡',
  clan_invite: '🛡',
  clan_join: '⚔',
  clan_kick: '✕',
  clip_like: '🎬',
  like: '♥',
  comment: '💬',
  squad_join: '🎯',
  squad_full: '✅',
  squad_closed: '🔒',
  report_update: '🚨',
  clip_saved: '⭐',
};

export default function NotificationsPage() {
  const { t, refresh, toast } = useApp();
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unread, setUnread] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch('/api/notifications', { cache: 'no-store' });
      if (!r.ok) throw new Error((await r.json()).error || 'Failed');
      const d = await r.json();
      setItems(d.notifications || []);
      setUnread(d.unread || 0);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const markAll = async () => {
    await fetch('/api/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    setUnread(0);
    setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at || 'now' })));
    refresh();
    toast('✓');
  };

  const onClick = async (n: any) => {
    if (!n.read_at) {
      await fetch('/api/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: n.id }) });
      setUnread((u) => Math.max(0, u - 1));
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read_at: 'now' } : x)));
      refresh();
    }
    // route by type
    const actor = n.actor_username as string | undefined;
    switch (n.type) {
      case 'follow':
      case 'friend_request':
      case 'friend_accept':
      case 'like':
      case 'comment':
        if (actor) router.push(`/${actor}`);
        break;
      case 'message':
        router.push(`/messages?thread=${n.entity_id}`);
        break;
      case 'achievement':
        if (actor) router.push(`/${actor}?tab=achievements`);
        break;
      case 'clan_invite':
      case 'clan_join':
        router.push(`/clans/${n.entity_id}`);
        break;
      case 'clip_like':
      case 'clip_saved':
        router.push('/explore');
        break;
      case 'squad_join':
      case 'squad_full':
      case 'squad_closed':
        router.push('/squads?mine=1');
        break;
      default:
        break;
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 fade-in">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-black">
          🔔 {t('nav_notifications')}
          {unread > 0 && <span className="badge badge-hot ms-2">{unread}</span>}
        </h1>
        {unread > 0 && (
          <button className="btn-ghost !py-1.5 text-xs" onClick={markAll}>✓ {t('all')}</button>
        )}
      </div>

      {loading && <Loading />}
      {error && <ErrorBox message={error} onRetry={load} />}
      {!loading && !error && items.length === 0 && <Empty icon="🔔" title={t('no_notifications')} />}

      <div className="space-y-2">
        {items.map((n) => (
          <button
            key={n.id}
            onClick={() => onClick(n)}
            className={`w-full card p-4 text-start flex items-start gap-3 transition hover:border-[#00a8ff]/40 ${!n.read_at ? 'border-[#00a8ff]/35 bg-[#00a8ff]/5' : ''}`}
          >
            <span className="text-xl mt-0.5">{ICONS[n.type] || '🔔'}</span>
            <div className="min-w-0 flex-1">
              <div className="text-sm">
                {n.actor_username && (
                  <Link href={`/${n.actor_username}`} className="font-extrabold hover:text-[#7cc9ff]" onClick={(e) => e.stopPropagation()}>
                    @{n.actor_username}
                  </Link>
                )}{' '}
                <NotificationText n={n} t={t} />
              </div>
              <div className="text-[11px] text-mute mt-1">{timeAgo(n.created_at)}</div>
            </div>
            {n.actor_avatar || n.actor_username ? (
              <Avatar avatar={n.actor_avatar} name={n.actor_name || n.actor_username || '?'} size={36} />
            ) : (
              <div className="w-9 h-9 rounded-full bg-[#151a29] flex items-center justify-center text-sm">📦</div>
            )}
            {!n.read_at && <span className="w-2 h-2 rounded-full bg-[#00a8ff] mt-2 shrink-0" />}
          </button>
        ))}
      </div>
    </div>
  );
}

function NotificationText({ n, t }: { n: any; t: (k: string) => string }) {
  const payload = n.payload || {};
  switch (n.type) {
    case 'follow': return <>started following you.</>;
    case 'friend_request': return <>sent you a friend request.</>;
    case 'friend_accept': return <>accepted your friend request. +10 XP</>;
    case 'message': return <><span className="text-mute">“{payload.excerpt || ''}”</span></>;
    case 'achievement': return <>unlocked an achievement! 🏆</>;
    case 'like': return <>liked your post.</>;
    case 'clip_like': return <>liked your clip.</>;
    case 'comment': return <>commented: <span className="text-mute">“{payload.excerpt || ''}”</span></>;
    case 'clan_invite': return <>invited you to clan <b className="text-[#c4aaff]">{payload.clanName}</b>.</>;
    case 'clan_join': return <>joined your clan <b className="text-[#c4aaff]">{payload.clanName}</b>.</>;
    case 'clan_kick': return <>removed you from <b>{payload.clanName}</b>.</>;
    case 'squad_join': return <>wants to join your squad.</>;
    case 'squad_full': return <>Your squad is now full! ✅</>;
    case 'squad_closed': return <>Your squad post was closed.</>;
    case 'report_update': return <>Your report was {payload.status}.</>;
    case 'clip_saved': return <>saved your clip. ⭐</>;
    default: return <>{n.type}</>;
  }
}
