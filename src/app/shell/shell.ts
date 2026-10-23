import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthStore } from '../auth/auth.store';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { TranslationKey } from '../core/i18n/translations';
import { IconName, UiAvatar, UiButton, UiMenu, UiMenuItem, UiMenuLabel, UiMenuSeparator, UiSidebar, UiSidebarItem } from '../core/ui';

/**
 * The signed-in frame. Desktop: the sidebar at the left — the app's places, the account at the
 * bottom (its letter, the name — else the email — and ▾; its menu: the email, the language, Log
 * out, Log out of all devices); the open page beside it. Phones (no room for a sidebar): just the account at
 * the top right, the page under it.
 */
@Component({
  selector: 'app-shell',
  imports: [NgTemplateOutlet, RouterOutlet, TranslatePipe, UiAvatar, UiButton, UiMenu, UiMenuItem, UiMenuLabel, UiMenuSeparator, UiSidebar, UiSidebarItem],
  template: `
    <ng-template #accountButton>
      <button
        #account
        uiButton
        type="button"
        [caret]="true"
        (click)="menuAt.set(menuAt() ? null : account.element)"
        aria-haspopup="menu"
        [attr.aria-expanded]="!!menuAt()"
        [attr.aria-label]="'account.title' | t"
      >
        <ui-avatar [name]="userName()" />
        {{ userName() }}
      </button>
    </ng-template>

    <div class="flex h-full bg-[var(--app-bg)] text-[var(--text)]" [class.flex-col]="!desktop">
      @if (desktop) {
        <ui-sidebar>
          @for (place of places; track place.path) {
            <!-- (the start page: current only on itself) -->
            <a uiSidebarItem [icon]="place.icon" [routerLink]="place.path" [routerLinkActiveOptions]="{ exact: place.path === '/' }">{{ place.label | t }}</a>
          }
          <ng-container ngProjectAs="[sidebarFoot]" [ngTemplateOutlet]="accountButton" />
        </ui-sidebar>
      } @else {
        <header class="flex shrink-0 justify-end px-4 pb-2 pt-[calc(env(safe-area-inset-top)+0.5rem)]">
          <ng-container [ngTemplateOutlet]="accountButton" />
        </header>
      }
      <main class="min-h-0 min-w-0 flex-1 overflow-y-auto">
        <router-outlet />
      </main>
    </div>

    @if (menuAt(); as at) {
      <ui-menu [origin]="at" (closed)="menuAt.set(null)">
        <ui-menu-label>{{ auth.email() }}</ui-menu-label>
        <ui-menu-separator />
        <ui-menu-label>{{ 'account.language' | t }}</ui-menu-label>
        @for (language of i18n.languages; track language.code) {
          <button type="button" uiMenuItem [checked]="language.code === i18n.lang()" (click)="i18n.setLang(language.code)">{{ language.label }}</button>
        }
        <ui-menu-separator />
        <button type="button" uiMenuItem icon="logout" danger (click)="auth.logout()">{{ 'account.logout' | t }}</button>
        <button type="button" uiMenuItem icon="logout-all" danger (click)="auth.logoutEverywhere()">{{ 'account.logoutEverywhere' | t }}</button>
      </ui-menu>
    }
  `,
})
export class Shell {
  protected readonly auth = inject(AuthStore);
  protected readonly i18n = inject(I18nService);
  // (index.html decides the device once, before the app starts)
  protected readonly desktop = document.documentElement.dataset['device'] === 'desktop';
  // The account's menu: open at its button
  protected readonly menuAt = signal<HTMLElement | null>(null);
  // The account button: the user's name, else the email
  protected readonly userName = computed(() => this.auth.name() ?? this.auth.email() ?? '');

  // The app's places, in the sidebar in this order
  protected readonly places: { path: string; label: TranslationKey; icon: IconName }[] = [
    { path: '/', label: 'nav.home', icon: 'home' },
  ];
}
