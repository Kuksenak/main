import { Component, computed, ElementRef, inject, linkedSignal, output, signal, viewChildren } from '@angular/core';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { Confirm, TAG_COLORS, tagColorLabel, UiButton, UiEmpty, UiRow, UiTag } from '../core/ui';
import { UiTip } from '../core/ui/tip/tip';
import { UiListKeys, UiWindow, UiWindowField, UiWindowFoot, UiWindowHead, UiWindowKey } from '../core/ui/window';
import { Tag, TagsStore } from './tags.store';

/**
 * Desktop: the account's tags (the account's menu → Tags), in the shared window, as the search's:
 * the field at the top filters them, ↵ makes one by what's typed (its color: the next one round);
 * a row each — its swatch (a click: its colors under it), its name a field (typed over right there),
 * Delete under the pointer (asked first when it's on pages: how many it comes off).
 */
@Component({
  selector: 'app-tags-window',
  imports: [TranslatePipe, UiButton, UiEmpty, UiRow, UiTag, UiTip, UiListKeys, UiWindow, UiWindowField, UiWindowFoot, UiWindowHead, UiWindowKey],
  templateUrl: './tags-window.html',
})
export class TagsWindow {
  readonly closed = output<void>();

  protected readonly store = inject(TagsStore);
  private readonly confirm = inject(Confirm);
  private readonly i18n = inject(I18nService);
  protected readonly colors = TAG_COLORS;
  protected readonly colorLabel = tagColorLabel;

  protected readonly query = signal('');
  private readonly words = computed(() => this.query().trim().toLowerCase());
  // The tags with what's typed in their names; the one named just so
  protected readonly shown = computed(() => this.store.tags().filter((t) => t.name.toLowerCase().includes(this.words())));
  protected readonly exact = computed(() => this.store.tags().find((t) => t.name.toLowerCase() === this.words()) ?? null);
  protected readonly canCreate = computed(() => !!this.words() && !this.exact());

  // The rows the keys go round (the tags shown, then Create), and the picked one — a new query:
  // Create if it's there, else the first
  protected readonly rows = computed(() => this.shown().length + (this.canCreate() ? 1 : 0));
  protected readonly index = linkedSignal<string, number | null>({
    source: this.words,
    computation: () => (this.canCreate() ? this.shown().length : 0),
  });
  private readonly names = viewChildren<ElementRef<HTMLInputElement>>('name');

  // The tag whose colors are open under it
  protected readonly paletteFor = signal<string | null>(null);


  constructor() {
    this.store.load();
  }

  // ↵ on a row: a tag — its name to type over; Create — made
  protected choose(i: number): void {
    const name = this.names()[i]?.nativeElement;
    if (name) name.select();
    else this.create();
  }

  // A tag by what's typed, unless there's one by that name already
  protected create(): void {
    const name = this.query().trim();
    if (!name || this.exact()) return;
    this.store.create(name).subscribe(() => this.query.set(''));
  }

  protected recolor(tag: Tag, color: Tag['color']): void {
    this.paletteFor.set(null);
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

  // On no page: gone at once; else asked first, saying how many pages it comes off
  protected async remove(tag: Tag, e: Event): Promise<void> {
    const text = this.store.deleteAsk(tag.id);
    if (text) {
      const yes = await this.confirm.ask(e.currentTarget as HTMLElement, { text, yes: this.i18n.t('tags.delete'), danger: true });
      if (!yes) return;
    }
    this.store.remove(tag.id);
  }
}
