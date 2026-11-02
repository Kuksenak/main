import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { AuthStore } from '../auth/auth.store';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { UpdateService } from '../core/services/update.service';
import { Icon, IconName, UiAvatar, UiButton } from '../core/ui';
import { UiSidebar, UiSidebarAction, UiSidebarButton, UiSidebarItem } from '../core/ui/sidebar';
import { UiTip } from '../core/ui/tip/tip';
import { LibraryStore, PageItem } from '../library/library.store';
import { TranslationKey } from '../core/i18n/translations';
import { Toasts } from '../core/ui';
import { TrashList } from '../library/trash-list';
import { UiMenu, UiMenuItem, UiMenuLabel, UiMenuSeparator } from '../core/ui/menu';
import { visiblePlaces } from './places';
import { Search } from './search';

/**
 * Desktop: the frame of every page after sign-in (the router puts the page into it) — the sidebar
 * at the left: Search (Ctrl K / ⌘K: the search window), the app's places (Library: + a new page), the
 * library's Recents and Favorites (rows folding their pages; a page's ⋯: its menu), Trash (its
 * window at it), the account at the bottom (its letter, the name — else the email
 * — and ▾; its menu: the email, Users (the admins only), the language, Log out, Log out of all
 * devices); the open page beside it. (Phones have their own, MobileLayout: neither downloads the other's.)
 */
@Component({
  selector: 'app-desktop-layout',
  imports: [
    Icon,
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
    UiSidebarAction,
    UiSidebarButton,
    UiSidebarItem,
    TrashList,
    UiTip,
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

  // The sidebar's lists: Recents (the last changed; more: View all), Favorites (when there are any)
  protected readonly lists = computed(() => {
    const items = this.store.items() ?? [];
    const lists: { id: List; label: TranslationKey; icon: IconName; pages: PageItem[]; more?: boolean }[] = [];
    if (this.library()) lists.push({ id: 'recents', label: 'library.recents', icon: 'clock', pages: items.slice(0, RECENTS), more: items.length > RECENTS });
    if (this.favorites().length) lists.push({ id: 'favorites', label: 'library.favorites', icon: 'bookmark', pages: this.favorites() });
    return lists;
  });
  protected readonly listsScrolled = signal(false);
  // (folded away — kept on this device)
  protected readonly folded = signal<List[]>((read(FOLDED) ?? '').split(',').filter((x): x is List => x === 'favorites' || x === 'recents'));
  protected fold(list: List): void {
    this.folded.update((f) => (f.includes(list) ? f.filter((x) => x !== list) : [...f, list]));
    write(FOLDED, this.folded().join(','));
  }

  // A page's ⋯: its menu, at the button
  protected readonly rowMenu = signal<{ page: PageItem; at: HTMLElement } | null>(null);
  private readonly toasts = inject(Toasts);

  protected favorite(page: PageItem): void {
    this.rowMenu.set(null);
    this.store.favorite(page.id, !page.favorite).subscribe();
  }

  protected duplicate(page: PageItem): void {
    this.rowMenu.set(null);
    const title = this.i18n.t('library.copyOf').replace('{title}', page.title.trim() || this.i18n.t('library.untitled'));
    this.store.duplicate(page.id, title).subscribe({
      next: (copy) => this.router.navigate(['/library', copy.id]),
      error: () => this.toasts.error(this.i18n.t('library.duplicateError')),
    });
  }

  protected trash(page: PageItem): void {
    this.rowMenu.set(null);
    this.store.delete(page.id).subscribe({
      next: () => {
        if (this.router.url === `/library/${page.id}`) this.router.navigateByUrl('/library');
      },
      error: () => this.toasts.error(this.i18n.t('library.deleteError')),
    });
  }

  // "26 Oct, 15:02"
  protected when(at: string): string {
    return this.i18n.date(new Date(at), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  // Library's +: a new page ("Untitled"), opened with its name selected
  private creating = false;
  protected createPage(): void {
    if (this.creating) return;
    this.creating = true;
    this.store.create(this.i18n.t('library.untitled')).subscribe({
      next: (page) => {
        this.creating = false;
        this.router.navigate(['/library', page.id], { state: { fresh: true } });
      },
      error: () => {
        this.creating = false;
        this.toasts.error(this.i18n.t('library.createError'));
      },
    });
  }

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

type List = 'favorites' | 'recents';
// (how many of the last changed pages Recents shows)
const RECENTS = 5;
// (the lists folded away: kept on this device — storage may be off, then it just isn't kept)
const FOLDED = 'sidebar.folded';
const read = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const write = (key: string, value: string): void => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // (not kept)
  }
};
