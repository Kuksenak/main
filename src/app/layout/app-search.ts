import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { AuthStore } from '../auth/auth.store';
import { I18nService } from '../core/i18n/i18n.service';
import { IconName } from '../core/ui';
import { LibraryStore } from '../library/library.store';
import { visiblePlaces } from './places';

/** Something found: its icon, its name, the section it's under (a hint after it); `open` it. */
export interface Found {
  id: string;
  section: string;
  label: string;
  hint?: string;
  icon: IconName;
  open: () => void;
}

/** What the search looks through: everything, the pages only, the events only (none yet). */
export type SearchScope = 'all' | 'pages' | 'events';

/**
 * What the app's search finds — the desktop's search window and the phones' search (SearchBar) alike.
 * Nothing typed: the pages last changed and the actions (New page); something typed: the library's
 * pages and the app's sections whose names have it (the ones that start with it first). `find` reads
 * signals: call it in a computed. `scope` (the phones' tabs): 'pages' — all the pages, the last
 * changed first (or those that have it); 'events' — none yet. `actions` off (phones): no New page.
 */
@Injectable({ providedIn: 'root' })
export class AppSearch {
  private readonly i18n = inject(I18nService);
  private readonly auth = inject(AuthStore);
  private readonly library = inject(LibraryStore);
  private readonly router = inject(Router);

  /** The search opened: the library loaded (once, if this user has it). */
  prepare(): void {
    if (this.auth.can('library') && !this.library.items()) this.library.load();
  }

  find(query: string, scope: SearchScope = 'all', actions = true): Found[] {
    const q = query.trim().toLocaleLowerCase(this.i18n.locale());
    const t = (key: Parameters<I18nService['t']>[0]) => this.i18n.t(key);
    const pages = (this.auth.can('library') ? (this.library.items() ?? []) : []).map(
      (p): Found => ({ id: p.id, section: '', label: p.title, icon: 'page', open: () => this.router.navigate(['/library', p.id]) }),
    );
    if (scope === 'events') return [];
    if (scope === 'pages') {
      const all = pages.map((p) => ({ ...p, section: t('search.pages') }));
      return q ? all.filter((p) => p.label.toLocaleLowerCase(this.i18n.locale()).includes(q)) : all;
    }

    // Nothing typed: the pages last changed, then the actions
    if (!q) {
      const extra: Found[] = actions && this.auth.can('library')
        ? [{ id: 'new-page', section: t('search.actions'), label: t('library.new'), icon: 'plus', open: () => this.newPage() }]
        : [];
      return [...pages.slice(0, 8).map((p) => ({ ...p, section: t('search.recents') })), ...extra];
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
  }

  private newPage(): void {
    this.library.create(this.i18n.t('library.untitled')).subscribe((page) =>
      this.router.navigate(['/library', page.id], { state: { fresh: true } }),
    );
  }
}
