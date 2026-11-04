import { afterNextRender, Component, computed, ElementRef, inject, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { RouterLink, RouterOutlet } from '@angular/router';
import { AuthStore } from '../auth/auth.store';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { Slide } from '../core/services/slide';
import { UpdateService } from '../core/services/update.service';
import { VisibleArea } from '../core/services/visible-area';
import { Icon, UiFloatingButton, UiScrollBar} from '../core/ui';
import { AccountSheet } from './account-sheet';
import { PageTitle } from './page-title';
import { SearchBar } from './search-bar';

/**
 * Phones: the frame of every page after sign-in (the router puts the page into it), as iOS's — a
 * top bar — the start (Hub, its sections in a list): its name big at the left, 🔍 (the search, as the
 * desktop's: over the screen, its field at the top, SearchBar) and the account (its letter: the
 * account's sheet); a section or a page in it: ‹ back (to where it was opened from, else the start),
 * its name in the middle, its own ⋯; the page under it, passing under the bar. (Desktops have their own, DesktopLayout: neither downloads the other's.)
 */
@Component({
  selector: 'app-mobile-layout',
  imports: [AccountSheet, Icon, RouterLink, RouterOutlet, SearchBar, TranslatePipe, UiFloatingButton, UiScrollBar],
  templateUrl: './mobile-layout.html',
})
export class MobileLayout {
  private readonly auth = inject(AuthStore);
  protected readonly updates = inject(UpdateService);

  private readonly page = inject(PageTitle);
  protected readonly title = this.page.text;
  // (‹: the page's own way back — else, in a section, back to the start (Hub); the start itself: none)
  protected readonly back = computed(() => this.page.back() ?? (this.atStart() ? null : '/'));
  private readonly url = signal(inject(Router).url);
  protected readonly atStart = computed(() => this.url().split(/[?#]/)[0] === '/');
  protected readonly menu = this.page.menu;
  protected readonly area = inject(VisibleArea);
  protected readonly searchBar = viewChild.required(SearchBar);
  // (the scroll bar from under the top bar: as far down as the page's room for it)
  private readonly main = viewChild.required<ElementRef<HTMLElement>>('main');
  protected readonly barTop = signal(0);
  private readonly measured = afterNextRender(() => this.barTop.set(parseFloat(getComputedStyle(this.main().nativeElement).paddingTop) || 0));
  protected readonly accountOpen = signal(false);
  // (the account button: the email's first letter)
  protected readonly initial = computed(() => (this.auth.email() ?? '?').charAt(0));

  // Another page in: it slides in (Slide) — from the right, or, back to where it was opened from,
  // from the left
  private readonly router = inject(Router);
  private lastUrl = this.router.url;

  protected entered(): void {
    const url = this.router.url;
    this.url.set(url);
    if (url === this.lastUrl) return;
    const way = Slide.way(this.lastUrl, url);
    this.lastUrl = url;
    setTimeout(() => Slide.in(way, 'route'));
  }
}
