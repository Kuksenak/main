import { computed, DestroyRef, inject, Injectable, signal, Signal } from '@angular/core';

/**
 * The open page's title — phones show it in the top bar (Schedule: the month in view). A page
 * calls `show(title)` in its constructor; it goes with the page.
 */
@Injectable({ providedIn: 'root' })
export class PageTitle {
  private readonly current = signal<Signal<string> | null>(null);
  readonly text = computed(() => this.current()?.() ?? '');

  show(title: Signal<string>): void {
    this.current.set(title);
    inject(DestroyRef).onDestroy(() => {
      if (this.current() === title) this.current.set(null);
    });
  }
}
