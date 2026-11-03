import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { UiList, UiListItem, UiTagSwatch } from '../core/ui';
import { PageTitle } from '../layout/page-title';
import { LibraryStore } from '../library/library.store';
import { Tag, TagsStore } from '../library/tags.store';

/**
 * Phones: the tags, a section of their own (the top bar's menu, as Favorites) — as Reminders' lists:
 * a row each (its swatch, its name, how many pages have it, › — its pages). Edited on a desktop. None
 * yet: a word on where they're made.
 */
@Component({
  selector: 'app-tags',
  imports: [TranslatePipe, UiList, UiListItem, UiTagSwatch],
  templateUrl: './tags.html',
})
export class Tags {
  protected readonly store = inject(TagsStore);
  private readonly router = inject(Router);
  private readonly i18n = inject(I18nService);

  constructor() {
    inject(PageTitle).show(computed(() => this.i18n.t('tags.title')));
    this.store.load();
    inject(LibraryStore).load();
  }

  protected open(tag: Tag): void {
    this.router.navigate(['/tags', tag.id]);
  }
}
