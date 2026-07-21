import {
  I18N_STORAGE_KEY,
  getCurrentLocale,
  setCurrentLocale,
  translate,
  type Locale,
  type MessageKey,
  type TranslationParams,
} from "../../src/i18n/index.ts";

interface StoredLocaleSnapshot {
  storage: Storage;
  value: string | null;
}

function captureStoredLocale(): StoredLocaleSnapshot | null {
  if (typeof window === "undefined") return null;

  try {
    return { storage: window.localStorage, value: window.localStorage.getItem(I18N_STORAGE_KEY) };
  } catch {
    return null;
  }
}

function restoreStoredLocale(snapshot: StoredLocaleSnapshot | null): void {
  if (!snapshot) return;

  try {
    if (snapshot.value === null) snapshot.storage.removeItem(I18N_STORAGE_KEY);
    else snapshot.storage.setItem(I18N_STORAGE_KEY, snapshot.value);
  } catch {
    // Tests without writable storage still restore the in-memory locale.
  }
}

export function withTestLocale<T>(locale: Locale, callback: () => Promise<T>): Promise<T>;
export function withTestLocale<T>(locale: Locale, callback: () => T): T;
export function withTestLocale<T>(locale: Locale, callback: () => T | Promise<T>): T | Promise<T> {
  const previousLocale = getCurrentLocale();
  const storedLocale = captureStoredLocale();
  setCurrentLocale(locale);

  try {
    const result = callback();
    if (result instanceof Promise) {
      return result.finally(() => {
        setCurrentLocale(previousLocale);
        restoreStoredLocale(storedLocale);
      });
    }

    setCurrentLocale(previousLocale);
    restoreStoredLocale(storedLocale);
    return result;
  } catch (error) {
    setCurrentLocale(previousLocale);
    restoreStoredLocale(storedLocale);
    throw error;
  }
}

export function translateForTest(
  locale: Locale,
  key: MessageKey,
  params?: TranslationParams,
): string {
  return translate(key, params, locale);
}
