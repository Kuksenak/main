import { Component, inject, output, signal } from '@angular/core';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { Confirm, Icon, TAG_COLORS, TAG_COLOR_LABELS, TAG_SWATCH, tagChip, UiButton } from '../core/ui';
import { UiMenu, UiMenuItem, UiMenuLabel, UiMenuSeparator } from '../core/ui/menu';
import { UiWindow } from '../core/ui/window';
import { Tag, TagsStore } from './tags.store';

/**
 * Desktop: the account's tags (the account's menu → Tags), in the shared window (as the search's),
 * a row each, the whole of it in its color: its name a field (typed over right there), ⋯ — its menu: its
 * colors, Delete (asked first: off its pages too).
 */
@Component({
  selector: 'app-tags-window',
  imports: [Icon, TranslatePipe, UiButton, UiMenu, UiMenuItem, UiMenuLabel, UiMenuSeparator, UiWindow],
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
  protected readonly chip = tagChip;

  // A tag's ⋯ menu, at its button
  protected readonly menuFor = signal<{ tag: Tag; at: HTMLElement } | null>(null);

  constructor() {
    this.store.load();
  }

  protected recolor(tag: Tag, color: Tag['color']): void {
    if (tag.color !== color) this.store.update({ ...tag, color });
  }

  // (Enter or away: saved — not empty, not another tag's name)
  protected rename(tag: Tag, field: HTMLInputElement): void {
    const name = field.value.trim();
    if (!name || name === tag.name || this.store.tags().some((t) => t.id !== tag.id && t.name.toLowerCase() === name.toLowerCase())) {
      field.value = tag.name;
      return;
    }
    this.store.update({ ...tag, name });
  }

  protected async remove(tag: Tag, at: HTMLElement): Promise<void> {
    const yes = await this.confirm.ask(at, { text: this.i18n.t('tags.deleteAsk'), yes: this.i18n.t('tags.delete'), danger: true });
    if (yes) this.store.remove(tag.id);
  }
}
