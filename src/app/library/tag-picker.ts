import { afterRenderEffect, Component, computed, ElementRef, inject, input, output, signal, viewChild } from '@angular/core';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { TranslationKey } from '../core/i18n/translations';
import { Icon, TAG_COLORS, TagColor, UiButton, UiTag } from '../core/ui';
import { UiMenu } from '../core/ui/menu';
import { Tag, TagsStore } from './tags.store';

/** A row under the field: a tag, or Create (what's typed, as a new one). */
interface Option {
  key: string;
  tag?: Tag;
}

/**
 * Desktop: a page's tags picked at `origin` (as Notion's) — the chosen ones in a field, what's typed
 * filters the account's tags under it; a click (or Enter) puts one on — one a page, for now: it
 * replaces the one there — or takes it off; a new name: Create (made in the next color, put on). A tag's ⋯: its name, its color, Delete. `changed`: the
 * page's tags now (the ids, in order).
 */
@Component({
  selector: 'app-tag-picker',
  imports: [Icon, TranslatePipe, UiButton, UiMenu, UiTag],
  templateUrl: './tag-picker.html',
})
export class TagPicker {
  readonly origin = input.required<HTMLElement>();
  readonly tagIds = input.required<readonly string[]>();
  readonly changed = output<string[]>();
  readonly closed = output<void>();

  protected readonly store = inject(TagsStore);
  protected readonly colors = TAG_COLORS;
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

  protected readonly query = signal('');
  protected readonly index = signal(0);
  protected readonly editing = signal<Tag | null>(null);
  protected readonly chosen = computed(() => this.store.of(this.tagIds()));
  protected readonly nextColor = computed(() => TAG_COLORS[this.store.tags().length % TAG_COLORS.length]);

  // The account's tags with what's typed in their names; a name none has: Create, last
  protected readonly options = computed<Option[]>(() => {
    const typed = this.query().trim();
    const words = typed.toLowerCase();
    const tags = this.store.tags().filter((t) => !words || t.name.toLowerCase().includes(words));
    const options: Option[] = tags.map((tag) => ({ key: tag.id, tag }));
    if (typed && !this.store.tags().some((t) => t.name.toLowerCase() === words)) options.push({ key: '+' });
    return options;
  });

  private readonly field = viewChild<ElementRef<HTMLInputElement>>('field');
  private readonly name = viewChild<ElementRef<HTMLInputElement>>('name');

  constructor() {
    this.store.load();
    // (open, or back from a tag's own: the field focused; a tag's own: its name)
    afterRenderEffect(() => {
      if (this.editing()) this.name()?.nativeElement.focus();
      else this.field()?.nativeElement.focus();
    });
  }

  protected isChosen(tag: Tag): boolean {
    return this.tagIds().includes(tag.id);
  }

  // (one tag a page, for now — its icon's color: picking one replaces it; the chosen one again: none)
  protected toggle(tag: Tag): void {
    this.changed.emit(this.tagIds().includes(tag.id) ? [] : [tag.id]);
  }

  protected pickOption(option: Option): void {
    if (option.tag) this.toggle(option.tag);
    else this.createTyped();
    this.query.set('');
    this.index.set(0);
    this.field()?.nativeElement.focus();
  }

  private createTyped(): void {
    const name = this.query().trim();
    if (!name) return;
    this.store.create(name).subscribe((tag) => this.changed.emit([tag.id]));
  }

  protected key(e: KeyboardEvent): void {
    const n = this.options().length;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();
      if (n) this.index.set((this.index() + (e.key === 'ArrowDown' ? 1 : n - 1)) % n);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const option = this.options()[this.index()];
      if (option) this.pickOption(option);
    } else if (e.key === 'Backspace' && !this.query()) {
      const last = this.chosen().at(-1);
      if (last) this.toggle(last);
    }
  }

  protected rename(tag: Tag, name: string): void {
    const trimmed = name.trim();
    if (!trimmed || trimmed === tag.name) return;
    const renamed = { ...tag, name: trimmed };
    this.store.update(renamed);
    this.editing.set(renamed);
  }

  protected recolor(tag: Tag, color: TagColor): void {
    const recolored = { ...tag, color };
    this.store.update(recolored);
    this.editing.set(recolored);
  }

  protected remove(tag: Tag): void {
    this.store.remove(tag.id);
    if (this.isChosen(tag)) this.changed.emit(this.tagIds().filter((id) => id !== tag.id));
    this.editing.set(null);
  }
}
