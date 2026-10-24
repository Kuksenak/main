import { Component, computed, inject, output, signal } from '@angular/core';
import { I18nService } from '../core/i18n/i18n.service';
import { UiSearchResult, UiSearchWindow } from '../core/ui/search';
import { AppSearch, Found } from './app-search';

/** Desktop: the app's search (the sidebar's Search, Ctrl+K / ⌘K), in the search window (what it finds: AppSearch). */
@Component({
  selector: 'app-search',
  imports: [UiSearchWindow],
  template: `
    <ui-search-window
      [results]="found()"
      [(query)]="query"
      [placeholder]="i18n.t('search.placeholder')"
      [empty]="i18n.t('search.nothing')"
      [keys]="[i18n.t('search.close'), i18n.t('search.move'), i18n.t('search.open')]"
      (picked)="pick($event)"
      (closed)="closed.emit()"
    />
  `,
})
export class Search {
  readonly closed = output<void>();

  protected readonly i18n = inject(I18nService);
  private readonly search = inject(AppSearch);

  protected readonly query = signal('');
  protected readonly found = computed(() => this.search.find(this.query()));

  constructor() {
    this.search.prepare();
  }

  protected pick(result: UiSearchResult): void {
    this.closed.emit();
    (result as Found).open();
  }
}
