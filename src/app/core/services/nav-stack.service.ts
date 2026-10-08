import { Injectable, signal } from '@angular/core';

/**
 * A card opened on top of whatever is on screen (lesson, student, group). Cards open from
 * anywhere (a list, another card) and stack: "back" closes only the top one, so the card
 * underneath is exactly as it was left — unsaved edits included.
 */
export interface StackEntry {
  key: number;
  kind: 'lesson' | 'student' | 'group';
  id: string | null; // null = new
  date?: string; // new lesson: its day ('yyyy-MM-dd')
  studentIds?: string[]; // new group: pre-selected members
}

@Injectable({ providedIn: 'root' })
export class NavStack {
  private nextKey = 1;
  readonly entries = signal<StackEntry[]>([]);

  push(entry: Omit<StackEntry, 'key'>): void {
    this.entries.update((list) => [...list, { ...entry, key: this.nextKey++ }]);
  }

  /** Remove a card (after its close animation). */
  remove(key: number): void {
    this.entries.update((list) => list.filter((e) => e.key !== key));
  }
}
