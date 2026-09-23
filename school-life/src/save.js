/* ============================================================
   School Life: Open Campus — save.js
   ذخیره/بازیابی بازی با LocalStorage
   ============================================================ */

const KEY = 'sloc_save_v1';
export const SAVE_VERSION = 1;

export function hasSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return false;
    const d = JSON.parse(raw);
    return d && d.v === SAVE_VERSION;
  } catch (e) {
    return false;
  }
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (!d || d.v !== SAVE_VERSION) return null;
    return d;
  } catch (e) {
    return null;
  }
}

export function storeSave(data) {
  try {
    data.v = SAVE_VERSION;
    data.savedAt = Date.now();
    localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    return false;
  }
}

export function clearSave() {
  try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
}
