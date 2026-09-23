'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useApp } from './AppProvider';
import { Avatar } from './Nav';
import { Empty, Loading, ErrorBox, Tabs } from './UI';
import { ReportButton, timeAgo } from './ReportButton';

type Post = {
  id: number;
  user_id: number;
  username: string;
  display_name: string;
  avatar_path: string | null;
  level: number;
  type: string;
  content: string;
  meta: Record<string, unknown>;
  likes_count: number;
  comments_count: number;
  created_at: string;
  liked: boolean;
};

export function Feed({ scope = 'all', userId }: { scope?: 'all' | 'following' | 'mine' | 'user'; userId?: number }) {
  const { t, user, toast } = useApp();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [tab, setTab] = useState(scope === 'all' ? 'all' : scope);
  const [composer, setComposer] = useState('');
  const [posting, setPosting] = useState(false);

  const load = useCallback(
    async (p = 1) => {
      setLoading(true);
      setError(null);
      try {
        const sc = scope === 'user' ? 'user' : tab === 'all' ? scope : tab;
        const uid = userId ? `&userId=${userId}` : '';
        const r = await fetch(`/api/posts?scope=${sc}&page=${p}${uid}`, { cache: 'no-store' });
        if (!r.ok) throw new Error((await r.json()).error || 'Failed');
        const d = await r.json();
        setPosts((prev) => (p === 1 ? d.posts : [...prev, ...d.posts]));
        setPages(d.pages);
        setPage(d.page);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    },
    [tab, scope, userId]
  );

  useEffect(() => {
    load(1);
  }, [load]);

  const submitPost = async () => {
    if (!user) return toast(t('login_first'), 'error');
    if (!composer.trim()) return;
    setPosting(true);
    try {
      const r = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: composer }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setComposer('');
      setPosts((prev) => [d.post, ...prev]);
      toast('+15 XP');
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setPosting(false);
    }
  };

  const toggleLike = async (p: Post) => {
    if (!user) return toast(t('login_first'), 'error');
    // optimistic
    setPosts((prev) =>
      prev.map((x) => (x.id === p.id ? { ...x, liked: !x.liked, likes_count: x.likes_count + (x.liked ? -1 : 1) } : x))
    );
    try {
      const r = await fetch('/api/likes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_type: 'post', target_id: p.id }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setPosts((prev) => prev.map((x) => (x.id === p.id ? { ...x, liked: d.liked, likes_count: d.likes } : x)));
    } catch (e: any) {
      setPosts((prev) =>
        prev.map((x) => (x.id === p.id ? { ...x, liked: !x.liked, likes_count: x.likes_count + (x.liked ? -1 : 1) } : x))
      );
      toast(e.message, 'error');
    }
  };

  const delPost = async (p: Post) => {
    if (!confirm('Delete this post?')) return;
    try {
      const r = await fetch(`/api/posts?id=${p.id}`, { method: 'DELETE' });
      if (!r.ok) throw new Error((await r.json()).error);
      setPosts((prev) => prev.filter((x) => x.id !== p.id));
      toast(t('delete'));
    } catch (e: any) {
      toast(e.message, 'error');
    }
  };

  const [openComments, setOpenComments] = useState<number | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-xl font-black">
          {t('feed')} <span className="text-mute font-normal text-sm">/ {tab}</span>
        </h2>
        <Tabs
          tabs={
            scope === 'user'
              ? []
              : [
                  { id: 'all', label: t('filter_all') },
                  { id: 'following', label: t('following_tab') },
                ]
          }
          active={tab === scope ? 'all' : tab}
          onChange={setTab}
        />
      </div>

      {user && (
        <div className="card p-4">
          <div className="flex gap-3">
            <Avatar avatar={user.avatar_path} name={user.display_name || user.username} size={40} />
            <div className="flex-1">
              <textarea
                className="input resize-none"
                rows={2}
                placeholder={`What are you playing, ${user.display_name || user.username}?`}
                value={composer}
                onChange={(e) => setComposer(e.target.value)}
                maxLength={1000}
              />
              <div className="flex justify-between items-center mt-2">
                <span className="text-[11px] text-mute">+15 XP · {composer.length}/1000</span>
                <button onClick={submitPost} disabled={posting || !composer.trim()} className="btn-neon !py-1.5 !px-4 text-xs">
                  {posting ? t('creating') : 'POST'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading && page === 1 && <Loading />}
      {error && <ErrorBox message={error} onRetry={() => load(1)} />}
      {!loading && !error && posts.length === 0 && (
        <Empty
          icon="📰"
          title={t('no_posts')}
          action={
            user ? undefined : (
              <Link href="/register" className="btn-neon text-sm">{t('register')}</Link>
            )
          }
        />
      )}

      {posts.map((p) => (
        <PostCard
          key={p.id}
          post={p}
          onLike={() => toggleLike(p)}
          onDelete={user && (user.id === p.user_id || user.role === 'admin') ? () => delPost(p) : undefined}
          commentsOpen={openComments === p.id}
          onToggleComments={() => setOpenComments(openComments === p.id ? null : p.id)}
        />
      ))}

      {page < pages && (
        <button onClick={() => load(page + 1)} className="btn-ghost w-full text-sm">
          {t('next')} ({page}/{pages})
        </button>
      )}
    </div>
  );
}

function PostCard({
  post,
  onLike,
  onDelete,
  commentsOpen,
  onToggleComments,
}: {
  post: Post;
  onLike: () => void;
  onDelete?: () => void;
  commentsOpen: boolean;
  onToggleComments: () => void;
}) {
  const { t, user } = useApp();
  const typeBadge: Record<string, { label: string; cls: string }> = {
    text: { label: 'POST', cls: 'badge' },
    achievement_unlocked: { label: '🏆 ACHIEVEMENT', cls: 'badge badge-gold' },
    game_added: { label: '🎮 NEW GAME', cls: 'badge badge-lime' },
    clip: { label: '🎬 CLIP', cls: 'badge badge-hot' },
    clan_joined: { label: '🛡 CLAN', cls: 'badge' },
    challenge_completed: { label: '⚡ CHALLENGE', cls: 'badge badge-lime' },
  };
  const badge = typeBadge[post.type] || typeBadge.text;

  return (
    <article className="card card-hover p-4 fade-in">
      <div className="flex items-start gap-3">
        <Link href={`/${post.username}`}>
          <Avatar avatar={post.avatar_path} name={post.display_name || post.username} level={post.level} size={44} />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link href={`/${post.username}`} className="font-extrabold text-sm hover:text-[#7cc9ff] transition">
              {post.display_name || post.username}
            </Link>
            <span className="text-mute text-xs">@{post.username}</span>
            <span className="text-mute text-xs">·</span>
            <span className="text-mute text-xs">{timeAgo(post.created_at)}</span>
            <span className={badge.cls}>{badge.label}</span>
          </div>

          <div className="mt-2 text-[15px] leading-relaxed whitespace-pre-wrap break-words">
            {post.type === 'achievement_unlocked' && post.meta?.achievementId ? (
              <AchievementInline id={Number(post.meta.achievementId)} />
            ) : post.type === 'clan_joined' && post.meta?.clanName ? (
              <span>joined clan <b className="text-[#9b6bff]">{String(post.meta.clanName)}</b> 🛡️</span>
            ) : post.type === 'challenge_completed' && post.meta?.title ? (
              <span>
                completed challenge <b className="text-lime-300">“{String(post.meta.title || post.meta.title_fa)}”</b> ⚡
              </span>
            ) : post.type === 'clip' && post.meta?.clipId ? (
              <Link href={`/explore?clip=${post.meta.clipId}`} className="text-[#7cc9ff] hover:underline">
                ▶ shared a clip: {post.content || 'watch now'}
              </Link>
            ) : (
              post.content
            )}
          </div>

          <div className="flex items-center gap-4 mt-3 text-sm">
            <button
              onClick={onLike}
              className={`flex items-center gap-1.5 font-semibold transition ${
                post.liked ? 'text-[#ff2e63]' : 'text-mute hover:text-[#ff8fa8]'
              }`}
            >
              {post.liked ? '♥' : '♡'} {post.likes_count}
            </button>
            <button onClick={onToggleComments} className="flex items-center gap-1.5 text-mute hover:text-[#7cc9ff] font-semibold">
              💬 {post.comments_count}
            </button>
            <button
              onClick={() => {
                const url = `${location.origin}/${post.username}#post-${post.id}`;
                navigator.clipboard?.writeText(url);
              }}
              className="text-mute hover:text-white font-semibold"
            >
              ↗ {t('share')}
            </button>
            <div className="flex-1" />
            <ReportButton targetType="post" targetId={post.id} />
            {onDelete && (
              <button onClick={onDelete} className="text-mute hover:text-[#ff2e63] text-xs font-bold">
                ✕
              </button>
            )}
          </div>

          {commentsOpen && <Comments targetId={post.id} targetType="post" count={post.comments_count} />}
        </div>
      </div>
    </article>
  );
}

function AchievementInline({ id }: { id: number }) {
  const [ach, setAch] = useState<{ name: string; name_fa: string; xp_reward: number } | null>(null);
  useEffect(() => {
    fetch('/api/profile') // lightweight fallback; achievement details resolved via profile page
      .then(() => setAch(null))
      .catch(() => {});
  }, [id]);
  return <span className="font-bold text-[#ffd98a]">🏆 Achievement unlocked! {ach?.name || ' +XP'}</span>;
}

export function Comments({ targetId, targetType, count }: { targetId: number; targetType: 'post' | 'clip'; count: number }) {
  const { t, user, toast } = useApp();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetch(`/api/comments?target_type=${targetType}&target_id=${targetId}`)
      .then((r) => r.json())
      .then((d) => setItems(d.comments || []))
      .finally(() => setLoading(false));
  }, [targetId, targetType]);

  const send = async () => {
    if (!user) return toast(t('login_first'), 'error');
    if (!text.trim()) return;
    setSending(true);
    try {
      const r = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_type: targetType, target_id: targetId, content: text }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setItems((prev) => [...prev, d.comment]);
      setText('');
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mt-3 border-t border-[#1c2233] pt-3 space-y-3">
      {loading ? (
        <div className="spinner" />
      ) : items.length === 0 ? (
        <div className="text-xs text-mute">{t('empty_title')}</div>
      ) : (
        items.map((c) => (
          <div key={c.id} className="flex gap-2.5">
            <Link href={`/${c.username}`}>
              <Avatar avatar={c.avatar_path} name={c.display_name || c.username} size={30} />
            </Link>
            <div className="flex-1 bg-[#0d111c] rounded-xl px-3 py-2 border border-[#161b2a]">
              <div className="flex items-center gap-2">
                <Link href={`/${c.username}`} className="font-bold text-xs hover:text-[#7cc9ff]">{c.display_name || c.username}</Link>
                <span className="text-mute text-[10px]">{timeAgo(c.created_at)}</span>
                {user && (user.id === c.user_id || user.role === 'admin') && (
                  <button
                    className="ms-auto text-[10px] text-mute hover:text-[#ff2e63]"
                    onClick={async () => {
                      await fetch(`/api/comments?id=${c.id}`, { method: 'DELETE' });
                      setItems((prev) => prev.filter((x) => x.id !== c.id));
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
              <div className="text-sm mt-0.5 break-words">{c.content}</div>
            </div>
          </div>
        ))
      )}
      <div className="flex gap-2">
        <input
          className="input !py-2 text-sm"
          placeholder={t('comment_placeholder')}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          maxLength={800}
        />
        <button onClick={send} disabled={sending || !text.trim()} className="btn-neon !py-2 !px-4 text-xs shrink-0">
          {t('send')}
        </button>
      </div>
    </div>
  );
}
