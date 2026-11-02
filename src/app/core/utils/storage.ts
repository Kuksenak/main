import { signal, Signal } from '@angular/core';

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

/** Sections folded away (the sidebar's, the library's date groups), kept on this device. */
export interface KeptFolds<T extends string> {
  /** The ids folded away. */
  readonly folded: Signal<readonly T[]>;
  has(id: T): boolean;
  /** Folded ⇄ open. */
  toggle(id: T): void;
}

/** The sections folded away under `key` (their ids, a comma between): `folds.has(id)`, `folds.toggle(id)`. */
export function keptFolds<T extends string = string>(key: string): KeptFolds<T> {
  const folded = signal<T[]>((kept(key) ?? '').split(',').filter(Boolean) as T[]);
  return {
    folded,
    has: (id) => folded().includes(id),
    toggle: (id) => {
      folded.update((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));
      keep(key, folded().join(','));
    },
  };
}
