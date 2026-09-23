'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/components/AppProvider';
import { Loading } from '@/components/UI';

export default function CreateClipPage() {
  const { t, user, loading, toast, refresh } = useApp();
  const router = useRouter();
  const [games, setGames] = useState<{ id: number; name: string }[]>([]);
  const [form, setForm] = useState({ title: '', game_id: 0, tags: '' });
  const [file, setFile] = useState<File | null>(null);
  const [thumb, setThumb] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!loading && !user) router.push('/login?next=/create');
  }, [user, loading, router]);

  useEffect(() => {
    fetch('/api/games').then((r) => r.json()).then((d) => {
      setGames(d.games || []);
      if (d.games?.[0]) setForm((f) => ({ ...f, game_id: d.games[0].id }));
    }).catch(() => {});
  }, []);

  if (loading || !user) return <div className="max-w-2xl mx-auto px-4 py-10"><Loading /></div>;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return toast('Video file required', 'error');
    if (!form.title.trim()) return toast(t('fill_all'), 'error');
    setBusy(true);
    setProgress(10);
    try {
      const fd = new FormData();
      fd.append('title', form.title);
      fd.append('game_id', String(form.game_id || ''));
      fd.append('tags', form.tags);
      fd.append('video', file);
      if (thumb) fd.append('thumb', thumb);

      // use XHR for upload progress
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/clips');
        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) setProgress(Math.round((ev.loaded / ev.total) * 100));
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else {
            try { reject(new Error(JSON.parse(xhr.responseText).error || 'Upload failed')); }
            catch { reject(new Error('Upload failed')); }
          }
        };
        xhr.onerror = () => reject(new Error('Network error'));
        xhr.send(fd);
      });

      toast('🎬 Clip uploaded! +40 XP');
      refresh();
      router.push('/explore');
    } catch (e: any) {
      toast(e.message, 'error');
      setProgress(0);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 fade-in">
      <h1 className="text-2xl font-black mb-1">✂ ClipZone — {t('clip_upload')}</h1>
      <p className="text-mute text-sm mb-6">{t('feat_clip_desc')} · +40 XP</p>

      <form onSubmit={submit} className="card p-6 space-y-5">
        <div
          className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition cursor-pointer ${file ? 'border-[#7cff6b]/50 bg-[#7cff6b]/5' : 'border-[#1c2233] hover:border-[#00a8ff]/50 bg-[#0a0d15]'}`}
          onClick={() => document.getElementById('clip-file')?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files?.[0];
            if (f && f.type.startsWith('video/')) { setFile(f); setPreview(null); }
          }}
        >
          <input
            id="clip-file"
            type="file"
            accept="video/mp4,video/webm,video/quicktime"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0] || null;
              setFile(f);
              setPreview(f ? URL.createObjectURL(f) : null);
            }}
          />
          {preview ? (
            <video src={preview} controls className="w-full max-h-64 rounded-xl mx-auto" />
          ) : (
            <>
              <div className="text-4xl mb-2">📼</div>
              <div className="font-bold text-sm">{t('clip_upload')} — MP4 / WebM / MOV</div>
              <div className="text-mute text-xs mt-1">Drag & drop or click · max 50MB</div>
            </>
          )}
        </div>

        <div>
          <label className="label">{t('clip_title')} *</label>
          <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required maxLength={120}
            placeholder="Insane 1v4 clutch in Ranked…" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">{t('game')}</label>
            <select className="input" value={form.game_id} onChange={(e) => setForm({ ...form, game_id: Number(e.target.value) })}>
              <option value={0}>—</option>
              {games.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">{t('clip_tags')}</label>
            <input className="input" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="clutch, ranked, ace" maxLength={200} />
          </div>
        </div>

        <div>
          <label className="label">Thumbnail (optional)</label>
          <input type="file" accept="image/*" className="input !py-1.5 text-xs" onChange={(e) => setThumb(e.target.files?.[0] || null)} />
        </div>

        {busy && (
          <div>
            <div className="xp-track"><div className="xp-fill" style={{ width: `${progress}%` }} /></div>
            <div className="text-xs text-mute mt-1 text-center">{progress}%</div>
          </div>
        )}

        <div className="flex justify-end">
          <button type="submit" disabled={busy || !file} className="btn-neon !py-3 px-8">
            {busy ? t('creating') : `✂ ${t('clip_upload')}`}
          </button>
        </div>
      </form>
    </div>
  );
}
