import { Component, computed, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthStore } from '../auth/auth.store';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { UpdateService } from '../core/services/update.service';
import { Icon, UiGlassButton } from '../core/ui';
import { AccountSheet } from './account-sheet';
import { PageTitle } from './page-title';
import { PlacesSheet } from './places-sheet';

/**
 * Phones: the frame of every page after sign-in (the router puts the page into it), as iOS's — a
 * top bar: the page's title, ⊞ (the sections' sheet) and the account (its letter: the account's
 * sheet); the page under it. (Desktops have their own, DesktopLayout: neither downloads the other's.)
 */
@Component({
  selector: 'app-mobile-layout',
  imports: [AccountSheet, Icon, PlacesSheet, RouterOutlet, TranslatePipe, UiGlassButton],
  templateUrl: './mobile-layout.html',
})
export class MobileLayout {
  private readonly auth = inject(AuthStore);
  protected readonly updates = inject(UpdateService);

  protected readonly title = inject(PageTitle).text;
  protected readonly placesOpen = signal(false);
  protected readonly accountOpen = signal(false);
  // (the account button: the email's first letter)
  protected readonly initial = computed(() => (this.auth.email() ?? '?').charAt(0));
}
