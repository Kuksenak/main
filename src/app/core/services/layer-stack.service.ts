import { Injectable, computed, signal } from '@angular/core';

/**
 * Desktop popups stacked over each other (cards, dropdowns, questions), in opening order. Only
 * the bottom card dims the page; a card with anything open over it dims itself instead, so the
 * page doesn't get darker with every layer.
 */
@Injectable({ providedIn: 'root' })
export class LayerStack {
  private next = 0;
  private readonly layers = signal<{ id: number; page: boolean }[]>([]);

  /** Adds a layer (`page`: a card); returns its id, for remove() and the queries below. */
  add(page: boolean): number {
    const id = ++this.next;
    this.layers.update((ls) => [...ls, { id, page }]);
    return id;
  }

  remove(id: number): void {
    this.layers.update((ls) => ls.filter((l) => l.id !== id));
  }

  /** Something was opened over this layer. */
  covered(id: number) {
    return computed(() => this.layers().some((l) => l.id > id));
  }

  /** A card is open under this layer (so the page is already dimmed). */
  overPage(id: number): boolean {
    return this.layers().some((l) => l.page && l.id < id);
  }
}
