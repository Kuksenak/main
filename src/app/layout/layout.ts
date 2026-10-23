import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthStore } from '../auth/auth.store';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { TranslationKey } from '../core/i18n/translations';
import { IconName, UiAvatar, UiButton, UiMenu, UiMenuItem, UiMenuLabel, UiMenuSeparator, UiSidebar, UiSidebarItem } from '../core/ui';

/**
 * The frame of every page after sign-in (the router puts the page into it). Desktop: the sidebar
 * at the left — the app's places, the account at the bottom (its letter, the name — else the
 * email — and ▾; its menu: the email, the language, Log out, Log out of all devices); the open page
 * beside it. Phones (no room for a sidebar): just the account at the top right, the page under it.
 */
@Component({
  selector: 'app-layout',
  imports: [NgTemplateOutlet, RouterOutlet, TranslatePipe, UiAvatar, UiButton, UiMenu, UiMenuItem, UiMenuLabel, UiMenuSeparator, UiSidebar, UiSidebarItem],
  templateUrl: './layout.html',
})
export class Layout {
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
