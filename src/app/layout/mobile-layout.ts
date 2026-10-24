import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { AuthStore } from '../auth/auth.store';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { UpdateService } from '../core/services/update.service';
import { VisibleArea } from '../core/services/visible-area';
import { Icon, UiFloatingButton } from '../core/ui';
import { AccountSheet } from './account-sheet';
import { PageTitle } from './page-title';
import { PlacesSheet } from './places-sheet';
import { SearchBar } from './search-bar';

/**
 * Phones: the frame of every page after sign-in (the router puts the page into it), as iOS's — a
 * top bar: the page's title (a page opened from a list: ‹ back to it first), 🔍 (the search, as the desktop's: over the screen, its field at the top, SearchBar), ⊞ (the sections' sheet) and the account (its letter: the account's
 * sheet); the page under it, passing under the bar. (Desktops have their own, DesktopLayout: neither downloads the other's.)
 */
@Component({
  selector: 'app-mobile-layout',
  imports: [AccountSheet, Icon, PlacesSheet, RouterLink, RouterOutlet, SearchBar, TranslatePipe, UiFloatingButton],
  templateUrl: './mobile-layout.html',
})
export class MobileLayout {
  private readonly auth = inject(AuthStore);
  protected readonly updates = inject(UpdateService);

  private readonly page = inject(PageTitle);
  protected readonly title = this.page.text;
  protected readonly back = this.page.back;
  protected readonly placesOpen = signal(false);
  protected readonly area = inject(VisibleArea);
  protected readonly searchBar = viewChild.required(SearchBar);
  protected readonly accountOpen = signal(false);
  // (the account button: the email's first letter)
  protected readonly initial = computed(() => (this.auth.email() ?? '?').charAt(0));
}
