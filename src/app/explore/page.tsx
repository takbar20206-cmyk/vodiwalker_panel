'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/components/AppProvider';
import { Avatar } from '@/components/Nav';
import { Tabs, Empty, Loading, ErrorBox } from '@/components/UI';
import { Comments } from '@/components/Feed';
import { ReportButton, timeAgo } from '@/components/ReportButton';

type Clip = {
  id: number;
  title: string;
  tags: string;
  video_path: string;
  thumb_path: string;
  views: number;
  likes_count: number;
  comments_count: number;
  created_at: string;
  username: string;
  display_name: string;
  avatar_path: string | null;
  level: number;
  game_name?: string;
  game_accent?: string;
  liked: boolean;
  saved: boolean;
};

export default function ExplorePage() {
  const { t, user, toast } = useApp();
  const [tab, setTab] = useState('trending');
  const [clips, setClips] = useState<Clip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [playing, setPlaying] = useState<number | null>(null);
  const [openComments, setOpenComments] = useState<number | null>(null);

  const load = useCallback(
    async (p = 1) => {
      setLoading(true);
      setError(null);
      try {
        const r = await fetch(`/api/clips?tab=${tab}&page=${p}`, { cache: 'no-store' });
        if (!r.ok) throw new Error((await r.json()).error || 'Failed');
        const d = await r.json();
        if (d.requiresAuth) {
          setClips([]);
          setLoading(false);
          return;
        }
        setClips((prev) => (p === 1 ? d.clips : [...prev, ...d.clips]));
        setPages(d.pages);
        setPage(d.page);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    },
    [tab]
  );

  useEffect(() => { load(1); }, [load]);

  const like = async (c: Clip) => {
    if (!user) return toast(t('login_first'), 'error');
    setClips((prev) => prev.map((x) => (x.id === c.id ? { ...x, liked: !x.liked, likes_count: x.likes_count + (x.liked ? -1 : 1) } : x)));
    try {
      const r = await fetch('/api/likes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_type: 'clip', target_id: c.id }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setClips((prev) => prev.map((x) => (x.id === c.id ? { ...x, liked: d.liked, likes_count: d.likes } : x)));
    } catch (e: any) { toast(e.message, 'error'); load(1); }
  };

  const save = async (c: Clip) => {
    if (!user) return toast(t('login_first'), 'error');
    setClips((prev) => prev.map((x) => (x.id === c.id ? { ...x, saved: !x.saved } : x)));
    try {
      const r = await fetch('/api/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clip_save', clip_id: c.id }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setClips((prev) => prev.map((x) => (x.id === c.id ? { ...x, saved: d.saved } : x)));
      toast(d.saved ? t('save_clip') : t('remove'));
    } catch (e: any) { toast(e.message, 'error'); }
  };

  const view = async (c: Clip) => {
    if (playing === c.id) { setPlaying(null); return; }
    setPlaying(c.id);
    setClips((prev) => prev.map((x) => (x.id === c.id ? { ...x, views: x.views + 1 } : x)));
    fetch('/api/actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'clip_view', clip_id: c.id }),
    }).catch(() => {});
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-black">🎬 ClipZone</h1>
          <p className="text-mute text-sm">{t('feat_clip_desc')}</p>
        </div>
        <Link href={user ? '/create' : '/login'} className="btn-neon !py-2 text-sm">✂ {t('clip_upload')}</Link>
      </div>

      <Tabs
        tabs={[
          { id: 'trending', label: `🔥 ${t('clip_trending')}` },
          { id: 'new', label: `✨ ${t('clip_new')}` },
          { id: 'liked', label: `♥ ${t('clip_most_liked')}` },
          { id: 'following', label: `👥 ${t('clip_following')}` },
        ]}
        active={tab}
        onChange={setTab}
      />

      <div className="mt-5">
        {loading && page === 1 && <Loading />}
        {error && <ErrorBox message={error} onRetry={() => load(1)} />}
        {!loading && !error && clips.length === 0 && (
          <Empty
            icon="🎬"
            title={t('no_clips')}
            action={user ? <Link href="/create" className="btn-neon text-sm">{t('clip_upload')}</Link> : <Link href="/register" className="btn-neon text-sm">{t('register')}</Link>}
          />
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {clips.map((c) => (
            <div key={c.id} className="card card-hover overflow-hidden fade-in">
              <div className="relative aspect-video bg-black group">
                {playing === c.id ? (
                  <video src={c.video_path} controls autoPlay playsInline className="w-full h-full object-contain" />
                ) : (
                  <>
                    {c.thumb_path ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.thumb_path} alt={c.title} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[#10141f] to-[#151a29] flex items-center justify-center text-3xl opacity-60">🎮</div>
                    )}
                    <button onClick={() => view(c)} className="absolute inset-0 flex items-center justify-center group-hover:bg-black/30 transition" aria-label="Play">
                      <span className="w-14 h-14 rounded-full bg-[#00a8ff]/85 flex items-center justify-center text-xl text-white shadow-[0_0_30px_rgba(0,168,255,0.6)] group-hover:scale-110 transition">
                        ▶
                      </span>
                    </button>
                  </>
                )}
                {c.game_name && (
                  <span className="absolute top-2 start-2 badge !text-[10px]" style={{ borderColor: `${c.game_accent}66`, color: c.game_accent }}>
                    {c.game_name}
                  </span>
                )}
              </div>
              <div className="p-4">
                <div className="font-extrabold text-sm truncate">{c.title}</div>
                <div className="flex items-center gap-2 mt-2">
                  <Link href={`/${c.username}`} className="flex items-center gap-2 min-w-0 hover:text-[#7cc9ff] transition">
                    <Avatar avatar={c.avatar_path} name={c.display_name || c.username} size={26} />
                    <span className="text-xs font-bold truncate">{c.display_name || c.username}</span>
                  </Link>
                  <span className="text-[11px] text-mute">· {timeAgo(c.created_at)}</span>
                </div>
                {c.tags && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {c.tags.split(/[,\s]+/).filter(Boolean).slice(0, 4).map((tg) => (
                      <span key={tg} className="text-[10px] text-[#7cc9ff] bg-[#00a8ff]/10 rounded px-1.5 py-0.5">#{tg.replace(/^#/, '')}</span>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-3 mt-3 text-sm">
                  <button onClick={() => like(c)} className={`font-semibold flex items-center gap-1 ${c.liked ? 'text-[#ff2e63]' : 'text-mute hover:text-[#ff8fa8]'}`}>
                    {c.liked ? '♥' : '♡'} {c.likes_count}
                  </button>
                  <button onClick={() => setOpenComments(openComments === c.id ? null : c.id)} className="text-mute hover:text-[#7cc9ff] font-semibold">💬 {c.comments_count}</button>
                  <span className="text-mute text-xs">▶ {c.views}</span>
                  <div className="flex-1" />
                  <button onClick={() => save(c)} className={`text-sm ${c.saved ? 'text-[#ffc857]' : 'text-mute hover:text-[#ffc857]'}`} title={t('save_clip')}>
                    {c.saved ? '★' : '☆'}
                  </button>
                  <ReportButton targetType="clip" targetId={c.id} />
                </div>
                {openComments === c.id && <Comments targetId={c.id} targetType="clip" count={c.comments_count} />}
              </div>
            </div>
          ))}
        </div>

        {page < pages && (
          <div className="text-center mt-6">
            <button onClick={() => load(page + 1)} className="btn-ghost text-sm">{t('next')}</button>
          </div>
        )}
      </div>
    </div>
  );
}
