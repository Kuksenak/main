import { afterNextRender, Component, computed, ElementRef, inject, input, output, signal, viewChild } from '@angular/core';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { Icon, TAG_SWATCH, tagChip, UiTag } from '../core/ui';
import { UiMenu, UiMenuItem, UiMenuSeparator } from '../core/ui/menu';
import { TagsStore } from './tags.store';

/**
 * Desktop: a page's tag picked at `origin`, as a choice of a few (the language's look): a field on
 * top — what's typed filters the tags; Enter picks the one by that name (any case), or makes it (its
 * color: the next one round) and picks it — then No tag and the tags (✓ the chosen one; a click picks
 * it — one a page, for now). `changed`: the page's tags now (one, or none).
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
  protected readonly query = signal('');
  protected readonly swatch = TAG_SWATCH;
  protected readonly chip = tagChip;
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

  // Enter: the tag by that name — there already, or made now — picked, the menu gone
  protected enter(): void {
    const name = this.query().trim();
    if (!name) return;
    const there = this.exact();
    if (there) {
      this.pick(there.id);
      this.menu().close();
      return;
    }
    this.store.create(name).subscribe((tag) => {
      this.pick(tag.id);
      this.menu().close();
    });
  }
}
