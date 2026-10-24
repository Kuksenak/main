import { afterNextRender, Component, computed, ElementRef, inject, output, signal, viewChild } from '@angular/core';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { Icon, UiList, UiListItem, UiSheet } from '../core/ui';
import { AppSearch, Found } from './app-search';

/**
 * Phones: the app's search (the top bar's 🔍; as the desktop's search window) — a tall sheet: the field in its head (the loupe in
 * it), under it what's found by section (a list each: AppSearch's — nothing typed: the recent pages
 * and New page); a tap (or Search on the keyboard: the first one) opens it and the sheet goes.
 */
@Component({
  selector: 'app-search-sheet',
  imports: [Icon, TranslatePipe, UiList, UiListItem, UiSheet],
  templateUrl: './search-sheet.html',
})
export class SearchSheet {
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

  constructor() {
    this.search.prepare();
    // (focused at once: iOS opens the keyboard only while the tap that opened it is going on)
    afterNextRender(() => this.field().nativeElement.focus());
  }

  protected pick(found: Found, sheet: UiSheet): void {
    sheet.close();
    found.open();
  }

  // The keyboard's Search: the first one found
  protected first(sheet: UiSheet): void {
    const found = this.sections()[0]?.items[0];
    if (found) this.pick(found, sheet);
  }
}
