import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { AuthStore } from '../auth/auth.store';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { UpdateService } from '../core/services/update.service';
import { UiAvatar, UiButton } from '../core/ui';
import { UiSidebar, UiSidebarButton, UiSidebarItem } from '../core/ui/sidebar';
import { LibraryStore } from '../library/library.store';
import { TrashList } from '../library/trash-list';
import { UiMenu, UiMenuItem, UiMenuLabel, UiMenuSeparator } from '../core/ui/menu';
import { visiblePlaces } from './places';
import { Search } from './search';

/**
 * Desktop: the frame of every page after sign-in (the router puts the page into it) — the sidebar
 * at the left: Search (Ctrl K / ⌘K: the search window), the app's places, the favorite pages, Trash (its
 * window at it), the account at the bottom (its letter, the name — else the email
 * — and ▾; its menu: the email, Users (the admins only), the language, Log out, Log out of all
 * devices); the open page beside it. (Phones have their own, MobileLayout: neither downloads the other's.)
 */
@Component({
  selector: 'app-desktop-layout',
  imports: [
    RouterOutlet,
    Search,
    TranslatePipe,
    UiAvatar,
    UiButton,
    UiMenu,
    UiMenuItem,
    UiMenuLabel,
    UiMenuSeparator,
    UiSidebar,
    UiSidebarButton,
    UiSidebarItem,
    TrashList,
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

  // The library's: its favorites (the store's list — read here, the sidebar needs it at once), Trash
  protected readonly library = computed(() => this.auth.can('library'));
  private readonly store = inject(LibraryStore);
  protected readonly favorites = computed(() => this.store.items()?.filter((x) => x.favorite) ?? []);
  protected readonly trashOpen = signal(false);

  // The account's menu: open at its button
  protected readonly menuAt = signal<HTMLElement | null>(null);
  // The account button: the user's name, else the email
  protected readonly userName = computed(() => this.auth.name() ?? this.auth.email() ?? '');

  // The search window: open from the sidebar's Search, or Ctrl K (⌘K on a Mac) from anywhere
  protected readonly searchOpen = signal(false);
  private readonly mac = /mac/i.test(navigator.platform);
  protected readonly shortcut = this.mac ? '⌘K' : 'Ctrl+K';

  constructor() {
    if (this.library()) this.store.load();
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'k' && (this.mac ? e.metaKey : e.ctrlKey)) {
        e.preventDefault();
        this.searchOpen.set(!this.searchOpen());
      }
    };
    document.addEventListener('keydown', onKey);
    inject(DestroyRef).onDestroy(() => document.removeEventListener('keydown', onKey));
  }
}
