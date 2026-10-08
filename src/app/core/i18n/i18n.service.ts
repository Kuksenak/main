import { Injectable, computed, signal } from '@angular/core';
import { DICTIONARIES, LANGUAGES, LanguageCode, TranslationKey } from './translations';

const STORAGE_KEY = 'lang';

/** Current UI language: translations (`t`) and the locale for dates and times. */
@Injectable({ providedIn: 'root' })
export class I18nService {
  readonly languages = LANGUAGES;
  readonly lang = signal<LanguageCode>(this.initialLang());
  readonly locale = computed(() => LANGUAGES.find((l) => l.code === this.lang())!.locale);

  // Monday-first short weekday names in the current locale.
  readonly weekdays = computed(() =>
    Array.from({ length: 7 }, (_, i) =>
      new Date(2024, 0, 1 + i).toLocaleDateString(this.locale(), { weekday: 'short' }),
    ),
  );

  constructor() {
    document.documentElement.lang = this.lang();
  }

  t(key: TranslationKey): string {
    return DICTIONARIES[this.lang()][key] ?? DICTIONARIES.en[key] ?? key;
  }

  setLang(code: LanguageCode): void {
    this.lang.set(code);
    document.documentElement.lang = code;
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch {
      /* storage unavailable — keep the choice for this session only */
    }
  }

  // Saved choice, else the browser language if supported, else English.
  private initialLang(): LanguageCode {
    const supported = (c: string | null): c is LanguageCode => LANGUAGES.some((l) => l.code === c);
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (supported(saved)) return saved;
    } catch {
      /* ignore */
    }
    const browser = navigator.language.slice(0, 2);
    return supported(browser) ? browser : 'en';
  }
}
