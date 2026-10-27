import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { desktop } from '../core/device';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { Icon, Toasts, UiButton, UiFloatingButton, UiList, UiListItem, UiSheet } from '../core/ui';
import { PageTitle } from '../layout/page-title';
import { LibraryStore, PageItem } from './library.store';
import { TrashList } from './trash-list';

/**
 * The library: the account's pages, the last changed first — each its title and when it was last
 * changed; a tap opens it (/library/:id). New page: an empty one ("Untitled"), opened right away.
 * Desktop: New page at the top; phones: + floating at the bottom right, Trash under the pages (its
 * sheet).
 */
@Component({
  selector: 'app-library',
  imports: [Icon, TranslatePipe, TrashList, UiButton, UiFloatingButton, UiList, UiListItem, UiSheet],
  templateUrl: './library.html',
})
export class Library {
  protected readonly store = inject(LibraryStore);
  private readonly router = inject(Router);
  private readonly i18n = inject(I18nService);

  protected readonly desktop = desktop;
  protected readonly creating = signal(false);
  protected readonly trashOpen = signal(false);
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

  // "12 Oct", "12 Oct 2025" (another year)
  protected changed(item: PageItem): string {
    const d = new Date(item.updatedAt);
    const sameYear = d.getFullYear() === new Date().getFullYear();
    return this.i18n.date(d, sameYear ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' });
  }
}
