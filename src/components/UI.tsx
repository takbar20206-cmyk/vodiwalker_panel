'use client';
import { ReactNode } from 'react';
import { useApp } from './AppProvider';

export function Empty({ icon = '∅', title, desc, action }: { icon?: string; title?: string; desc?: string; action?: ReactNode }) {
  const { t } = useApp();
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center fade-in">
      <div className="text-5xl mb-3 opacity-40">{icon}</div>
      <div className="font-bold text-[#c5cde0]">{title || t('empty_title')}</div>
      <div className="text-mute text-sm mt-1">{desc || t('empty_desc')}</div>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Loading({ label }: { label?: string }) {
  const { t } = useApp();
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div className="spinner !w-8 !h-8" />
      <div className="text-mute text-sm">{label || t('loading')}</div>
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  const { t } = useApp();
  return (
    <div className="glass rounded-2xl p-6 text-center border-[#ff2e63]/40 fade-in">
      <div className="text-2xl mb-2">⚠️</div>
      <div className="text-[#ffb3c4] font-bold">{message || t('error_generic')}</div>
      {onRetry && (
        <button onClick={onRetry} className="btn-ghost mt-4 text-sm">{t('retry')}</button>
      )}
    </div>
  );
}

export function Skeleton({ h = 120, n = 3 }: { h?: number; n?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="skeleton" style={{ height: h }} />
      ))}
    </div>
  );
}

export function Tabs({ tabs, active, onChange }: { tabs: { id: string; label: string }[]; active: string; onChange: (id: string) => void }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
      {tabs.map((tb) => (
        <button key={tb.id} className={`tab ${active === tb.id ? 'active' : ''}`} onClick={() => onChange(tb.id)}>
          {tb.label}
        </button>
      ))}
    </div>
  );
}

export function XpBar({ xp, level }: { xp: number; level: number }) {
  // mirror server curve: total(n) = 25*(n-1)*(n+2)
  const cur = 25 * (level - 1) * (level + 2);
  const next = 25 * level * (level + 3);
  const span = Math.max(1, next - cur);
  const pct = Math.min(100, Math.max(0, ((xp - cur) / span) * 100));
  const toNext = Math.max(0, next - xp);
  return (
    <div className="w-full">
      <div className="flex justify-between text-[11px] font-bold mb-1">
        <span className="text-[#7cc9ff]">LV {level}</span>
        <span className="text-mute">{xp} XP · {toNext} to LV {level + 1}</span>
      </div>
      <div className="xp-track"><div className="xp-fill" style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[95] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        className={`glass rounded-2xl w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} max-h-[88vh] overflow-y-auto fade-in`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1c2233] sticky top-0 bg-[#0b0e17]/95 backdrop-blur z-10">
          <h3 className="font-extrabold text-lg">{title}</h3>
          <button onClick={onClose} className="text-mute hover:text-white text-xl leading-none px-2">✕</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
