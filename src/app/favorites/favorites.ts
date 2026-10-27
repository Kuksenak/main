import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthStore } from '../auth/auth.store';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { UiList, UiListItem } from '../core/ui';
import { PageTitle } from '../layout/page-title';
import { LibraryStore, PageItem } from '../library/library.store';

/**
 * Favorites (phones: a section of its own, in the top bar's menu; desktops: the sidebar's folding
 * group): what's been bookmarked — for now the library's pages (people later, each kind under
 * its own title). A tap opens it; back from it: here.
 */
@Component({
  selector: 'app-favorites',
  imports: [TranslatePipe, UiList, UiListItem],
  template: `
    <div class="flex flex-col gap-2 px-4 pt-2 pb-24">
      @if (pages(); as pages) {
        @if (!pages.length) {
          <p class="px-row-x py-6 text-body text-fg-secondary">{{ 'favorites.empty' | t }}</p>
        } @else {
          <span class="px-row-x text-body font-semibold text-fg-secondary">{{ 'nav.library' | t }}</span>
          <ui-list>
            @for (item of pages; track item.id) {
              <button type="button" uiListItem icon="page" (click)="open(item)" [chevron]="true">{{ item.title }}</button>
            }
          </ui-list>
        }
      }
    </div>
  `,
})
export class Favorites {
  private readonly store = inject(LibraryStore);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthStore);

  // (null: not read yet)
  protected readonly pages = computed(() => this.store.items()?.filter((x) => x.favorite) ?? null);

  constructor() {
    const i18n = inject(I18nService);
    inject(PageTitle).show(computed(() => i18n.t('nav.favorites')));
    if (this.auth.can('library')) this.store.load();
  }

  protected open(item: PageItem): void {
    this.router.navigate(['/library', item.id], { state: { back: '/favorites' } });
  }
}
