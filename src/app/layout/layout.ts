import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthStore } from '../auth/auth.store';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { Icon, UiAvatar, UiButton, UiGlassButton, UiMenu, UiMenuItem, UiMenuLabel, UiMenuSeparator, UiSidebar, UiSidebarItem } from '../core/ui';
import { AccountSheet } from './account-sheet';
import { PageTitle } from './page-title';
import { PLACES } from './places';
import { PlacesSheet } from './places-sheet';

/**
 * The frame of every page after sign-in (the router puts the page into it). Desktop: the sidebar
 * at the left — the app's places, the account at the bottom (its letter, the name — else the
 * email — and ▾; its menu: the email, the language, Log out, Log out of all devices); the open page
 * beside it. Phones (no room for a sidebar), as iOS's: a top bar — the page's title, ⊞ (the
 * sections' sheet) and the account (its letter: the account's sheet); the page under it.
 */
@Component({
  selector: 'app-layout',
  imports: [
    AccountSheet,
    Icon,
    NgTemplateOutlet,
    PlacesSheet,
    RouterOutlet,
    TranslatePipe,
    UiAvatar,
    UiButton,
    UiGlassButton,
    UiMenu,
    UiMenuItem,
    UiMenuLabel,
    UiMenuSeparator,
    UiSidebar,
    UiSidebarItem,
  ],
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

  // The app's sections, in the sidebar
  protected readonly places = PLACES;

  // Phones: the open page's title in the top bar; its two sheets
  protected readonly title = inject(PageTitle).text;
  protected readonly placesOpen = signal(false);
  protected readonly accountOpen = signal(false);
  // (the account button on phones: the email's first letter)
  protected readonly initial = computed(() => (this.auth.email() ?? '?').charAt(0));
}
