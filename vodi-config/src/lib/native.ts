interface CapacitorWindow extends Window {
  Capacitor?: { isNativePlatform?: () => boolean };
}

export function isNative(): boolean {
  const win = window as CapacitorWindow;
  return Boolean(win.Capacitor?.isNativePlatform?.());
}

/** Opens a deep link / website outside the WebView on Android, in a new tab on web. */
export function openExternal(url: string): void {
  if (isNative()) {
    window.open(url, '_system');
    return;
  }
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.rel = 'noopener noreferrer';
  anchor.target = '_blank';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

let deferredPrompt: (Event & { prompt: () => Promise<void>; userChoice?: Promise<unknown> }) | null = null;

export function initInstallPrompt(): void {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event as Event & { prompt: () => Promise<void> };
    window.dispatchEvent(new CustomEvent('vodi:installable'));
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    window.dispatchEvent(new CustomEvent('vodi:installed'));
  });
}

export function canInstall(): boolean {
  return deferredPrompt !== null;
}

export async function promptInstall(): Promise<boolean> {
  if (!deferredPrompt) return false;
  try {
    await deferredPrompt.prompt();
    deferredPrompt = null;
    return true;
  } catch {
    return false;
  }
}

export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}
