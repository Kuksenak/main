import { Injectable, signal } from '@angular/core';
import { openKeyboardNow } from '../utils/keyboard';

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
  at?: string; // a repeating event: which repeat was opened (its start)
  studentIds?: string[]; // new group: pre-selected members
  readOnly?: boolean; // opened from another card: just for reading, no links out of it
}

@Injectable({ providedIn: 'root' })
export class NavStack {
  private nextKey = 1;
  readonly entries = signal<StackEntry[]>([]);

  /**
   * Open a card on top. A card opened from another card is read-only (a peek: no editing and no
   * links further), so following links never goes in circles. If that same card (kind + id) is
   * already open further down, go back to it instead.
   */
  push(entry: Omit<StackEntry, 'key'>): void {
    // A new item on a phone: open the keyboard right away, within the tap (iOS needs that);
    // the card's first field takes the focus when it's in.
    if (!entry.id && document.documentElement.dataset['device'] === 'mobile') openKeyboardNow();

    this.entries.update((list) => {
      const i = entry.id ? list.findIndex((e) => e.kind === entry.kind && e.id === entry.id) : -1;
      if (i >= 0) return list.slice(0, i + 1);
      const readOnly = entry.readOnly ?? list.length > 0;
      return [...list, { ...entry, readOnly, key: this.nextKey++ }];
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
