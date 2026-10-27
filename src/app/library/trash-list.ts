import { Component, inject, output } from '@angular/core';
import { Router } from '@angular/router';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { Confirm, Icon, UiButton } from '../core/ui';
import { UiTip } from '../core/ui/tip/tip';
import { LibraryStore } from './library.store';

/**
 * The trash's pages (read as it's shown): each its name and when it was thrown away; Restore (back
 * in the library, then opened — `restored`: where it's shown closes) and Delete forever; Empty trash under them (both asked first, by the button). In the desktop's trash window and the
 * phones' sheet (the library's Trash row).
 */
@Component({
  selector: 'app-trash-list',
  imports: [Icon, TranslatePipe, UiButton, UiTip],
  templateUrl: './trash-list.html',
})
export class TrashList {
  protected readonly store = inject(LibraryStore);
  private readonly i18n = inject(I18nService);
  private readonly confirm = inject(Confirm);
  private readonly router = inject(Router);
  readonly restored = output<void>();

  protected restore(id: string): void {
    this.store.restore(id, () => {
      this.restored.emit();
      this.router.navigate(['/library', id]);
    });
  }

  constructor() {
    this.store.loadTrash();
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
    return this.i18n.date(new Date(at), { day: 'numeric', month: 'short' });
  }
}
