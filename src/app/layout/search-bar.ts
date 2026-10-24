import { afterNextRender, Component, computed, DestroyRef, ElementRef, inject, output, signal, viewChild } from '@angular/core';
import { I18nService } from '../core/i18n/i18n.service';
import { VisibleArea } from '../core/services/visible-area';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { Icon, UiList, UiListItem } from '../core/ui';
import { AppSearch, Found } from './app-search';

/**
 * Phones: the app's search at the bottom (as iOS 26's) — the field on a glass capsule just over
 * the keyboard (and its own bar: the system's, which a page can't change), what's found above it,
 * over the page, the nearest to the thumb at the bottom (AppSearch's: nothing typed, the recent
 * pages and New page). A tap opens it; ✕, Esc or a tap on nothing closes it; Search on the keyboard
 * opens the first one.
 */
@Component({
  selector: 'app-search-bar',
  imports: [Icon, TranslatePipe, UiList, UiListItem],
  templateUrl: './search-bar.html',
})
export class SearchBar {
  readonly closed = output<void>();

  private readonly search = inject(AppSearch);
  protected readonly i18n = inject(I18nService);
  private readonly field = viewChild.required<ElementRef<HTMLInputElement>>('field');

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

  // (on the part of the screen that's seen: with the keyboard up, the capsule just over it)
  protected readonly area = inject(VisibleArea);

  constructor() {
    this.search.prepare();
    // (focused at once: iOS opens the keyboard only while the tap that opened it is going on)
    afterNextRender(() => this.field().nativeElement.focus());
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && this.closed.emit();
    document.addEventListener('keydown', onKey);
    inject(DestroyRef).onDestroy(() => document.removeEventListener('keydown', onKey));
  }

  protected pick(found: Found): void {
    this.closed.emit();
    found.open();
  }

  // The keyboard's Search: the first one found
  protected submit(e: Event): void {
    e.preventDefault();
    const first = this.sections()[0]?.items[0];
    if (first) this.pick(first);
  }
}
