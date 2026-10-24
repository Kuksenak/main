import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';

/**
 * Phones: a filter over what the open page shows (its list: Library, the pages' titles; Home, the
 * icons' names) — the top bar's funnel opens the capsule at the bottom (FilterBar), what's typed in
 * it is `query`. A page that has something to filter calls `offer()` in its constructor and shows
 * only what `matches`; the funnel is there only while such a page is open, and the filter goes
 * with the page.
 */
@Injectable({ providedIn: 'root' })
export class PageFilter {
  private readonly owner = signal<object | null>(null);
  readonly query = signal('');
  // (lower case, trimmed: '' — everything)
  private readonly needle = computed(() => this.query().trim().toLowerCase());
  readonly offered = computed(() => this.owner() !== null);

  offer(): void {
    const entry = {};
    this.owner.set(entry);
    this.query.set('');
    inject(DestroyRef).onDestroy(() => {
      if (this.owner() !== entry) return;
      this.owner.set(null);
      this.query.set('');
    });
  }

  matches(...texts: (string | null | undefined)[]): boolean {
    const needle = this.needle();
    return !needle || texts.some((text) => text?.toLowerCase().includes(needle));
  }
}
