import { Component, inject, output } from '@angular/core';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { Confirm, Icon, TAG_COLORS, TAG_SWATCH, UiButton, UiTag } from '../core/ui';
import { UiTip } from '../core/ui/tip/tip';
import { UiWindow } from '../core/ui/window';
import { Tag, TagsStore } from './tags.store';

/**
 * Desktop: the account's tags (the account's menu → Tags), in the shared window (as the search's):
 * its head — # and Tags; a row each: the tag, its colors as dots (the one it has ringed; a click
 * gives it that one), Delete (asked first: off its pages too). None yet: a word on where they're made.
 */
@Component({
  selector: 'app-tags-window',
  imports: [Icon, TranslatePipe, UiButton, UiTag, UiTip, UiWindow],
  template: `
    <ui-window (closed)="closed.emit()">
      <div class="flex h-12 shrink-0 items-center gap-3 px-4.5">
        <app-icon name="hash" class="size-5 shrink-0 text-icon" />
        <span class="flex-1 text-base text-fg">{{ 'tags.title' | t }}</span>
      </div>
      <div class="flex min-h-0 flex-1 flex-col overflow-y-auto px-3.5 pt-1 pb-3">
        @for (tag of store.tags(); track tag.id) {
          <div class="group flex min-h-10 items-center gap-3 rounded-xl px-2 hover:bg-tint">
            <ui-tag [color]="tag.color">{{ tag.name }}</ui-tag>
            <span class="flex-1"></span>
            <div class="flex items-center gap-1.5">
              @for (color of colors; track color) {
                <button
                  type="button"
                  (click)="recolor(tag, color)"
                  [attr.aria-pressed]="tag.color === color"
                  [attr.aria-label]="color"
                  class="size-4.5 rounded-full ring-fg/70 ring-offset-2 ring-offset-dialog aria-pressed:ring-2"
                  [class]="swatch[color]"
                ></button>
              }
            </div>
            <button
              uiButton
              type="button"
              icon="trash"
              (click)="remove(tag, $event)"
              [uiTip]="'tags.delete' | t"
              [attr.aria-label]="'tags.delete' | t"
            ></button>
          </div>
        } @empty {
          <p class="m-auto py-10 text-center text-ui text-fg-secondary">{{ 'tags.empty' | t }}</p>
        }
      </div>
    </ui-window>
  `,
})
export class TagsWindow {
  readonly closed = output<void>();

  protected readonly store = inject(TagsStore);
  private readonly confirm = inject(Confirm);
  private readonly i18n = inject(I18nService);
  protected readonly colors = TAG_COLORS;
  protected readonly swatch = TAG_SWATCH;

  constructor() {
    this.store.load();
  }

  protected recolor(tag: Tag, color: Tag['color']): void {
    if (tag.color !== color) this.store.update({ ...tag, color });
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
