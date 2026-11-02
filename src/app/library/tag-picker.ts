import { afterNextRender, Component, computed, ElementRef, inject, input, output, signal, viewChild } from '@angular/core';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { TranslationKey } from '../core/i18n/translations';
import { Icon, UiTag } from '../core/ui';
import { UiMenu, UiMenuItem, UiMenuSeparator } from '../core/ui/menu';
import { TagsStore } from './tags.store';

/**
 * Desktop: a tag picked at `origin` — a page's, or the library's filter — as a choice of a few (the
 * language's look): a field on top — what's typed filters the tags; Enter picks the one by that name
 * (any case), or (`creatable`: a page's) makes it (its color: the next one round) and picks it — then
 * the none's row (`none`: No tag / All tags) and the tags (a swatch and the name, as the menu's rows:
 * ✓ the chosen one; a click picks it — one, for now). `changed`: the tags now (one, or none).
 */
@Component({
  selector: 'app-tag-picker',
  imports: [Icon, TranslatePipe, UiMenu, UiMenuItem, UiMenuSeparator, UiTag],
  templateUrl: './tag-picker.html',
})
export class TagPicker {
  readonly origin = input.required<HTMLElement>();
  readonly tagIds = input.required<readonly string[]>();
  /** A new tag made by a name none has (off: only the account's tags to pick). */
  readonly creatable = input(true);
  /** The row for none of them. */
  readonly none = input<TranslationKey>('tags.noTag');
  /** A No tag row too (the library's filter: the pages with none; null: no such row) — picked: `untaggedPicked`. */
  readonly untagged = input<boolean | null>(null);
  readonly changed = output<string[]>();
  readonly untaggedPicked = output<void>();
  readonly closed = output<void>();

  protected readonly store = inject(TagsStore);
  protected readonly query = signal('');
  private readonly words = computed(() => this.query().trim().toLowerCase());
  // The tags with what's typed in their names; the one named just so
  protected readonly shown = computed(() => this.store.tags().filter((t) => t.name.toLowerCase().includes(this.words())));
  protected readonly exact = computed(() => this.store.tags().find((t) => t.name.toLowerCase() === this.words()) ?? null);

  private readonly menu = viewChild.required(UiMenu);
  private readonly field = viewChild<ElementRef<HTMLInputElement>>('field');

  constructor() {
    this.store.load();
    afterNextRender(() => setTimeout(() => this.field()?.nativeElement.focus()));
  }

  protected pick(id: string | null): void {
    this.changed.emit(id ? [id] : []);
  }

  // Enter: the tag by that name — there already, or made now (not creatable: the first one found) —
  // picked, the menu gone
  protected enter(): void {
    const name = this.query().trim();
    if (!name) return;
    const there = this.exact() ?? (this.creatable() ? null : this.shown()[0]);
    if (there) {
      this.pick(there.id);
      this.menu().close();
      return;
    }
    if (!this.creatable()) return;
    this.store.create(name).subscribe((tag) => {
      this.pick(tag.id);
      this.menu().close();
    });
  }
}
