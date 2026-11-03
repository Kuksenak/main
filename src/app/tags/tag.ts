import { Component, computed, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { tagTint, UiList, UiListItem } from '../core/ui';
import { PageTitle } from '../layout/page-title';
import { LibraryStore } from '../library/library.store';
import { Tag, TagsStore } from '../library/tags.store';

/**
 * Phones: a tag's pages (/tags/:id; ‹ back to the tags) — their icons in its pastel; a tap opens one
 * (‹ from it: back here). Its name, color and Delete: the tags' Edit.
 */
@Component({
  selector: 'app-tag',
  imports: [TranslatePipe, UiList, UiListItem],
  templateUrl: './tag.html',
})
export class TagPage {
  /** The tag's id (the route's :id). */
  readonly id = input.required<string>();

  private readonly store = inject(TagsStore);
  private readonly library = inject(LibraryStore);
  private readonly router = inject(Router);

  protected readonly tag = computed(() => this.store.byId().get(this.id()) ?? null);
  protected readonly pages = computed(() => (this.library.items() ?? []).filter((p) => p.tagIds?.includes(this.id())));

  constructor() {
    this.store.load();
    this.library.load();
    inject(PageTitle).show(computed(() => this.tag()?.name ?? ''), '/tags');
  }

  protected tint(tag: Tag): string | null {
    return tagTint(tag.color);
  }

  protected openPage(id: string): void {
    this.router.navigate(['/library', id], { state: { back: `/tags/${this.id()}` } });
  }
}
