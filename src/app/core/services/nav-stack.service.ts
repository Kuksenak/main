import { Injectable, signal } from '@angular/core';

/**
 * A card opened on top of whatever is on screen (event, student, group, lesson). Cards open from
 * anywhere (a list, another card) and stack: "back" closes only the top one, so the card
 * underneath is exactly as it was left — unsaved edits included.
 */
export interface StackEntry {
  key: number;
  kind: 'event' | 'student' | 'group' | 'lesson';
  id: string | null; // null = new
  date?: string; // new event: its day ('yyyy-MM-dd')
  studentIds?: string[]; // new group: pre-selected members
}

@Injectable({ providedIn: 'root' })
export class NavStack {
  private nextKey = 1;
  readonly entries = signal<StackEntry[]>([]);

  /**
   * Open a card on top — or, if that same card (kind + id) is already open further down, go
   * back to it (the cards above it close), so following links never loops
   * (event → student → the same event …).
   */
  push(entry: Omit<StackEntry, 'key'>): void {
    this.entries.update((list) => {
      const i = entry.id ? list.findIndex((e) => e.kind === entry.kind && e.id === entry.id) : -1;
      return i >= 0 ? list.slice(0, i + 1) : [...list, { ...entry, key: this.nextKey++ }];
    });
  }

  /** Close every card at once (e.g. leaving for another page). */
  clear(): void {
    this.entries.set([]);
  }

  /** Remove a card (after its close animation). */
  remove(key: number): void {
    this.entries.update((list) => list.filter((e) => e.key !== key));
  }
}
