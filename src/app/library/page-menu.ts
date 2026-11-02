import { Component, inject, input, output } from '@angular/core';
import { Router } from '@angular/router';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { UiMenu, UiMenuItem, UiMenuSeparator } from '../core/ui/menu';
import { LibraryStore, PageItem } from './library.store';

/**
 * Desktop: a page's ⋯ menu where it's listed (the sidebar, the library), as Notion's — 🔖 in the
 * favorites or not; Duplicate (the copy opened); Move to trash (the page open: back to the
 * library); when it was edited. Opens at `origin`; `closed` as it goes (an action picked too).
 */
@Component({
  selector: 'app-page-menu',
  imports: [TranslatePipe, UiMenu, UiMenuItem, UiMenuSeparator],
  template: `
    <ui-menu narrow [origin]="origin()" (closed)="closed.emit()">
      <button type="button" uiMenuItem icon="bookmark" (click)="favorite()">
        {{ (page().favorite ? 'library.unfavorite' : 'library.favorite') | t }}
      </button>
      <button type="button" uiMenuItem icon="duplicate" (click)="duplicate()">{{ 'library.duplicate' | t }}</button>
      <ui-menu-separator />
      <button type="button" uiMenuItem icon="trash" danger (click)="trash()">{{ 'library.moveToTrash' | t }}</button>
      <ui-menu-separator />
      <div class="px-menu-label-x py-1 text-caption text-fg-secondary">{{ 'library.edited' | t }} {{ edited() }}</div>
    </ui-menu>
  `,
})
export class PageMenu {
  readonly page = input.required<PageItem>();
  readonly origin = input.required<HTMLElement>();
  readonly closed = output<void>();

  private readonly store = inject(LibraryStore);
  private readonly router = inject(Router);
  private readonly i18n = inject(I18nService);

  protected favorite(): void {
    this.closed.emit();
    this.store.favorite(this.page().id, !this.page().favorite).subscribe();
  }

  protected duplicate(): void {
    this.closed.emit();
    this.store.duplicate(this.page().id, this.page().title);
  }

  protected trash(): void {
    this.closed.emit();
    const id = this.page().id;
    this.store.delete(id, () => {
      if (this.router.url === `/library/${id}`) this.router.navigateByUrl('/library');
    });
  }

  // "26 Oct, 15:02"
  protected edited(): string {
    return this.i18n.day(this.page().updatedAt, true);
  }
}
