import { computed, DestroyRef, inject, Injectable, signal, Signal } from '@angular/core';
import { TranslationKey } from '../core/i18n/translations';

/**
 * The open page's title — phones show it in the top bar (Schedule: the month in view). A page
 * calls `show(title)` in its constructor; it goes with the page. `back`: the address a ‹ in the
 * top bar goes to (a page opened from a list: back to the list); `menu`: its ⋯ at the top bar's right
 * (phones), what a tap on it does; `add`: its + on the top bar's capsule (phones: a new event, …).
 */
/** A page's + in the top bar: what it's called (its key), what a tap on it does. */
export interface PageAdd {
  label: TranslationKey;
  run: () => void;
}

@Injectable({ providedIn: 'root' })
export class PageTitle {
  private readonly current = signal<{
    title: Signal<string>;
    back: string | null;
    menu: (() => void) | null;
    add: PageAdd | null;
  } | null>(null);
  readonly text = computed(() => this.current()?.title() ?? '');
  readonly back = computed(() => this.current()?.back ?? null);
  readonly menu = computed(() => this.current()?.menu ?? null);
  readonly add = computed(() => this.current()?.add ?? null);

  show(title: Signal<string>, back: string | null = null, menu: (() => void) | null = null, add: PageAdd | null = null): void {
    const entry = { title, back, menu, add };
    this.current.set(entry);
    inject(DestroyRef).onDestroy(() => {
      if (this.current() === entry) this.current.set(null);
    });
  }
}
