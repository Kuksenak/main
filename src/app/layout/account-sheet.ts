import { Component, inject, output } from '@angular/core';
import { AuthStore } from '../auth/auth.store';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { UpdateService } from '../core/services/update.service';
import { Icon, UiCard, UiListRow, UiSheet } from '../core/ui';

/**
 * Phones: the account (as the Claude app's) — a sheet from the bottom, a fixed height: the email;
 * the languages right in it (the current one ✓, a tap switches); at the bottom Update available
 * (when a new version is ready), Log out and Log out of all devices.
 */
@Component({
  selector: 'app-account-sheet',
  imports: [Icon, TranslatePipe, UiCard, UiListRow, UiSheet],
  templateUrl: './account-sheet.html',
})
export class AccountSheet {
  readonly closed = output<void>();

  protected readonly auth = inject(AuthStore);
  protected readonly i18n = inject(I18nService);
  protected readonly updates = inject(UpdateService);
}
