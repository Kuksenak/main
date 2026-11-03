import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { AuthStore } from '../auth/auth.store';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { UpdateService } from '../core/services/update.service';
import { IconName, tagTint, UiAvatar, UiButton, UiFoldName, UiKbd } from '../core/ui';
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
import { keptFolds } from '../core/utils/storage';
import { sameDay } from '../core/utils/date';
import { EventsStore, Occurrence } from '../schedule/events.store';
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
  protected readonly folds = keptFolds<List>(FOLDED);
  // (the library — or one of its pages — open: Library's row gray)
  private readonly url = toSignal(this.router.events.pipe(filter((e) => e instanceof NavigationEnd), map(() => this.router.url)), {
    initialValue: this.router.url,
  });
  protected readonly onLibrary = computed(() => /^\/library(\/|\?|$)/.test(this.url()));
  protected readonly onSchedule = computed(() => /^\/schedule(\/|\?|$)/.test(this.url()));

  // Schedule's next events (the 5 soonest), under it; one clicked (none: a new one) — opened in the schedule
  protected readonly events = inject(EventsStore);
  protected readonly upcoming = computed(() => this.events.upcoming().slice(0, 5));
  protected openEvent(event: Occurrence | null): void {
    this.events.ask.set({ event });
    if (!this.onSchedule()) this.router.navigateByUrl('/schedule');
  }

  // "Today 15:00", "Thu 09:30"
  protected when(event: Occurrence): string {
    const at = new Date(event.startsAt);
    const day = sameDay(at, new Date()) ? this.i18n.t('schedule.today') : this.i18n.date(at, { weekday: 'short' });
    return `${day} ${this.i18n.time(at)}`;
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
    this.events.show(new Date());
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

type List = 'favorites' | 'recents' | 'events';
// (how many of the last changed pages Recents shows)
const RECENTS = 5;
// (the lists folded away: kept on this device — storage may be off, then it just isn't kept)
const FOLDED = 'sidebar.folded';
