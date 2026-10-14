import { Injectable, signal } from '@angular/core';

export type PeekKind = 'lesson' | 'student' | 'group';

/** What the peek popup (./peek.ts) shows: a lesson, student or group (a new one: no id yet). */
@Injectable({ providedIn: 'root' })
export class PeekService {
  private readonly state = signal<{ kind: PeekKind; id: string | null; n: number; over: boolean } | null>(null);
  readonly current = this.state.asReadonly();
  private n = 0;

  private onCreated: ((id: string) => void) | null = null;

  /**
   * A page in the popup (id null: a new one). `over`: opened from a card (an event's), above it;
   * `onCreated`: a new one's id once saved (e.g. attached to that event).
   */
  open(kind: PeekKind, id: string | null = null, opts: { over?: boolean; onCreated?: (id: string) => void } = {}): void {
    this.onCreated = opts.onCreated ?? null;
    this.state.set({ kind, id, n: ++this.n, over: !!opts.over });
  }

  /** A new one, saved the first time: its id. */
  setId(id: string): void {
    this.onCreated?.(id);
    this.onCreated = null;
    this.state.update((s) => (s ? { ...s, id } : s));
  }

  close(): void {
    this.onCreated = null;
    this.state.set(null);
  }
}
