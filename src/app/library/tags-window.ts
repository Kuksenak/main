import { afterRenderEffect, Component, ElementRef, inject, output, signal, viewChild } from '@angular/core';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { Confirm, Icon, TAG_COLORS, TAG_COLOR_LABELS, TAG_SWATCH, UiButton, UiTag } from '../core/ui';
import { UiMenu, UiMenuItem, UiMenuLabel, UiMenuSeparator } from '../core/ui/menu';
import { UiWindow } from '../core/ui/window';
import { Tag, TagsStore } from './tags.store';

/**
 * Desktop: the account's tags (the account's menu → Tags), in the shared window (as the search's),
 * a row each: the tag (a double click: renamed in place), ⋯ — its menu: Rename, its
 * colors, Delete (asked first: off its pages too).
 */
@Component({
  selector: 'app-tags-window',
  imports: [Icon, TranslatePipe, UiButton, UiMenu, UiMenuItem, UiMenuLabel, UiMenuSeparator, UiTag, UiWindow],
  templateUrl: './tags-window.html',
})
export class TagsWindow {
  readonly closed = output<void>();

  protected readonly store = inject(TagsStore);
  private readonly confirm = inject(Confirm);
  private readonly i18n = inject(I18nService);
  protected readonly colors = TAG_COLORS;
  protected readonly swatch = TAG_SWATCH;
  protected readonly colorLabel = TAG_COLOR_LABELS;

  // A tag's ⋯ menu, at its button
  protected readonly menuFor = signal<{ tag: Tag; at: HTMLElement } | null>(null);
  // The tag being renamed (a field in its chip's place)
  protected readonly renaming = signal<string | null>(null);
  private readonly name = viewChild<ElementRef<HTMLInputElement>>('name');

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
