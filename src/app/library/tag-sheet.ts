import { Component, inject, input, output, viewChild } from '@angular/core';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { UiList, UiListItem, UiSheet, UiTagSwatch } from '../core/ui';
import { TagsStore } from './tags.store';

/**
 * Phones: a page's tag picked in a sheet of its own (from its ⋯ sheet's Tag row) — the tags as a plain
 * list: a swatch and the name, ✓ on its own; a tap puts it on (the one on it again: off) and the sheet
 * goes. `changed`: the page's tags now (one, or none).
 */
@Component({
  selector: 'app-tag-sheet',
  imports: [TranslatePipe, UiList, UiListItem, UiSheet, UiTagSwatch],
  template: `
    <ui-sheet (closed)="closed.emit()">
      <span sheetHead class="text-body font-semibold">{{ 'tags.title' | t }}</span>
      <ui-list>
        @for (tag of store.tags(); track tag.id) {
          @let on = tagIds().includes(tag.id);
          <button type="button" uiListItem [checked]="on" (click)="pick(on ? null : tag.id)" class="after:left-12!">
            <span class="flex min-w-0 items-center gap-3">
              <ui-tag-swatch [color]="tag.color" class="size-5" />
              <span class="truncate">{{ tag.name }}</span>
            </span>
          </button>
        }
      </ui-list>
    </ui-sheet>
  `,
})
export class TagSheet {
  readonly tagIds = input.required<readonly string[]>();
  readonly changed = output<string[]>();
  readonly closed = output<void>();

  protected readonly store = inject(TagsStore);
  private readonly sheet = viewChild.required(UiSheet);

  protected pick(id: string | null): void {
    this.changed.emit(id ? [id] : []);
    this.sheet().close();
  }
}
