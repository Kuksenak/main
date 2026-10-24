import { Component, computed, inject, output, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthStore } from '../auth/auth.store';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { UpdateService } from '../core/services/update.service';
import { Icon, UiCard, UiGlassButton, UiListRow, UiSheet } from '../core/ui';

/**
 * Phones: the account (as the Claude app's) — a sheet from the bottom, a fixed height: the email;
 * Admin (the admins only: to the admin page); the language (the current one in gray, ›: its list
 * slides in on a page of its own, ‹ back); at the bottom Update available (when a new
 * version is ready), Log out and Log out of all devices.
 */
@Component({
  selector: 'app-account-sheet',
  imports: [Icon, TranslatePipe, UiCard, UiGlassButton, UiListRow, UiSheet],
  templateUrl: './account-sheet.html',
})
export class AccountSheet {
  readonly closed = output<void>();

  protected readonly auth = inject(AuthStore);
  protected readonly i18n = inject(I18nService);
  protected readonly updates = inject(UpdateService);

  // The page open in the sheet (none: the list); back from one, the list slides in from the left
  protected readonly page = signal<'language' | null>(null);
  protected cameBack = false;

  private readonly router = inject(Router);

  // (to another page: the sheet goes)
  protected go(path: string, sheet: UiSheet): void {
    this.router.navigateByUrl(path);
    sheet.close();
  }

  protected readonly language = computed(() => this.i18n.languages.find((l) => l.code === this.i18n.lang())!.label);

  protected back(): void {
    this.cameBack = true;
    this.page.set(null);
  }
}
