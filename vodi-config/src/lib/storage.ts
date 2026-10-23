import type { ConfigItem, Settings } from './types';

const ITEMS_KEY = 'vodi-config.items.v1';
const SETTINGS_KEY = 'vodi-config.settings.v1';

export const defaultSettings: Settings = {
  lang: 'fa',
  theme: 'dark',
  defaultClient: 'v2rayng',
};

export function loadItems(): ConfigItem[] {
  try {
    const raw = localStorage.getItem(ITEMS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is ConfigItem => {
      const c = item as Partial<ConfigItem>;
      return typeof c?.id === 'string' && typeof c?.raw === 'string' && typeof c?.host === 'string';
    });
  } catch {
    return [];
  }
}

export function saveItems(items: ConfigItem[]): void {
  try {
    localStorage.setItem(ITEMS_KEY, JSON.stringify(items));
  } catch {
    /* storage full / private mode */
  }
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...defaultSettings };
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      lang: parsed.lang === 'en' ? 'en' : 'fa',
      theme: parsed.theme === 'light' || parsed.theme === 'auto' ? parsed.theme : 'dark',
      defaultClient: parsed.defaultClient ?? defaultSettings.defaultClient,
    };
  } catch {
    return { ...defaultSettings };
  }
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* ignore */
  }
}

export function newId(): string {
  const cryptoObj = globalThis.crypto;
  if (cryptoObj && 'randomUUID' in cryptoObj) return cryptoObj.randomUUID();
  return `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}
