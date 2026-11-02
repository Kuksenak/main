import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { desktop } from '../core/device';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { TranslationKey } from '../core/i18n/translations';
import { Icon, IconName, Toasts, UiButton, UiFloatingButton, UiList, UiListItem } from '../core/ui';
import { PageTitle } from '../layout/page-title';
import { LibraryStore, PageItem } from './library.store';

/**
 * The library: the account's pages, the last changed first — each its title and when it was last
 * changed; a tap opens it (/library/:id). New page: an empty one ("Untitled"), opened right away.
 * Desktops, as Notion's: the name big, the views as pills (Recents: all; Favorites; Published) and New
 * page, the view's pages by when they were changed (Today, 7 days, 30 days, older), a row each. Phones: the pages on a card, +
 * floating at the bottom right (Trash: the account's sheet).
 */
type View = 'recents' | 'favorites' | 'published';

@Component({
  selector: 'app-library',
  imports: [Icon, TranslatePipe, UiButton, UiFloatingButton, UiList, UiListItem],
  templateUrl: './library.html',
})
export class Library {
  protected readonly store = inject(LibraryStore);
  private readonly router = inject(Router);
  private readonly i18n = inject(I18nService);

  protected readonly desktop = desktop;
  protected readonly creating = signal(false);
  // Desktops: the views — all the pages, the favorites, the published ones
  protected readonly views: { id: View; label: TranslationKey; icon: IconName }[] = [
    { id: 'recents', label: 'library.recents', icon: 'update' },
    { id: 'favorites', label: 'library.favorites', icon: 'bookmark' },
    { id: 'published', label: 'library.published', icon: 'globe' },
  ];
  protected readonly view = signal<View>('recents');

  // The view's pages by when they were changed: Today, the last 7 days, 30, older (only those with any)
  protected readonly groups = computed(() => {
    const view = this.view();
    const items = (this.store.items() ?? []).filter((i) => view === 'recents' || (view === 'favorites' ? i.favorite : i.published));
    const day = new Date();
    day.setHours(0, 0, 0, 0);
    const today = day.getTime();
    const DAY = 86_400_000;
    const groups: { key: TranslationKey; items: PageItem[] }[] = [
      { key: 'library.today', items: [] },
      { key: 'library.week', items: [] },
      { key: 'library.month', items: [] },
      { key: 'library.older', items: [] },
    ];
    for (const item of items) {
      const at = new Date(item.updatedAt).getTime();
      groups[at >= today ? 0 : at >= today - 7 * DAY ? 1 : at >= today - 30 * DAY ? 2 : 3].items.push(item);
    }
    return groups.filter((g) => g.items.length);
  });
  private readonly toasts = inject(Toasts);

  constructor() {
    inject(PageTitle).show(computed(() => this.i18n.t('nav.library')));
    this.store.load();
  }

  protected open(item: PageItem): void {
    this.router.navigate(['/library', item.id]);
  }

  protected create(): void {
    if (this.creating()) return;
    this.creating.set(true);
    this.store.create(this.i18n.t('library.untitled')).subscribe({
      next: (page) => this.router.navigate(['/library', page.id], { state: { fresh: true } }),
      error: () => {
        this.creating.set(false);
        this.toasts.error(this.i18n.t('library.createError'));
      },
    });
  }

  // "12 Oct", "12 Oct 2025" (another year); today: "15:02"
  protected changed(item: PageItem, time = false): string {
    const d = new Date(item.updatedAt);
    if (time) return this.i18n.date(d, { hour: '2-digit', minute: '2-digit' });
    const sameYear = d.getFullYear() === new Date().getFullYear();
    return this.i18n.date(d, sameYear ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' });
  }
}
