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

  /** Time of day in the current locale, e.g. "18:00" / "06:00 PM". */
  time(d: Date): string {
    return d.toLocaleTimeString(this.locale(), { hour: '2-digit', minute: '2-digit' });
  }

  /** A date in the current locale with the given parts, e.g. { weekday: 'short', day: 'numeric' }. */
  date(d: Date, parts: Intl.DateTimeFormatOptions): string {
    return d.toLocaleDateString(this.locale(), parts);
  }

  /** First letter uppercased (month / weekday names are lowercase in some languages). */
  capitalize(s: string): string {
    return s.charAt(0).toLocaleUpperCase(this.locale()) + s.slice(1);
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
