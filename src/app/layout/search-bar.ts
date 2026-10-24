import { Component, computed, DestroyRef, ElementRef, inject, signal, viewChild } from '@angular/core';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { refreshThemeColor } from '../core/services/theme-color';
import { VisibleArea } from '../core/services/visible-area';
import { Icon, UiFloatingButton, UiList, UiListItem } from '../core/ui';
import { AppSearch, Found, SearchScope } from './app-search';

/**
 * Phones: the app's search (the top bar's 🔍), as Telegram's — over the whole screen, the field on
 * a capsule where the top bar was and ✕ at its right (both as the top bar's buttons), the tabs
 * under them (All, Pages, Events); under those what's found (AppSearch's, no actions: nothing
 * typed, the recent pages), by section, scrolled on its own down to the keyboard — the head
 * stays put. A tap (or
 * Search on the keyboard: the first one) opens it; ✕ or Esc closes it.
 *
 * It's there (unseen) all the while: 🔍 calls `start()`, which focuses the field during the tap
 * (else iOS doesn't open the keyboard) — at the top, so iOS has nothing to push up for it.
 */
@Component({
  selector: 'app-search-bar',
  imports: [Icon, TranslatePipe, UiFloatingButton, UiList, UiListItem],
  templateUrl: './search-bar.html',
})
export class SearchBar {
  private readonly search = inject(AppSearch);
  protected readonly i18n = inject(I18nService);
  protected readonly area = inject(VisibleArea);
  private readonly field = viewChild.required<ElementRef<HTMLInputElement>>('field');

  readonly open = signal(false);
  protected readonly query = signal('');
  protected readonly scope = signal<SearchScope>('all');
  protected readonly tabs = [
    { scope: 'all', label: 'search.all' },
    { scope: 'pages', label: 'search.pages' },
    { scope: 'events', label: 'search.events' },
  ] as const;
  // What's found, by section, in order
  protected readonly sections = computed(() => {
    const sections: { name: string; items: Found[] }[] = [];
    for (const found of this.search.find(this.query(), this.scope(), false)) {
      const last = sections.at(-1);
      if (last?.name === found.section) last.items.push(found);
      else sections.push({ name: found.section, items: [found] });
    }
    return sections;
  });

  constructor() {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && this.open() && this.close();
    document.addEventListener('keydown', onKey);
    inject(DestroyRef).onDestroy(() => {
      document.removeEventListener('keydown', onKey);
    });
  }

  // 🔍: opened, the field focused at once (during the tap)
  start(): void {
    this.search.prepare();
    this.query.set('');
    this.scope.set('all');
    this.open.set(true);
    this.field().nativeElement.focus({ preventScroll: true });
  }

  // The results dragged: the keyboard away (as iOS's own search, Telegram's) — with it up, iOS
  // moved the whole screen along with the drag, the head with it
  protected scrolled(): void {
    const field = this.field().nativeElement;
    if (document.activeElement === field) field.blur();
  }

  protected close(): void {
    this.open.set(false);
    this.field().nativeElement.blur();
    refreshThemeColor();
  }

  protected pick(found: Found): void {
    this.close();
    found.open();
  }

  // The keyboard's Search: the first one found
  protected submit(e: Event): void {
    e.preventDefault();
    const first = this.sections()[0]?.items[0];
    if (first) this.pick(first);
  }
}
