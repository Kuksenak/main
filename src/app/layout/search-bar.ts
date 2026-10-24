import { Component, computed, DestroyRef, ElementRef, inject, signal, viewChild } from '@angular/core';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { VisibleArea } from '../core/services/visible-area';
import { Icon, UiList, UiListItem } from '../core/ui';
import { AppSearch, Found } from './app-search';

/**
 * Phones: the app's search (the top bar's 🔍), as Telegram's — over the whole screen, the field on
 * a capsule where the top bar was, ✕ a circle at its right; under it what's found (AppSearch's:
 * nothing typed, the recent pages and New page), by section, down to the keyboard. A tap (or
 * Search on the keyboard: the first one) opens it; ✕ or Esc closes it.
 *
 * It's there (unseen) all the while: 🔍 calls `start()`, which focuses the field during the tap
 * (else iOS doesn't open the keyboard) — at the top, so iOS has nothing to push up for it.
 */
@Component({
  selector: 'app-search-bar',
  imports: [Icon, TranslatePipe, UiList, UiListItem],
  templateUrl: './search-bar.html',
})
export class SearchBar {
  private readonly search = inject(AppSearch);
  protected readonly i18n = inject(I18nService);
  protected readonly area = inject(VisibleArea);
  private readonly field = viewChild.required<ElementRef<HTMLInputElement>>('field');

  readonly open = signal(false);
  protected readonly query = signal('');
  // What's found, by section, in order
  protected readonly sections = computed(() => {
    const sections: { name: string; items: Found[] }[] = [];
    for (const found of this.search.find(this.query())) {
      const last = sections.at(-1);
      if (last?.name === found.section) last.items.push(found);
      else sections.push({ name: found.section, items: [found] });
    }
    return sections;
  });

  constructor() {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && this.open() && this.close();
    // (iOS pushing the page up for the field anyway: back to the top)
    const stay = () => this.open() && window.scrollY !== 0 && window.scrollTo(0, 0);
    document.addEventListener('keydown', onKey);
    window.visualViewport?.addEventListener('resize', stay);
    inject(DestroyRef).onDestroy(() => {
      document.removeEventListener('keydown', onKey);
      window.visualViewport?.removeEventListener('resize', stay);
    });
  }

  // 🔍: opened, the field focused at once (during the tap)
  start(): void {
    this.search.prepare();
    this.query.set('');
    this.open.set(true);
    this.field().nativeElement.focus({ preventScroll: true });
  }

  protected close(): void {
    this.open.set(false);
    this.field().nativeElement.blur();
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
