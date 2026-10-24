import { computed, DestroyRef, inject, Injectable, signal, Signal } from '@angular/core';

/**
 * The open page's title — phones show it in the top bar (Schedule: the month in view). A page
 * calls `show(title)` in its constructor; it goes with the page. `back`: the address a ‹ in the
 * top bar goes to (a page opened from a list: back to the list).
 */
@Injectable({ providedIn: 'root' })
export class PageTitle {
  private readonly current = signal<{ title: Signal<string>; back: string | null } | null>(null);
  readonly text = computed(() => this.current()?.title() ?? '');
  readonly back = computed(() => this.current()?.back ?? null);

  show(title: Signal<string>, back: string | null = null): void {
    const entry = { title, back };
    this.current.set(entry);
    inject(DestroyRef).onDestroy(() => {
      if (this.current() === entry) this.current.set(null);
    });
  }
}
