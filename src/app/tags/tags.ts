import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { Confirm, TAG_COLORS, tagColorLabel, UiList, UiListItem, UiTagSwatch } from '../core/ui';
import { PageTitle } from '../layout/page-title';
import { LibraryStore } from '../library/library.store';
import { Tag, TagsStore } from '../library/tags.store';

/**
 * Phones: the tags, a section of their own (the top bar's menu, as Favorites) — as Reminders' lists:
 * a row each (its swatch, its name, how many pages have it, › — its pages). Edit at the top bar's
 * right: each row its own — – (Delete), its swatch (a tap: its colors, the system's menu), its name
 * a field; Done: back as it was. None yet: a word on where they're made.
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
  private readonly confirm = inject(Confirm);
  protected readonly colors = TAG_COLORS;
  protected readonly colorLabel = tagColorLabel;
  // Edit (the top bar's word): the rows their own
  protected readonly editing = signal(false);

  constructor() {
    const title = inject(PageTitle);
    title.show(computed(() => this.i18n.t('tags.title')));
    title.word(
      computed(() => this.i18n.t(this.editing() ? 'action.done' : 'action.edit')),
      () => this.editing.update((e) => !e),
    );
    this.store.load();
    inject(LibraryStore).load();
  }

  protected open(tag: Tag): void {
    this.router.navigate(['/tags', tag.id]);
  }

  // – : deleted (asked first when it's on pages: off them too)
  protected async remove(tag: Tag, e: Event): Promise<void> {
    const text = this.store.deleteAsk(tag.id);
    if (text && !(await this.confirm.ask(e.currentTarget as HTMLElement, { text, yes: this.i18n.t('tags.delete'), danger: true }))) return;
    this.store.remove(tag.id);
  }
}
