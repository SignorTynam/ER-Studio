import { createContext, useContext, useMemo, useSyncExternalStore } from "react";
import type { PropsWithChildren } from "react";
import {
  getCurrentLocale,
  getLanguageLabel,
  getLanguageMenuLabel,
  getMessages,
  setCurrentLocale,
  subscribeToLocale,
  translate,
  type Locale,
  type MessageKey,
  type Messages,
  type TranslationParams,
} from "./index";

export interface I18nContextValue {
  locale: Locale;
  messages: Messages;
  t: (key: MessageKey, params?: TranslationParams) => string;
  setLocale: (locale: Locale) => void;
  getLanguageLabel: (locale: Locale) => string;
  getLanguageMenuLabel: (locale: Locale) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: PropsWithChildren) {
  const locale = useSyncExternalStore(subscribeToLocale, getCurrentLocale, getCurrentLocale);
  const messages = useMemo(() => getMessages(locale), [locale]);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      messages,
      t: (key, params) => translate(key, params, locale),
      setLocale: setCurrentLocale,
      getLanguageLabel: (language) => getLanguageLabel(language, locale),
      getLanguageMenuLabel: (language) => getLanguageMenuLabel(language, locale),
    }),
    [locale, messages],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18nContext(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider.");
  }

  return context;
}
