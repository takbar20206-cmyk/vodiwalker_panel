import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ConfigItem, ParsedConfig, Settings } from './lib/types';
import {
  downloadJson,
  loadItems,
  loadSettings,
  newId,
  saveItems,
  saveSettings,
} from './lib/storage';
import { makeT } from './i18n';
import { copyText, shareText } from './lib/clipboard';
import { canInstall, initInstallPrompt, isStandalone, openExternal, promptInstall } from './lib/native';
import { HomePage } from './pages/HomePage';
import { AddPage } from './pages/AddPage';
import { SettingsPage } from './pages/SettingsPage';
import { DetailSheet } from './components/DetailSheet';
import { QrModal } from './components/QrModal';
import { ConfirmDialog } from './components/Overlay';
import { Icon, type IconName } from './components/Icons';

type Tab = 'home' | 'add' | 'settings';

function initialTab(): Tab {
  const param = new URLSearchParams(window.location.search).get('tab');
  return param === 'add' || param === 'settings' ? param : 'home';
}

const TABS: Array<{ id: Tab; icon: IconName; label: string }> = [
  { id: 'home', icon: 'home', label: 'nav.home' },
  { id: 'add', icon: 'plus', label: 'nav.add' },
  { id: 'settings', icon: 'settings', label: 'nav.settings' },
];

export default function App() {
  const [items, setItems] = useState<ConfigItem[]>(() => loadItems());
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const [tab, setTab] = useState<Tab>(initialTab);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [qrId, setQrId] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);
  const [installable, setInstallable] = useState(false);
  const [installed, setInstalled] = useState(() => isStandalone());

  const t = useMemo(() => makeT(settings.lang), [settings.lang]);

  const notify = useCallback((message: string) => {
    setToast({ id: Date.now(), message });
  }, []);

  useEffect(() => {
    saveItems(items);
  }, [items]);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    const root = document.documentElement;
    root.lang = settings.lang;
    root.dir = settings.lang === 'fa' ? 'rtl' : 'ltr';

    const media = window.matchMedia('(prefers-color-scheme: light)');
    const apply = () => {
      const theme = settings.theme === 'auto' ? (media.matches ? 'light' : 'dark') : settings.theme;
      root.dataset.theme = theme;
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', theme === 'light' ? '#f2f5fc' : '#070b16');
    };
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [settings.lang, settings.theme]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    initInstallPrompt();
    const onInstallable = () => setInstallable(canInstall());
    const onInstalled = () => {
      setInstalled(true);
      setInstallable(false);
    };
    window.addEventListener('vodi:installable', onInstallable);
    window.addEventListener('vodi:installed', onInstalled);
    return () => {
      window.removeEventListener('vodi:installable', onInstallable);
      window.removeEventListener('vodi:installed', onInstalled);
    };
  }, []);

  const existing = useMemo(() => new Set(items.map((item) => item.raw)), [items]);
  const detail = items.find((item) => item.id === detailId) ?? null;
  const qrItem = items.find((item) => item.id === qrId) ?? null;

  const addConfigs = useCallback(
    (configs: ParsedConfig[], fromScan: boolean) => {
      const fresh = configs.filter((config) => !existing.has(config.raw));
      if (fresh.length === 0) {
        notify(t('add.duplicate'));
        return;
      }
      const now = Date.now();
      const created: ConfigItem[] = fresh.map((config, index) => ({
        ...config,
        id: newId(),
        tags: [],
        favorite: false,
        createdAt: now + index,
      }));
      setItems((prev) => [...created, ...prev]);
      notify(t('add.added', { n: created.length }));
      if (fromScan) setTab('home');
    },
    [existing, notify, t],
  );

  const toggleStar = useCallback((item: ConfigItem) => {
    setItems((prev) =>
      prev.map((entry) => (entry.id === item.id ? { ...entry, favorite: !entry.favorite } : entry)),
    );
  }, []);

  const updateItem = useCallback((item: ConfigItem) => {
    setItems((prev) => prev.map((entry) => (entry.id === item.id ? item : entry)));
  }, []);

  const deleteItem = useCallback(
    (id: string) => {
      setItems((prev) => prev.filter((entry) => entry.id !== id));
      setDetailId(null);
      setQrId(null);
      notify(t('toast.deleted'));
    },
    [notify, t],
  );

  const copyLink = useCallback(
    async (item: ConfigItem) => {
      const ok = await copyText(item.raw);
      notify(ok ? t('toast.copied') : t('toast.copyFailed'));
    },
    [notify, t],
  );

  const shareLink = useCallback(
    async (item: ConfigItem) => {
      const result = await shareText(item.raw, item.name);
      if (result === 'copied') notify(t('toast.copied'));
      if (result === 'failed') notify(t('toast.copyFailed'));
    },
    [notify, t],
  );

  const exportBackup = useCallback(() => {
    const stamp = new Date().toISOString().slice(0, 10);
    downloadJson(`vodi-config-backup-${stamp}.json`, { app: 'vodi-config', version: 1, items });
    notify(t('toast.exported'));
  }, [items, notify, t]);

  const importBackup = useCallback(
    (restored: ConfigItem[]) => {
      if (restored.length === 0) {
        notify(t('toast.importError'));
        return;
      }
      const known = new Set(items.map((item) => item.raw));
      const merged = [...items];
      let added = 0;
      for (const item of restored) {
        if (known.has(item.raw)) continue;
        known.add(item.raw);
        merged.push({ ...item, id: newId() });
        added += 1;
      }
      setItems(merged);
      notify(t('toast.imported', { n: added }));
    },
    [items, notify, t],
  );

  const handleInstall = useCallback(async () => {
    const launched = await promptInstall();
    if (!launched) notify(t('toast.installed'));
  }, [notify, t]);

  return (
    <div className="app">
      {tab === 'home' && (
        <HomePage
          items={items}
          t={t}
          onOpen={(item) => setDetailId(item.id)}
          onToggleStar={toggleStar}
          onGoAdd={() => setTab('add')}
        />
      )}

      {tab === 'add' && (
        <AddPage t={t} existing={existing} onAdd={addConfigs} onNotice={notify} />
      )}

      {tab === 'settings' && (
        <SettingsPage
          t={t}
          settings={settings}
          onChange={setSettings}
          items={items}
          onImport={importBackup}
          onClear={() => setConfirmClear(true)}
          onExport={exportBackup}
          onInstall={handleInstall}
          installable={installable}
          installed={installed}
          onOpenLink={openExternal}
        />
      )}

      <nav className="tabbar" aria-label="Main">
        {TABS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className={`tab ${tab === entry.id ? 'active' : ''}`}
            onClick={() => setTab(entry.id)}
            aria-current={tab === entry.id ? 'page' : undefined}
          >
            <span className="tab-icon">
              <Icon name={entry.icon} size={21} />
            </span>
            {t(entry.label)}
          </button>
        ))}
      </nav>

      {detail && (
        <DetailSheet
          item={detail}
          lang={settings.lang}
          t={t}
          defaultClient={settings.defaultClient}
          onClose={() => setDetailId(null)}
          onUpdate={updateItem}
          onDelete={deleteItem}
          onQr={() => setQrId(detail.id)}
          onCopy={() => void copyLink(detail)}
          onShare={() => void shareLink(detail)}
        />
      )}

      {qrItem && (
        <QrModal
          title={qrItem.name}
          link={qrItem.raw}
          t={t}
          onClose={() => setQrId(null)}
          onCopy={() => void copyLink(qrItem)}
        />
      )}

      {confirmClear && (
        <ConfirmDialog
          title={t('settings.clearTitle')}
          text={t('settings.clearText')}
          confirmLabel={t('action.delete')}
          cancelLabel={t('action.cancel')}
          onCancel={() => setConfirmClear(false)}
          onConfirm={() => {
            setItems([]);
            setConfirmClear(false);
            setDetailId(null);
            notify(t('toast.cleared'));
          }}
        />
      )}

      {toast && (
        <div className="toast-wrap">
          <div className="toast" key={toast.id} role="status">
            <Icon name="check" size={16} />
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
}
