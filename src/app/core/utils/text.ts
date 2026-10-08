/** First letter of a name, uppercased for the given locale (avatars). */
export function initial(name: string, locale: string): string {
  return name.trim().charAt(0).toLocaleUpperCase(locale);
}
