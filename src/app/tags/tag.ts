import { Component, computed, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { Confirm, TAG_COLORS, tagColorLabel, tagTint, UiList, UiListItem, UiListTitle, UiOption, UiTagSwatch, UiWheel } from '../core/ui';
import { PageTitle } from '../layout/page-title';
import { LibraryStore } from '../library/library.store';
import { Tag, TagsStore } from '../library/tags.store';

/**
 * Phones: a tag's page (/tags/:id; ‹ back to the tags): its pages (a tap opens one), its color — a
 * wheel under its row, as the users' limits —, its name (a field), Delete at the bottom.
 */
@Component({
  selector: 'app-tag',
  imports: [TranslatePipe, UiList, UiListItem, UiListTitle, UiTagSwatch, UiWheel],
  templateUrl: './tag.html',
})
export class TagPage {
  /** The tag's id (the route's :id). */
  readonly id = input.required<string>();

  private readonly store = inject(TagsStore);
  private readonly library = inject(LibraryStore);
  private readonly router = inject(Router);
  private readonly i18n = inject(I18nService);
  private readonly confirm = inject(Confirm);

  protected readonly tag = computed(() => this.store.byId().get(this.id()) ?? null);
  protected readonly pages = computed(() => (this.library.items() ?? []).filter((p) => p.tagIds?.includes(this.id())));
  protected readonly colorLabel = tagColorLabel;
  protected readonly wheelOpen = signal(false);
  protected readonly colorOptions = computed<UiOption[]>(() => {
    this.i18n.lang();
    return TAG_COLORS.map((c) => ({ value: c, label: this.i18n.t(tagColorLabel(c)) }));
  });

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

  protected recolor(tag: Tag, color: string): void {
    this.store.recolor(tag, color as Tag['color']);
  }

  // (Enter or away: saved — not empty, not another tag's name; else back as it was)
  protected rename(tag: Tag, field: HTMLInputElement): void {
    if (!this.store.rename(tag, field.value)) field.value = tag.name;
  }

  protected async remove(tag: Tag, e: Event): Promise<void> {
    const text = this.store.deleteAsk(tag.id);
    if (text && !(await this.confirm.ask(e.currentTarget as HTMLElement, { text, yes: this.i18n.t('tags.delete'), danger: true }))) return;
    this.store.remove(tag.id);
    this.router.navigateByUrl('/tags');
  }
}
