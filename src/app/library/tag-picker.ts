import { Component, inject, input, output, signal, viewChild } from '@angular/core';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { TranslationKey } from '../core/i18n/translations';
import { Icon, TAG_COLORS, TagColor, UiTag } from '../core/ui';
import { UiMenu, UiMenuItem, UiMenuSeparator } from '../core/ui/menu';
import { Tag, TagsStore } from './tags.store';

/**
 * Desktop: a page's tag picked at `origin`, as a choice of a few (the language's look): No tag, the
 * account's tags (✓ the chosen one); a click picks it (one a page, for now). A field at the bottom:
 * a new name, Enter — made in the next color and picked. A tag's ⋯ (under the pointer): its colors
 * (a dot each) and Delete under it. `changed`: the page's tags now (one, or none).
 */
@Component({
  selector: 'app-tag-picker',
  imports: [Icon, TranslatePipe, UiMenu, UiMenuItem, UiMenuSeparator, UiTag],
  templateUrl: './tag-picker.html',
})
export class TagPicker {
  readonly origin = input.required<HTMLElement>();
  readonly tagIds = input.required<readonly string[]>();
  readonly changed = output<string[]>();
  readonly closed = output<void>();

  protected readonly store = inject(TagsStore);
  protected readonly colors = TAG_COLORS;
  // (a color's dot: its pastel, whole classes for Tailwind)
  protected readonly dot: Record<TagColor, string> = {
    gray: 'bg-tag-gray',
    brown: 'bg-tag-brown',
    orange: 'bg-tag-orange',
    yellow: 'bg-tag-yellow',
    green: 'bg-tag-green',
    blue: 'bg-tag-blue',
    purple: 'bg-tag-purple',
    pink: 'bg-tag-pink',
    red: 'bg-tag-red',
  };
  protected readonly colorLabel: Record<TagColor, TranslationKey> = {
    gray: 'tags.gray',
    brown: 'tags.brown',
    orange: 'tags.orange',
    yellow: 'tags.yellow',
    green: 'tags.green',
    blue: 'tags.blue',
    purple: 'tags.purple',
    pink: 'tags.pink',
    red: 'tags.red',
  };
  // The tag whose ⋯ was clicked: its colors and Delete under it
  protected readonly editing = signal<string | null>(null);
  private readonly menu = viewChild.required(UiMenu);

  constructor() {
    this.store.load();
  }

  protected pick(id: string | null): void {
    this.changed.emit(id ? [id] : []);
  }

  protected create(name: string): void {
    if (!name.trim()) return;
    this.store.create(name).subscribe((tag) => {
      this.changed.emit([tag.id]);
      this.menu().close();
    });
  }

  protected recolor(tag: Tag, color: TagColor): void {
    this.store.update({ ...tag, color });
  }

  protected remove(tag: Tag): void {
    this.store.remove(tag.id);
    if (this.tagIds().includes(tag.id)) this.changed.emit([]);
    this.editing.set(null);
  }
}
