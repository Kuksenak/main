import { Injectable, signal } from '@angular/core';

export type PeekKind = 'lesson' | 'student' | 'group';

/** What the peek popup (./peek.ts) shows: a lesson, student or group (a new one: no id yet). */
@Injectable({ providedIn: 'root' })
export class PeekService {
  private readonly state = signal<{ kind: PeekKind; id: string | null; n: number } | null>(null);
  readonly current = this.state.asReadonly();
  private n = 0;

  /** A page in the popup (id null: a new one). */
  open(kind: PeekKind, id: string | null = null): void {
    this.state.set({ kind, id, n: ++this.n });
  }

  /** A new one, saved the first time: its id. */
  setId(id: string): void {
    this.state.update((s) => (s ? { ...s, id } : s));
  }

  close(): void {
    this.state.set(null);
  }
}
