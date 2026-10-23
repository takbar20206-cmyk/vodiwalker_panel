import { useRef } from 'react';
import type { ClientId, ConfigItem, Settings, Theme } from '../lib/types';
import { newId } from '../lib/storage';
import type { Translate } from '../i18n';
import { Icon } from '../components/Icons';

const CLIENTS: ClientId[] = ['v2rayng', 'hiddify', 'streisand', 'clash', 'shadowrocket'];

interface Props {
  t: Translate;
  settings: Settings;
  onChange: (settings: Settings) => void;
  items: ConfigItem[];
  onImport: (items: ConfigItem[]) => void;
  onClear: () => void;
  onExport: () => void;
  onInstall: () => void;
  installable: boolean;
  installed: boolean;
  onOpenLink: (url: string) => void;
}

const THEMES: Array<{ id: Theme; label: string; icon: 'moon' | 'sun' | 'globe' }> = [
  { id: 'dark', label: 'settings.dark', icon: 'moon' },
  { id: 'light', label: 'settings.light', icon: 'sun' },
  { id: 'auto', label: 'settings.auto', icon: 'globe' },
];

export function SettingsPage({
  t,
  settings,
  onChange,
  items,
  onImport,
  onClear,
  onExport,
  onInstall,
  installable,
  installed,
  onOpenLink,
}: Props) {
  const fileRef = useRef<HTMLInputElement | null>(null);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as unknown;
      const list = Array.isArray(parsed)
        ? parsed
        : Array.isArray((parsed as { items?: unknown }).items)
          ? ((parsed as { items: unknown[] }).items)
          : [];
      const restored: ConfigItem[] = list
        .map((entry) => {
          const raw = entry as Partial<ConfigItem>;
          if (typeof raw?.raw !== 'string' || typeof raw?.host !== 'string') return null;
          return {
            ...raw,
            id: typeof raw.id === 'string' ? raw.id : newId(),
            name: raw.name || raw.host,
            protocol: raw.protocol ?? 'other',
            port: Number(raw.port) || 443,
            params: raw.params ?? {},
            tags: Array.isArray(raw.tags) ? raw.tags : [],
            favorite: Boolean(raw.favorite),
            createdAt: Number(raw.createdAt) || Date.now(),
          } as ConfigItem;
        })
        .filter((entry): entry is ConfigItem => entry !== null);
      onImport(restored);
    } catch {
      onImport([]);
    }
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <div className="brand">
            <span className="brand-dot" />
            VODI CONFIG
          </div>
          <h1 className="page-title">{t('settings.title')}</h1>
          <p className="page-subtitle">{t('settings.privacy')}</p>
        </div>
        <div className="icon-btn" aria-hidden="true">
          <Icon name="settings" size={20} />
        </div>
      </div>

      <section className="section">
        <p className="section-label">{t('settings.language')}</p>
        <div className="seg">
          <button
            type="button"
            className={settings.lang === 'fa' ? 'active' : ''}
            onClick={() => onChange({ ...settings, lang: 'fa' })}
          >
            فارسی
          </button>
          <button
            type="button"
            className={settings.lang === 'en' ? 'active' : ''}
            onClick={() => onChange({ ...settings, lang: 'en' })}
          >
            English
          </button>
        </div>
      </section>

      <section className="section">
        <p className="section-label">{t('settings.appearance')}</p>
        <div className="seg">
          {THEMES.map((theme) => (
            <button
              key={theme.id}
              type="button"
              className={settings.theme === theme.id ? 'active' : ''}
              onClick={() => onChange({ ...settings, theme: theme.id })}
            >
              <Icon name={theme.icon} size={15} />
              {t(theme.label)}
            </button>
          ))}
        </div>
      </section>

      <section className="section">
        <p className="section-label">{t('settings.defaultClient')}</p>
        <div className="select-wrap">
          <select
            value={settings.defaultClient}
            onChange={(event) => onChange({ ...settings, defaultClient: event.target.value as ClientId })}
            aria-label={t('settings.defaultClient')}
          >
            {CLIENTS.map((id) => (
              <option key={id} value={id}>
                {t(`client.${id}`)}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="section">
        <p className="section-label">{t('settings.data')}</p>
        <button className="row-link" type="button" onClick={onExport} disabled={items.length === 0}>
          <Icon name="download" size={18} />
          <span className="grow">{t('settings.export')}</span>
          <span className="hint">{items.length}</span>
        </button>
        <button className="row-link" type="button" onClick={() => fileRef.current?.click()}>
          <Icon name="upload" size={18} />
          <span className="grow">{t('settings.import')}</span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          style={{ display: 'none' }}
          onChange={(event) => {
            void handleFile(event.target.files?.[0]);
            event.target.value = '';
          }}
        />
        <button className="row-link" type="button" onClick={onClear} style={{ color: 'var(--danger)' }}>
          <Icon name="trash" size={18} />
          <span className="grow" style={{ textAlign: 'start' }}>
            {t('settings.clear')}
          </span>
        </button>
      </section>

      {!installed && (
        <section className="section install-only">
          <button className="btn btn-ghost btn-block" type="button" onClick={onInstall}>
            <Icon name="download" size={17} />
            {t('settings.install')}
            {!installable && <span className="hint small">· {t('toast.installed')}</span>}
          </button>
        </section>
      )}

      <section className="section">
        <p className="section-label">{t('settings.about')}</p>
        <div className="about-card">
          <strong>{t('app.name')}</strong> · {t('app.version')} 1.0.0
          <div style={{ marginTop: 8 }}>{t('settings.aboutText')}</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button
              className="btn btn-ghost btn-sm"
              type="button"
              onClick={() => onOpenLink('https://t.me/vodiwalkervpn03')}
            >
              <Icon name="telegram" size={15} />
              {t('settings.channel')}
            </button>
            <button
              className="btn btn-ghost btn-sm"
              type="button"
              onClick={() => onOpenLink('https://github.com/Vodiwalker')}
            >
              <Icon name="github" size={15} />
              {t('settings.github')}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
