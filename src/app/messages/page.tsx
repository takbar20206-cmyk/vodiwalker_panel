'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useApp } from '@/components/AppProvider';
import { Avatar } from '@/components/Nav';
import { Loading, ErrorBox, Empty } from '@/components/UI';
import { timeAgo } from '@/components/ReportButton';

type Thread = {
  id: number;
  is_group: number;
  title: string;
  last_content: string | null;
  last_at: string | null;
  unread: number;
  members: { id: number; username: string; display_name: string; avatar_path: string | null }[];
};

type Message = {
  id: number;
  sender_id: number;
  kind: string;
  content: string;
  media_path: string;
  created_at: string;
  read_at: string | null;
  username: string;
  display_name: string;
  avatar_path: string | null;
};

function MessagesInner() {
  const { t, user, toast, refresh } = useApp();
  const sp = useSearchParams();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState<number | null>(Number(sp.get('thread')) || null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [threadTitle, setThreadTitle] = useState('');
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [mobileView, setMobileView] = useState(!!sp.get('thread'));
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadThreads = useCallback(async () => {
    setLoadingThreads(true);
    try {
      const r = await fetch('/api/messages', { cache: 'no-store' });
      if (!r.ok) throw new Error((await r.json()).error || 'Failed');
      const d = await r.json();
      setThreads(d.threads || []);
    } catch (e: any) { setError(e.message); } finally { setLoadingThreads(false); }
  }, []);

  const loadMsgs = useCallback(async (id: number) => {
    setLoadingMsgs(true);
    try {
      const r = await fetch(`/api/messages/${id}`, { cache: 'no-store' });
      if (!r.ok) throw new Error((await r.json()).error || 'Failed');
      const d = await r.json();
      setMessages(d.messages || []);
      setMembers(d.members || []);
      const tm = d.thread;
      setThreadTitle(tm?.is_group ? tm.title : (d.members || []).find((m: any) => m.id !== user?.id)?.display_name || (d.members || []).find((m: any) => m.id !== user?.id)?.username || 'Chat');
      refresh();
    } catch (e: any) { setError(e.message); } finally { setLoadingMsgs(false); }
  }, [user?.id, refresh]);

  useEffect(() => { loadThreads(); }, [loadThreads]);
  useEffect(() => { if (activeId) loadMsgs(activeId); }, [activeId, loadMsgs]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);

  // polling for new messages
  useEffect(() => {
    if (!activeId) return;
    const iv = setInterval(() => loadMsgs(activeId), 6000);
    return () => clearInterval(iv);
  }, [activeId, loadMsgs]);

  const send = async () => {
    if (!activeId || (!text.trim() && !(fileRef.current?.files?.[0]))) return;
    setSending(true);
    try {
      const fd = new FormData();
      fd.append('content', text);
      const f = fileRef.current?.files?.[0];
      if (f) {
        fd.append('media', f);
        fd.append('kind', f.type.startsWith('video/') ? 'clip' : 'image');
      }
      const r = await fetch(`/api/messages/${activeId}`, { method: 'POST', body: fd });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setMessages((prev) => [...prev, d.message]);
      setText('');
      if (fileRef.current) fileRef.current.value = '';
      loadThreads();
    } catch (e: any) { toast(e.message, 'error'); } finally { setSending(false); }
  };

  if (!user) return <div className="max-w-6xl mx-auto px-4 py-10"><Empty icon="✉" title={t('login_first')} action={<a href="/login" className="btn-neon text-sm">{t('nav_login')}</a>} /></div>;

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-6 fade-in">
      <h1 className="text-2xl font-black mb-4">💬 {t('nav_messages')}</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4" style={{ height: 'calc(100vh - 220px)', minHeight: 480 }}>
        {/* Threads list */}
        <div className={`card overflow-hidden flex flex-col ${mobileView ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-3 border-b border-[#1c2233] font-extrabold text-sm">{t('nav_messages')}</div>
          <div className="flex-1 overflow-y-auto">
            {loadingThreads && <div className="p-4"><Loading /></div>}
            {threads.map((th) => {
              const other = th.members[0];
              return (
                <button
                  key={th.id}
                  onClick={() => { setActiveId(th.id); setMobileView(true); }}
                  className={`w-full flex items-center gap-3 p-3 text-start transition border-b border-[#12161f] ${activeId === th.id ? 'bg-[#00a8ff]/10' : 'hover:bg-[#00a8ff]/5'}`}
                >
                  {th.is_group ? (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#9b6bff] to-[#4d5cff] flex items-center justify-center text-sm font-black shrink-0">🛡</div>
                  ) : (
                    <Avatar avatar={other?.avatar_path} name={other?.display_name || other?.username || '?'} size={40} />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-sm truncate">{th.title || other?.display_name || other?.username || `#${th.id}`}</div>
                    <div className="text-mute text-xs truncate">{th.last_content || '…'}</div>
                  </div>
                  <div className="text-end shrink-0">
                    <div className="text-[10px] text-mute">{th.last_at ? timeAgo(th.last_at) : ''}</div>
                    {th.unread > 0 && <span className="inline-block bg-[#ff2e63] text-[9px] font-black rounded-full min-w-[16px] h-4 px-1 leading-4 text-center mt-1">{th.unread}</span>}
                  </div>
                </button>
              );
            })}
            {!loadingThreads && !threads.length && <div className="p-6"><Empty icon="✉" title={t('no_messages')} /></div>}
          </div>
        </div>

        {/* Conversation */}
        <div className={`card md:col-span-2 overflow-hidden flex flex-col ${mobileView ? 'flex' : 'hidden md:flex'}`}>
          {!activeId ? (
            <div className="flex-1 flex items-center justify-center"><Empty icon="💬" title={t('pick_conversation')} /></div>
          ) : (
            <>
              <div className="p-3 border-b border-[#1c2233] flex items-center gap-3">
                <button className="md:hidden text-mute text-lg" onClick={() => setMobileView(false)}>→</button>
                <div className="font-extrabold text-sm truncate">{threadTitle}</div>
                <span className="badge badge-lime ms-auto !text-[10px]"><span className="dot-online !w-1.5 !h-1.5" /> {t('online')}</span>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loadingMsgs && <Loading />}
                {messages.map((m) => {
                  const mine = m.sender_id === user.id;
                  return (
                    <div key={m.id} className={`flex gap-2 ${mine ? 'flex-row-reverse' : ''}`}>
                      {!mine && <Avatar avatar={m.avatar_path} name={m.display_name || m.username} size={30} />}
                      <div className={`chat-bubble ${mine ? 'chat-mine' : 'chat-theirs'}`}>
                        {!mine && <div className="text-[10px] font-bold text-[#7cc9ff] mb-0.5">{m.display_name || m.username}</div>}
                        {m.kind === 'image' && m.media_path && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={m.media_path} alt="" className="rounded-lg max-w-[280px] max-h-60 mb-1" loading="lazy" />
                        )}
                        {m.kind === 'clip' && m.media_path && (
                          <video src={m.media_path} controls className="rounded-lg max-w-[300px] mb-1" />
                        )}
                        {m.content && <div className="whitespace-pre-wrap break-words">{m.content}</div>}
                        <div className={`text-[9px] mt-1 ${mine ? 'text-white/60' : 'text-mute'}`}>
                          {timeAgo(m.created_at)} {mine && (m.read_at ? `✓✓ ${t('read')}` : `✓ ${t('unread')}`)}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>
              <div className="p-3 border-t border-[#1c2233] flex gap-2">
                <input type="file" ref={fileRef} accept="image/*,video/mp4,video/webm" className="hidden" id="msg-media" />
                <label htmlFor="msg-media" className="btn-ghost !py-2 !px-3 cursor-pointer shrink-0" title={t('upload_image')}>📎</label>
                <input
                  className="input !py-2 flex-1"
                  placeholder={t('type_message')}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
                  maxLength={1000}
                />
                <button className="btn-neon !py-2 !px-4 text-sm shrink-0" disabled={sending || (!text.trim() && !fileRef.current?.files?.[0])} onClick={send}>
                  {sending ? '…' : t('send')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense>
      <MessagesInner />
    </Suspense>
  );
}
