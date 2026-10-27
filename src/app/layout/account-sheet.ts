import { Component, computed, inject, output, signal } from '@angular/core';
import { environment } from '@environments/environment';
import { AuthStore } from '../auth/auth.store';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { Slide } from '../core/services/slide';
import { UpdateService } from '../core/services/update.service';
import { Icon, UiList, UiFloatingButton, UiListItem, UiSheet } from '../core/ui';
import { UserCard } from '../users/user-card';
import { UsersList } from '../users/users-list';
import { TrashList } from '../library/trash-list';
import type { User } from '../users/users.store';

type Page = 'language' | 'users' | 'user' | 'trash';

/**
 * Phones: the account (as the Claude app's) — a sheet from the bottom, a fixed height: the email;
 * Users (the admins only), Trash (those who can read the library); the language (the current one in gray); at the bottom Update available
 * (when a new version is ready), Log out and Log out of all devices. A row with › opens its page
 * right in the sheet, sliding in (‹ back): the languages; the users — and a user tapped, their card; the trash's pages.
 */
@Component({
  selector: 'app-account-sheet',
  imports: [Icon, TranslatePipe, UiList, UiFloatingButton, UiListItem, UiSheet, TrashList, UserCard, UsersList],
  templateUrl: './account-sheet.html',
})
export class AccountSheet {
  readonly closed = output<void>();

  protected readonly auth = inject(AuthStore);
  protected readonly i18n = inject(I18nService);
  protected readonly updates = inject(UpdateService);

  // The pages open in the sheet, one over another (none: the account's list); ‹ goes one back
  protected readonly pages = signal<Page[]>([]);
  protected readonly page = computed(() => this.pages().at(-1) ?? null);
  // (one opened slides in from the right; back, the one under it from the left)
  private readonly slide = inject(Slide);

  // The user whose card is open, and their name over it (the card reads them from UsersStore itself:
  // the users' code is downloaded only when Users is opened — @defer)
  protected readonly userId = signal<string | null>(null);
  private readonly userName = signal('');

  // The app's version: shown once the account's row is tapped three times (each within 0.6s of the last)
  protected readonly version = environment.version;
  protected readonly showVersion = signal(false);
  private taps: number[] = [];

  protected tapped(): void {
    const now = Date.now();
    this.taps = [...this.taps.filter((t) => now - t < 600 * 3), now].slice(-3);
    if (this.taps.length === 3 && this.taps[2] - this.taps[0] < 1200) this.showVersion.set(true);
  }

  protected readonly language = computed(() => this.i18n.languages.find((l) => l.code === this.i18n.lang())!.label);

  protected open(page: Page): void {
    this.slide.run('forward', () => this.pages.update((pages) => [...pages, page]));
  }

  protected openUser(user: User): void {
    this.userId.set(user.id);
    this.userName.set([user.firstName, user.lastName].filter((p) => !!p?.trim()).join(' ') || user.email);
    this.open('user');
  }

  protected back(): void {
    this.slide.run('back', () => this.pages.update((pages) => pages.slice(0, -1)));
  }

  /** The open page's name, in the middle over it. */
  protected readonly title = computed(() => {
    switch (this.page()) {
      case 'language':
        return this.i18n.t('account.language');
      case 'users':
        return this.i18n.t('users.title');
      case 'user':
        return this.userName();
      case 'trash':
        return this.i18n.t('trash.title');
      default:
        return '';
    }
  });
}
