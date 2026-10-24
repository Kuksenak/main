import { Component, computed, inject, output, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthStore } from '../auth/auth.store';
import { I18nService } from '../core/i18n/i18n.service';
import { UiSearchResult, UiSearchWindow } from '../core/ui/search';
import { LibraryStore } from '../library/library.store';
import { visiblePlaces } from './places';

// (a result picked: what it opens — a page, a section; or an action)
type Found = UiSearchResult & { open: () => void };

/**
 * Desktop: the app's search (the sidebar's Search, Ctrl K / ⌘K), in the search window. Nothing
 * typed: the pages last changed and the actions (New page); something typed: the library's pages
 * and the app's sections whose names have it (the ones that start with it first).
 */
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
  private readonly auth = inject(AuthStore);
  private readonly library = inject(LibraryStore);
  private readonly router = inject(Router);

  protected readonly query = signal('');

  constructor() {
    // (the library: loaded once, if this user has it)
    if (this.auth.can('library') && !this.library.items()) this.library.load();
  }

  protected readonly found = computed<Found[]>(() => {
    const q = this.query().trim().toLocaleLowerCase(this.i18n.locale());
    const t = (key: Parameters<I18nService['t']>[0]) => this.i18n.t(key);
    const pages = (this.auth.can('library') ? (this.library.items() ?? []) : []).map(
      (p): Found => ({
        id: p.id,
        section: '',
        label: p.title,
        icon: 'page',
        open: () => this.router.navigate(['/library', p.id]),
      }),
    );

    // Nothing typed: the pages last changed, then the actions
    if (!q) {
      const actions: Found[] = this.auth.can('library')
        ? [{ id: 'new-page', section: t('search.actions'), label: t('library.new'), icon: 'plus', open: () => this.newPage() }]
        : [];
      return [...pages.slice(0, 8).map((p) => ({ ...p, section: t('search.recents') })), ...actions];
    }

    // Something typed: the names that have it — those starting with it first
    const has = (name: string) => name.toLocaleLowerCase(this.i18n.locale()).includes(q);
    const rank = (a: Found, b: Found) =>
      Number(!a.label.toLocaleLowerCase().startsWith(q)) - Number(!b.label.toLocaleLowerCase().startsWith(q));
    const places = visiblePlaces((area) => this.auth.can(area)).map(
      (p): Found => ({ id: p.path, section: t('search.sections'), label: t(p.label), icon: p.icon, open: () => this.router.navigateByUrl(p.path) }),
    );
    return [
      ...pages.filter((p) => has(p.label)).sort(rank).map((p) => ({ ...p, section: t('search.pages') })),
      ...places.filter((p) => has(p.label)).sort(rank),
    ].slice(0, 50);
  });

  protected pick(result: UiSearchResult): void {
    this.closed.emit();
    (result as Found).open();
  }

  private newPage(): void {
    this.library.create(this.i18n.t('library.untitled')).subscribe((page) =>
      this.router.navigate(['/library', page.id], { state: { fresh: true } }),
    );
  }
}
