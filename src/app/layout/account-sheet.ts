import { Component, computed, inject, output, signal } from '@angular/core';
import { AuthStore } from '../auth/auth.store';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { UpdateService } from '../core/services/update.service';
import { Icon, UiCard, UiGlassButton, UiListRow, UiSheet } from '../core/ui';
import { UserCard } from '../users/user-card';
import { UsersList } from '../users/users-list';
import { User, UsersStore } from '../users/users.store';

type Page = 'language' | 'users' | 'user';

/**
 * Phones: the account (as the Claude app's) — a sheet from the bottom, a fixed height: the email;
 * Users (the admins only); the language (the current one in gray); at the bottom Update available
 * (when a new version is ready), Log out and Log out of all devices. A row with › opens its page
 * right in the sheet, sliding in (‹ back): the languages; the users — and a user tapped, their card.
 */
@Component({
  selector: 'app-account-sheet',
  imports: [Icon, TranslatePipe, UiCard, UiGlassButton, UiListRow, UiSheet, UserCard, UsersList],
  templateUrl: './account-sheet.html',
})
export class AccountSheet {
  readonly closed = output<void>();

  protected readonly auth = inject(AuthStore);
  protected readonly i18n = inject(I18nService);
  protected readonly updates = inject(UpdateService);
  protected readonly users = inject(UsersStore);

  // The pages open in the sheet, one over another (none: the account's list); ‹ goes one back
  protected readonly pages = signal<Page[]>([]);
  protected readonly page = computed(() => this.pages().at(-1) ?? null);
  // (back from one: the one under it slides in from the left)
  protected cameBack = false;

  // The user whose card is open (as now: their levels change as they're picked)
  private readonly userId = signal<string | null>(null);
  protected readonly user = computed(() => {
    const id = this.userId();
    return id ? (this.users.user(id) ?? null) : null;
  });

  protected readonly language = computed(() => this.i18n.languages.find((l) => l.code === this.i18n.lang())!.label);

  protected open(page: Page): void {
    this.cameBack = false;
    this.pages.update((pages) => [...pages, page]);
  }

  protected openUser(user: User): void {
    this.userId.set(user.id);
    this.open('user');
  }

  protected back(): void {
    this.cameBack = true;
    this.pages.update((pages) => pages.slice(0, -1));
  }

  /** The open page's name, in the middle over it. */
  protected readonly title = computed(() => {
    switch (this.page()) {
      case 'language':
        return this.i18n.t('account.language');
      case 'users':
        return this.i18n.t('users.title');
      case 'user': {
        const user = this.user();
        return user ? (this.users.name(user) ?? user.email) : '';
      }
      default:
        return '';
    }
  });
}
