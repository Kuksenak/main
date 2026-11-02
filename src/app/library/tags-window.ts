import { Component, computed, inject, output, signal } from '@angular/core';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { Confirm, Icon, TAG_COLORS, TAG_COLOR_LABELS, TAG_SWATCH, UiButton } from '../core/ui';
import { UiMenu, UiMenuItem } from '../core/ui/menu';
import { UiTip } from '../core/ui/tip/tip';
import { UiWindow } from '../core/ui/window';
import { LibraryStore } from './library.store';
import { Tag, TagsStore } from './tags.store';

/**
 * Desktop: the account's tags (the account's menu → Tags), in the shared window (as the search's):
 * its head — # and Tags; a row each, as Notion's: its color (a square — a click: the colors' menu),
 * its name (typed over right there), how many pages have it, Delete under the pointer (asked first:
 * off its pages too). None yet: a word on where they're made.
 */
@Component({
  selector: 'app-tags-window',
  imports: [Icon, TranslatePipe, UiButton, UiMenu, UiMenuItem, UiTip, UiWindow],
  template: `
    <ui-window (closed)="closed.emit()">
      <div class="flex h-12 shrink-0 items-center gap-3 px-4.5">
        <app-icon name="hash" class="size-5 shrink-0 text-icon" />
        <span class="flex-1 text-base text-fg">{{ 'tags.title' | t }}</span>
      </div>
      <div class="flex min-h-0 flex-1 flex-col overflow-y-auto px-3.5 pt-1 pb-3">
        @for (tag of store.tags(); track tag.id) {
          <div class="group flex h-10 shrink-0 items-center gap-2 rounded-xl px-2 hover:bg-tint">
            <!-- (its color: a square — its menu, the colors by name) -->
            <button
              #colorBtn
              type="button"
              (click)="colorsFor.set(colorsFor()?.tag?.id === tag.id ? null : { tag, at: colorBtn })"
              [attr.aria-expanded]="colorsFor()?.tag?.id === tag.id"
              [attr.aria-label]="'tags.color' | t"
              [uiTip]="'tags.color' | t"
              class="grid size-7 shrink-0 place-items-center rounded-button hover:bg-tint-strong aria-expanded:bg-tint-strong"
            >
              <span class="size-4 rounded-[0.3rem]" [class]="swatch[tag.color]"></span>
            </button>
            <!-- (its name, typed over right there: Enter or away — saved) -->
            <input
              #name
              type="text"
              maxlength="40"
              [value]="tag.name"
              (keydown.enter)="name.blur()"
              (keydown.escape)="name.value = tag.name; name.blur()"
              (blur)="rename(tag, name)"
              class="h-7 min-w-0 flex-1 rounded-md bg-transparent px-1.5 text-ui text-fg outline-none focus:bg-dialog focus:ring-1 focus:ring-separator"
            />
            <span class="shrink-0 text-footnote text-fg-secondary tabular-nums">{{ uses().get(tag.id) ?? 0 }}</span>
            <button
              uiButton
              type="button"
              icon="trash"
              (click)="remove(tag, $event)"
              [uiTip]="'tags.delete' | t"
              [attr.aria-label]="'tags.delete' | t"
              class="opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
            ></button>
          </div>
        } @empty {
          <p class="m-auto py-10 text-center text-ui text-fg-secondary">{{ 'tags.empty' | t }}</p>
        }
      </div>
    </ui-window>

    @if (colorsFor(); as c) {
      <ui-menu narrow [origin]="c.at" (closed)="colorsFor.set(null)">
        @for (color of colors; track color) {
          <button type="button" uiMenuItem [checked]="c.tag.color === color" (click)="recolor(c.tag, color)">
            <span class="flex items-center gap-2.5">
              <span class="size-4 shrink-0 rounded-[0.3rem]" [class]="swatch[color]"></span>
              {{ colorLabel[color] | t }}
            </span>
          </button>
        }
      </ui-menu>
    }
  `,
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

  // The tag whose colors' menu is open, at its square
  protected readonly colorsFor = signal<{ tag: Tag; at: HTMLElement } | null>(null);
  // How many pages have each
  protected readonly uses = computed(() => {
    const uses = new Map<string, number>();
    for (const page of this.library.items() ?? []) for (const id of page.tagIds ?? []) uses.set(id, (uses.get(id) ?? 0) + 1);
    return uses;
  });

  constructor() {
    this.store.load();
  }

  protected recolor(tag: Tag, color: Tag['color']): void {
    if (tag.color !== color) this.store.update({ ...tag, color });
  }

  protected rename(tag: Tag, field: HTMLInputElement): void {
    const name = field.value.trim();
    if (!name || name === tag.name || this.store.tags().some((t) => t.id !== tag.id && t.name.toLowerCase() === name.toLowerCase())) {
      field.value = tag.name;
      return;
    }
    this.store.update({ ...tag, name });
  }

  protected async remove(tag: Tag, e: Event): Promise<void> {
    const yes = await this.confirm.ask(e.currentTarget as HTMLElement, {
      text: this.i18n.t('tags.deleteAsk'),
      yes: this.i18n.t('tags.delete'),
      danger: true,
    });
    if (yes) this.store.remove(tag.id);
  }
}
