/**
 * What's kept on this device (localStorage) — a folded list, the language. Storage may be off (a
 * private window, blocked): then nothing's kept and nothing's read, quietly.
 */
export function kept(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function keep(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // (not kept)
  }
}
