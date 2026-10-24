import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { RouterLink, RouterOutlet } from '@angular/router';
import { AuthStore } from '../auth/auth.store';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { Slide } from '../core/services/slide';
import { UpdateService } from '../core/services/update.service';
import { VisibleArea } from '../core/services/visible-area';
import { Icon, UiFloatingButton } from '../core/ui';
import { AccountSheet } from './account-sheet';
import { PageTitle } from './page-title';
import { visiblePlaces } from './places';
import { SearchBar } from './search-bar';

/**
 * Phones: the frame of every page after sign-in (the router puts the page into it), as iOS's — a
 * top bar: the page's title (a page opened from a list: ‹ back to it first), 🔍 (the search, as the desktop's: over the screen, its field at the top, SearchBar), the title a menu of the sections (the system's own) and the account (its letter: the account's
 * sheet); the page under it, passing under the bar. (Desktops have their own, DesktopLayout: neither downloads the other's.)
 */
@Component({
  selector: 'app-mobile-layout',
  imports: [AccountSheet, Icon, RouterLink, RouterOutlet, SearchBar, TranslatePipe, UiFloatingButton],
  templateUrl: './mobile-layout.html',
})
export class MobileLayout {
  private readonly auth = inject(AuthStore);
  protected readonly updates = inject(UpdateService);

  private readonly page = inject(PageTitle);
  protected readonly title = this.page.text;
  protected readonly back = this.page.back;
  protected readonly area = inject(VisibleArea);
  protected readonly searchBar = viewChild.required(SearchBar);
  protected readonly accountOpen = signal(false);
  // (the account button: the email's first letter)
  protected readonly initial = computed(() => (this.auth.email() ?? '?').charAt(0));

  // Another page in: it slides in (Slide) — from the right, or, back to where it was opened from,
  // from the left
  private readonly router = inject(Router);
  private lastUrl = this.router.url;

  // The sections this user may open (the title's menu), and which one this is
  protected readonly places = computed(() => visiblePlaces((area) => this.auth.can(area)));
  protected here(): string {
    return '/' + (this.router.url.split(/[/?#]/)[1] ?? '');
  }

  // A section picked in the title's menu: there
  protected go(select: HTMLSelectElement): void {
    this.router.navigateByUrl(select.value);
  }

  protected entered(): void {
    const url = this.router.url;
    if (url === this.lastUrl) return;
    const way = Slide.way(this.lastUrl, url);
    this.lastUrl = url;
    setTimeout(() => Slide.in(way, 'route'));
  }
}
