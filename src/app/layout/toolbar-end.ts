import { Component, computed, inject, input, output, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthStore } from '../auth/auth.store';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { TranslationKey } from '../core/i18n/translations';
import { UpdateService } from '../core/services/update.service';
import { Icon } from '../core/ui';
import { UiMenu, UiMenuItem, UiMenuLabel, UiMenuSeparator } from '../core/ui/menu';
import { UiTip } from '../core/ui/tip/tip';
import { DesktopSearch } from './desktop-search';

/**
 * Desktops: a head's right end, as macOS 26's toolbar — one glass capsule [+ | 🔍] (+: the section's
 * new one, when it has one — `add`; 🔍: the search, as Ctrl K), then the account: its letter in a
 * circle (its menu: the email, Users for the admins, the languages, update, log out).
 *   <app-toolbar-end addLabel="library.new" (add)="create()" />
 */
@Component({
  selector: 'app-toolbar-end',
  imports: [Icon, TranslatePipe, UiMenu, UiMenuItem, UiMenuLabel, UiMenuSeparator, UiTip],
  host: { class: 'flex shrink-0 items-center gap-2' },
  template: `
    <span class="flex h-8 items-center gap-0.5 rounded-full bg-(--bar-button) px-1 shadow-(--bar-button-shadow)">
      @if (addLabel(); as label) {
        <button type="button" (click)="add.emit()" [uiTip]="label | t" [attr.aria-label]="label | t" class="grid size-7 place-items-center rounded-full text-fg hover:bg-tint">
          <app-icon name="plus" class="size-5" />
        </button>
      }
      <button type="button" (click)="search.open.set(true)" [uiTip]="'search.title' | t" [attr.aria-label]="'search.title' | t" class="grid size-7 place-items-center rounded-full text-fg hover:bg-tint">
        <app-icon name="search" class="size-5" />
      </button>
    </span>
    <button
      #account
      type="button"
      (click)="menuAt.set(menuAt() ? null : account)"
      aria-haspopup="menu"
      [attr.aria-expanded]="!!menuAt()"
      [attr.aria-label]="'account.title' | t"
      class="relative grid size-8 place-items-center rounded-full bg-accent text-ui font-medium text-on-accent shadow-accent hover:brightness-105"
    >
      {{ initial() }}
      <!-- (a new version ready: a green dot on it) -->
      @if (updates.ready()) {
        <span class="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-success ring-2 ring-app"></span>
      }
    </button>
    @if (menuAt(); as at) {
      <ui-menu [origin]="at" (closed)="menuAt.set(null)">
        <ui-menu-label>{{ auth.email() }}</ui-menu-label>
        <ui-menu-separator />
        @if (auth.isAdmin()) {
          <button type="button" uiMenuItem icon="lock" (click)="router.navigateByUrl('/users')">{{ 'users.title' | t }}</button>
          <ui-menu-separator />
        }
        @for (language of i18n.languages; track language.code) {
          <button type="button" uiMenuItem [checked]="language.code === i18n.lang()" (click)="i18n.setLang(language.code)">{{ language.label }}</button>
        }
        <ui-menu-separator />
        @if (updates.ready()) {
          <button type="button" uiMenuItem icon="update" (click)="updates.apply()"><span class="text-accent">{{ 'account.update' | t }}</span></button>
        }
        <button type="button" uiMenuItem icon="logout" danger (click)="auth.logout()">{{ 'account.logout' | t }}</button>
        <button type="button" uiMenuItem icon="logout-all" danger (click)="auth.logoutEverywhere()">{{ 'account.logoutEverywhere' | t }}</button>
      </ui-menu>
    }
  `,
})
export class ToolbarEnd {
  /** The section's new one (none: no +): its words (the hint). */
  readonly addLabel = input<TranslationKey | null>(null);
  readonly add = output<void>();

  protected readonly auth = inject(AuthStore);
  protected readonly i18n = inject(I18nService);
  protected readonly updates = inject(UpdateService);
  protected readonly router = inject(Router);
  protected readonly search = inject(DesktopSearch);
  protected readonly menuAt = signal<HTMLElement | null>(null);
  // (the account's letter: the name's, else the email's)
  protected readonly initial = computed(() => (this.auth.name() ?? this.auth.email() ?? '?').trim().charAt(0).toUpperCase());
}
