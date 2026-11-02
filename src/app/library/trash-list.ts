import { Component, computed, inject, input, model, output } from '@angular/core';
import { Router } from '@angular/router';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { UiButton, UiEmpty, UiRow } from '../core/ui';
import { UiTip } from '../core/ui/tip/tip';
import { LibraryStore } from './library.store';

/**
 * The trash's pages (read as it's shown): each its name and when it was thrown away; Restore (back
 * in the library, then opened — `restored`: where it's shown closes) and Delete forever (asked first, by the button; Empty trash: where it's shown has it — the store's `askDeleteForever(null, …)`). In the desktop's trash window (as the search's: its field
 * filters them, its foot has Empty trash) and the phones' sheet (the account's Trash row).
 */
@Component({
  selector: 'app-trash-list',
  imports: [TranslatePipe, UiButton, UiEmpty, UiRow, UiTip],
  templateUrl: './trash-list.html',
})
export class TrashList {
  protected readonly store = inject(LibraryStore);
  private readonly i18n = inject(I18nService);
  private readonly router = inject(Router);
  readonly restored = output<void>();
  /** Only the pages whose names have these words (the desktop's window: its field). */
  readonly query = input('');
  /** The row the keys picked (the desktop's window: its field's ↑ ↓, ↵ restores it); null: none. */
  readonly index = model<number | null>(null);

  protected readonly shown = computed(() => {
    const words = this.i18n.lower(this.query().trim());
    const items = this.store.trash();
    return items && words ? items.filter((i) => this.i18n.lower(i.title).includes(words)) : items;
  });

  /** How many rows are shown (the keys go round them). */
  readonly count = computed(() => this.shown()?.length ?? 0);

  /** The row the keys picked, restored (↵). */
  restoreAt(i: number): void {
    const item = this.shown()?.[i];
    if (item) this.restore(item.id);
  }

  protected restore(id: string): void {
    this.store.restore(id, () => {
      this.restored.emit();
      this.router.navigate(['/library', id]);
    });
  }

  constructor() {
    this.store.loadTrash();
  }

  // (asked first, at its button)
  protected deleteForever(id: string, e: Event): void {
    this.store.askDeleteForever(id, e.currentTarget as HTMLElement);
  }

  // "26 Oct"
  protected when(at: string): string {
    return this.i18n.day(at);
  }
}
