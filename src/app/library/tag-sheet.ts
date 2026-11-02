import { Component, inject, input, output, viewChild } from '@angular/core';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { UiList, UiListItem, UiSheet, UiTag } from '../core/ui';
import { TagsStore } from './tags.store';

/**
 * Phones: a page's tag picked in a sheet (as iOS's lists) — No tag, then the account's tags (the
 * chosen one ✓); a tap picks it and the sheet goes. On top, a field: a new tag's name, Enter makes
 * it (the next color) and picks it. `changed`: the page's tags now (one, or none).
 */
@Component({
  selector: 'app-tag-sheet',
  imports: [TranslatePipe, UiList, UiListItem, UiSheet, UiTag],
  template: `
    <ui-sheet #sheet (closed)="closed.emit()">
      <span sheetHead class="text-body font-semibold">{{ 'tags.title' | t }}</span>
      <div class="flex flex-col gap-6">
        <ui-list>
          <div uiListItem icon="hash">
            <input
              #name
              type="text"
              maxlength="40"
              enterkeyhint="done"
              autocomplete="off"
              [placeholder]="'tags.new' | t"
              (keydown.enter)="create(name.value); name.blur()"
              class="w-full bg-transparent text-body text-fg outline-none placeholder:text-fg-secondary"
            />
          </div>
        </ui-list>
        <ui-list>
          <button type="button" uiListItem [checked]="!tagIds().length" (click)="pick(null)">{{ 'tags.noTag' | t }}</button>
          @for (tag of store.tags(); track tag.id) {
            <button type="button" uiListItem [checked]="tagIds().includes(tag.id)" (click)="pick(tag.id)">
              <ui-tag [color]="tag.color">{{ tag.name }}</ui-tag>
            </button>
          }
        </ui-list>
      </div>
    </ui-sheet>
  `,
})
export class TagSheet {
  readonly tagIds = input.required<readonly string[]>();
  readonly changed = output<string[]>();
  readonly closed = output<void>();

  protected readonly store = inject(TagsStore);
  private readonly sheet = viewChild.required(UiSheet);

  constructor() {
    this.store.load();
  }

  protected pick(id: string | null): void {
    this.changed.emit(id ? [id] : []);
    this.sheet().close();
  }

  protected create(name: string): void {
    if (!name.trim()) return;
    this.store.create(name).subscribe((tag) => this.pick(tag.id));
  }
}
