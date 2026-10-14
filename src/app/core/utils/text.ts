/** First letter of a name, uppercased for the given locale (avatars). */
export function initial(name: string, locale: string): string {
  return name.trim().charAt(0).toLocaleUpperCase(locale);
}

/** None, or what looks like an email: something@domain.tld, no spaces (as the server checks). */
export function emailOk(value: string | null | undefined): boolean {
  const v = value?.trim();
  return !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}
