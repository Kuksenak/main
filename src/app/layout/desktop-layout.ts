import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { AuthStore } from '../auth/auth.store';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { UpdateService } from '../core/services/update.service';
import { UiAvatar, UiButton, UiSidebar, UiSidebarItem } from '../core/ui';
import { UiMenu, UiMenuItem, UiMenuLabel, UiMenuSeparator } from '../core/ui/menu';
import { visiblePlaces } from './places';

/**
 * Desktop: the frame of every page after sign-in (the router puts the page into it) — the sidebar
 * at the left: the app's places, the account at the bottom (its letter, the name — else the email
 * — and ▾; its menu: the email, Users (the admins only), the language, Log out, Log out of all
 * devices); the open page beside it. (Phones have their own, MobileLayout: neither downloads the other's.)
 */
@Component({
  selector: 'app-desktop-layout',
  imports: [
    RouterOutlet,
    TranslatePipe,
    UiAvatar,
    UiButton,
    UiMenu,
    UiMenuItem,
    UiMenuLabel,
    UiMenuSeparator,
    UiSidebar,
    UiSidebarItem,
  ],
  templateUrl: './desktop-layout.html',
})
export class DesktopLayout {
  protected readonly auth = inject(AuthStore);
  protected readonly i18n = inject(I18nService);
  protected readonly updates = inject(UpdateService);
  protected readonly router = inject(Router);
  // (the sections this user can read)
  protected readonly places = computed(() => visiblePlaces((area) => this.auth.can(area)));

  // The account's menu: open at its button
  protected readonly menuAt = signal<HTMLElement | null>(null);
  // The account button: the user's name, else the email
  protected readonly userName = computed(() => this.auth.name() ?? this.auth.email() ?? '');
}
