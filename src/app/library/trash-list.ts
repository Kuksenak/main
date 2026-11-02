import { Component, computed, inject, input, model, output } from '@angular/core';
import { Router } from '@angular/router';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { Confirm, UiButton, UiEmpty, UiRow } from '../core/ui';
import { UiTip } from '../core/ui/tip/tip';
import { LibraryStore } from './library.store';

/**
 * The trash's pages (read as it's shown): each its name and when it was thrown away; Restore (back
 * in the library, then opened — `restored`: where it's shown closes) and Delete forever; Empty trash (`emptyAll`: where it's shown has it; both asked first, by the button). In the desktop's trash window (as the search's: its field
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
  private readonly confirm = inject(Confirm);
  private readonly router = inject(Router);
  readonly restored = output<void>();
  /** Only the pages whose names have these words (the desktop's window: its field). */
  readonly query = input('');
  /** The row the keys picked (the desktop's window: its field's ↑ ↓, ↵ restores it); null: none. */
  readonly index = model<number | null>(null);

  protected readonly shown = computed(() => {
    const words = this.query().trim().toLowerCase();
    const items = this.store.trash();
    return items && words ? items.filter((i) => i.title.toLowerCase().includes(words)) : items;
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

  /** Empty trash (asked first, at the button). */
  emptyAll(e: Event): void {
    this.deleteForever(null, e);
  }

  // (one page, or everything: null)
  protected async deleteForever(id: string | null, e: Event): Promise<void> {
    const yes = await this.confirm.ask(e.currentTarget as HTMLElement, {
      text: this.i18n.t(id ? 'trash.confirmOne' : 'trash.confirmAll'),
      yes: this.i18n.t(id ? 'trash.deleteForever' : 'trash.emptyAll'),
      danger: true,
    });
    if (yes) this.store.deleteForever(id);
  }

  // "26 Oct"
  protected when(at: string): string {
    return this.i18n.day(at);
  }
}
