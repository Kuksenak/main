import { afterRenderEffect, Component, computed, ElementRef, inject, output, signal, viewChild } from '@angular/core';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { Confirm, Icon, TAG_COLORS, TAG_COLOR_LABELS, TAG_SWATCH, UiButton, UiTag } from '../core/ui';
import { UiMenu, UiMenuItem } from '../core/ui/menu';
import { UiWindow } from '../core/ui/window';
import { LibraryStore } from './library.store';
import { Tag, TagsStore } from './tags.store';

/**
 * Desktop: the account's tags (the account's menu → Tags), in the shared window (as the search's),
 * as a table (as Notion's properties): Tag, Color (its menu), Pages (how many have it), ⋯ — Rename
 * (a field in its place), Delete (asked first: off its pages too).
 */
@Component({
  selector: 'app-tags-window',
  imports: [Icon, TranslatePipe, UiButton, UiMenu, UiMenuItem, UiTag, UiWindow],
  templateUrl: './tags-window.html',
})
export class TagsWindow {
  readonly closed = output<void>();

  protected readonly store = inject(TagsStore);
  private readonly library = inject(LibraryStore);
  private readonly confirm = inject(Confirm);
  private readonly i18n = inject(I18nService);
  protected readonly colors = TAG_COLORS;
  protected readonly swatch = TAG_SWATCH;
  protected readonly colorLabel = TAG_COLOR_LABELS;

  // The menus open: a tag's colors, a tag's ⋯ — at their buttons
  protected readonly colorsFor = signal<{ tag: Tag; at: HTMLElement } | null>(null);
  protected readonly menuFor = signal<{ tag: Tag; at: HTMLElement } | null>(null);
  // The tag being renamed (a field in its chip's place)
  protected readonly renaming = signal<string | null>(null);
  private readonly name = viewChild<ElementRef<HTMLInputElement>>('name');

  // How many pages have each
  protected readonly uses = computed(() => {
    const uses = new Map<string, number>();
    for (const page of this.library.items() ?? []) for (const id of page.tagIds ?? []) uses.set(id, (uses.get(id) ?? 0) + 1);
    return uses;
  });

  constructor() {
    this.store.load();
    // (Rename: the field focused, its name selected)
    afterRenderEffect(() => {
      if (this.renaming()) this.name()?.nativeElement.select();
    });
  }

  protected recolor(tag: Tag, color: Tag['color']): void {
    if (tag.color !== color) this.store.update({ ...tag, color });
  }

  protected startRename(tag: Tag): void {
    this.renaming.set(tag.id);
  }

  // (Enter or away: saved — not empty, not another tag's name)
  protected rename(tag: Tag, field: HTMLInputElement): void {
    this.renaming.set(null);
    const name = field.value.trim();
    if (!name || name === tag.name || this.store.tags().some((t) => t.id !== tag.id && t.name.toLowerCase() === name.toLowerCase())) return;
    this.store.update({ ...tag, name });
  }

  protected async remove(tag: Tag, at: HTMLElement): Promise<void> {
    const yes = await this.confirm.ask(at, { text: this.i18n.t('tags.deleteAsk'), yes: this.i18n.t('tags.delete'), danger: true });
    if (yes) this.store.remove(tag.id);
  }
}
