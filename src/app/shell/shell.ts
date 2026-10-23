import { Component, computed, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthStore } from '../auth/auth.store';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { TranslationKey } from '../core/i18n/translations';
import { IconName } from '../core/ui/icon/icon';
import { UiAvatar, UiButton, UiMenu, UiMenuItem, UiMenuLabel, UiToolbar, UiToolbarTab } from '../ui';

/**
 * The signed-in frame: the toolbar at the top — the app's places at the left, the account at the
 * right (its letter, the name — else the email — and ▾; its menu: the email, Log out); the open
 * page under it. Phones: the same bar, the name shorter.
 */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, TranslatePipe, UiAvatar, UiButton, UiMenu, UiMenuItem, UiMenuLabel, UiToolbar, UiToolbarTab],
  template: `
    <div class="flex h-full flex-col bg-[var(--app-bg)] text-[var(--text)]">
      <ui-toolbar>
        @for (place of places; track place.path) {
          <!-- (the start page: current only on itself) -->
          <a uiToolbarTab [icon]="place.icon" [routerLink]="place.path" [routerLinkActiveOptions]="{ exact: place.path === '/' }">{{ place.label | t }}</a>
        }
        <button
          #account
          toolbarEnd
          uiButton
          type="button"
          [caret]="true"
          (click)="accountOpen.set(!accountOpen())"
          aria-haspopup="menu"
          [attr.aria-expanded]="accountOpen()"
          [attr.aria-label]="'account.title' | t"
        >
          <ui-avatar [name]="userName()" />
          {{ userName() }}
        </button>
      </ui-toolbar>
      @if (accountOpen()) {
        <ui-menu [origin]="account.element" (closed)="accountOpen.set(false)">
          <ui-menu-label>{{ auth.email() }}</ui-menu-label>
          <button type="button" uiMenuItem icon="logout" (click)="auth.logout()">{{ 'account.logout' | t }}</button>
        </ui-menu>
      }
      <main class="min-h-0 flex-1 overflow-y-auto">
        <router-outlet />
      </main>
    </div>
  `,
})
export class Shell {
  protected readonly auth = inject(AuthStore);
  protected readonly accountOpen = signal(false);
  // The account button: the user's name, else the email
  protected readonly userName = computed(() => this.auth.name() ?? this.auth.email() ?? '');

  // The app's places, in the toolbar in this order
  protected readonly places: { path: string; label: TranslationKey; icon: IconName }[] = [
    { path: '/', label: 'nav.home', icon: 'home' },
  ];
}
