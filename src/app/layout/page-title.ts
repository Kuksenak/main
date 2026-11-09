import { computed, DestroyRef, effect, inject, Injectable, signal, Signal } from '@angular/core';
import { APP_NAME } from '../core/app-name';

/**
 * The open page's title — phones show it in the top bar (Schedule: the month in view). A page
 * calls `show(title)` in its constructor; it goes with the page. `back`: the address a ‹ in the
 * top bar goes to (a page opened from a list: back to the list); `menu`: its ⋯ at the top bar's right
 * (phones), what a tap on it does. The browser's tab shows it too (none: the app's name).
 */
@Injectable({ providedIn: 'root' })
export class PageTitle {
  private readonly current = signal<{ title: Signal<string>; back: string | null; menu: (() => void) | null } | null>(null);
  readonly text = computed(() => this.current()?.title() ?? '');
  readonly back = computed(() => this.current()?.back ?? null);
  readonly menu = computed(() => this.current()?.menu ?? null);

  constructor() {
    effect(() => (document.title = this.text() || APP_NAME));
  }

  show(title: Signal<string>, back: string | null = null, menu: (() => void) | null = null): void {
    const entry = { title, back, menu };
    this.current.set(entry);
    inject(DestroyRef).onDestroy(() => {
      if (this.current() === entry) this.current.set(null);
    });
  }
}
