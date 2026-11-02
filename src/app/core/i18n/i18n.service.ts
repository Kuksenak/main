import { Injectable, computed, signal } from '@angular/core';
import { keep, kept } from '../utils/storage';
import { DICTIONARIES, LANGUAGES, LanguageCode, TranslationKey } from './translations';

const STORAGE_KEY = 'lang';

/** Current UI language: translations (`t`) and its locale's dates (`date`, `weekdays`). */
@Injectable({ providedIn: 'root' })
export class I18nService {
  readonly languages = LANGUAGES;
  readonly lang = signal<LanguageCode>(this.initialLang());
  readonly locale = computed(() => LANGUAGES.find((l) => l.code === this.lang())!.locale);

  // Monday-first short weekday names in the current locale ("Mon", "pon.", "lun.").
  readonly weekdays = computed(() =>
    Array.from({ length: 7 }, (_, i) => this.date(new Date(2024, 0, 1 + i), { weekday: 'short' })),
  );

  constructor() {
    document.documentElement.lang = this.lang();
  }

  /** A date in the current locale with the given parts, e.g. { month: 'long', year: 'numeric' }. */
  date(d: Date, parts: Intl.DateTimeFormatOptions): string {
    const locale = this.locale();
    const key = `${locale}|${JSON.stringify(parts)}`;
    let f = this.formatters.get(key);
    if (!f) this.formatters.set(key, (f = new Intl.DateTimeFormat(locale, parts)));
    return f.format(d);
  }

  /** "26 Oct" ("26 Oct 2025": another year); `time`: "26 Oct, 15:02". */
  day(at: string | Date, time = false): string {
    const d = new Date(at);
    const parts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
    if (d.getFullYear() !== new Date().getFullYear()) parts.year = 'numeric';
    if (time) Object.assign(parts, { hour: '2-digit', minute: '2-digit' });
    return this.date(d, parts);
  }

  /** "15:02" */
  time(at: string | Date): string {
    return this.date(new Date(at), { hour: '2-digit', minute: '2-digit' });
  }

  /** First letter uppercased (month / weekday names are lowercase in some languages). */
  capitalize(s: string): string {
    return s.charAt(0).toLocaleUpperCase(this.locale()) + s.slice(1);
  }

  // A formatter per locale and parts, made once (making one is slow, Safari especially)
  private readonly formatters = new Map<string, Intl.DateTimeFormat>();

  t(key: TranslationKey): string {
    return DICTIONARIES[this.lang()][key] ?? DICTIONARIES.en[key] ?? key;
  }

  setLang(code: LanguageCode): void {
    this.lang.set(code);
    document.documentElement.lang = code;
    keep(STORAGE_KEY, code);
  }

  // Saved choice, else the browser language if supported, else English.
  private initialLang(): LanguageCode {
    const supported = (c: string | null): c is LanguageCode => LANGUAGES.some((l) => l.code === c);
    const saved = kept(STORAGE_KEY);
    if (supported(saved)) return saved;
    const browser = navigator.language.slice(0, 2);
    return supported(browser) ? browser : 'en';
  }
}
