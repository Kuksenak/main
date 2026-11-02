import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { UiList, UiListItem } from '../core/ui';
import { PageTitle } from '../layout/page-title';
import { LibraryStore } from '../library/library.store';
import { Tag, TagsStore } from '../library/tags.store';

/**
 * Phones: the tags, a section of their own (the top bar's menu, as Favorites): a row each — its
 * color's swatch, its name, how many pages have it, › — its page (Tag: its pages, its color, its
 * name, Delete). None yet: a word on where they're made.
 */
@Component({
  selector: 'app-tags',
  imports: [TranslatePipe, UiList, UiListItem],
  template: `
    <div class="flex flex-col gap-2 px-4 pt-2 pb-24">
      <ui-list>
        @for (tag of store.tags(); track tag.id) {
          <button type="button" uiListItem chevron (click)="open(tag)">
            <span class="flex min-w-0 items-center gap-3">
              <span [attr.data-tag]="tag.color" class="size-5 shrink-0 rounded-md bg-tag"></span>
              <span class="truncate">{{ tag.name }}</span>
            </span>
            <span itemValue class="text-fg-secondary tabular-nums">{{ store.pagesWith(tag.id) ?? '' }}</span>
          </button>
        } @empty {
          <div uiListItem><span class="text-fg-secondary">{{ 'tags.empty' | t }}</span></div>
        }
      </ui-list>
    </div>
  `,
})
export class Tags {
  protected readonly store = inject(TagsStore);
  private readonly router = inject(Router);

  constructor() {
    const i18n = inject(I18nService);
    inject(PageTitle).show(computed(() => i18n.t('tags.title')));
    this.store.load();
    inject(LibraryStore).load();
  }

  protected open(tag: Tag): void {
    this.router.navigate(['/tags', tag.id]);
  }
}
