import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { Router, RouterOutlet } from '@angular/router';
import { AuthStore } from '../auth/auth.store';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { UpdateService } from '../core/services/update.service';
import { IconName, tagTint, Toasts, UiAvatar, UiButton, UiFoldName, UiKbd } from '../core/ui';
import { UiSidebar, UiSidebarAction, UiSidebarButton, UiSidebarItem, UiSidebarScroll } from '../core/ui/sidebar';
import { UiTip } from '../core/ui/tip/tip';
import { UiListKeys, UiWindow, UiWindowField, UiWindowFoot, UiWindowHead, UiWindowKeys, UiWindowList } from '../core/ui/window';
import { LibraryStore, PageItem } from '../library/library.store';
import { TranslationKey } from '../core/i18n/translations';
import { TrashList } from '../library/trash-list';
import { PageMenu } from '../library/page-menu';
import { TagsStore } from '../library/tags.store';
import { PAGE_DRAG, SidebarTags } from '../library/sidebar-tags';
import { UiMenu, UiMenuItem, UiMenuLabel, UiMenuSeparator } from '../core/ui/menu';
import { visiblePlaces } from './places';
import { keep, kept } from '../core/utils/storage';
import { Search } from './search';

/**
 * Desktop: the frame of every page after sign-in (the router puts the page into it) — the sidebar
 * at the left: Search (Ctrl K / ⌘K: the search window), the app's places (Library: + a new page), the
 * library's Recents and Favorites (rows folding their pages; a page's ⋯: its menu); by the account, Trash (its
 * window at it), the account at the bottom (its letter, the name — else the email
 * — and ▾; its menu: the email, Users (the admins only), the language, Log out, Log out of all
 * devices); the open page beside it. (Phones have their own, MobileLayout: neither downloads the other's.)
 */
@Component({
  selector: 'app-desktop-layout',
  imports: [
    NgTemplateOutlet,
    PageMenu,
    SidebarTags,
    RouterOutlet,
    Search,
    TranslatePipe,
    UiAvatar,
    UiFoldName,
    UiKbd,
    UiButton,
    UiMenu,
    UiMenuItem,
    UiMenuLabel,
    UiMenuSeparator,
    UiSidebar,
    UiSidebarAction,
    UiSidebarButton,
    UiSidebarItem,
    UiSidebarScroll,
    TrashList,
    UiTip,
    UiWindow,
    UiWindowField,
    UiWindowFoot,
    UiWindowHead,
    UiWindowKeys,
    UiWindowList,
    UiListKeys,
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
  protected readonly store = inject(LibraryStore);
  protected readonly favorites = computed(() => this.store.items()?.filter((x) => x.favorite) ?? []);
  protected readonly trashOpen = signal(false);
  // (the trash window's field: its pages filtered)
  protected readonly trashQuery = signal('');
  // (and the row its keys picked)
  protected readonly trashIndex = signal<number | null>(0);

  // The sidebar's lists: Recents (the last changed), Favorites (when there are any)
  protected readonly lists = computed(() => {
    const items = this.store.items() ?? [];
    const lists: { id: List; label: TranslationKey; icon: IconName; pages: PageItem[] }[] = [];
    if (this.library()) lists.push({ id: 'recents', label: 'library.recents', icon: 'clock', pages: items.slice(0, RECENTS) });
    if (this.favorites().length) lists.push({ id: 'favorites', label: 'library.favorites', icon: 'bookmark', pages: this.favorites() });
    return lists;
  });
  // (folded away — kept on this device)
  protected readonly folded = signal<List[]>((kept(FOLDED) ?? '').split(',').filter((x): x is List => x === 'favorites' || x === 'recents'));
  protected fold(list: List): void {
    this.folded.update((f) => (f.includes(list) ? f.filter((x) => x !== list) : [...f, list]));
    keep(FOLDED, this.folded().join(','));
  }

  // A page's icon: in its first tag's pastel
  private readonly tags = inject(TagsStore);
  protected tint(page: PageItem): string | null {
    return tagTint(this.tags.of(page.tagIds)[0]?.color);
  }

  // A page dragged (onto a tag in the sidebar: tagged so)
  protected drag(e: DragEvent, page: PageItem): void {
    e.dataTransfer?.setData(PAGE_DRAG, page.id);
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'link';
  }

  // A page's ⋯: its menu, at the button
  protected readonly rowMenu = signal<{ page: PageItem; at: HTMLElement } | null>(null);
  private readonly toasts = inject(Toasts);

  // Library's +: a new page, opened with its name selected
  protected createPage(): void {
    this.store.createAndOpen();
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
    if (this.library()) {
      this.store.load();
      this.tags.load();
    }
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
