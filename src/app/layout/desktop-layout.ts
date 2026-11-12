import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { Location, NgTemplateOutlet } from '@angular/common';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { AuthStore } from '../auth/auth.store';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { UpdateService } from '../core/services/update.service';
import { UiAvatar } from '../core/ui/avatar/avatar';
import { UiButton } from '../core/ui/button/button';
import { UiFoldName } from '../core/ui/fold/fold';
import { Icon, IconName } from '../core/ui/icon/icon';
import { UiSidebar, UiSidebarAction, UiSidebarButton, UiSidebarItem, UiSidebarRow, UiSidebarScroll } from '../core/ui/sidebar';
import { UiTip } from '../core/ui/tip/tip';
import { UiListKeys, UiWindow, UiWindowField, UiWindowFoot, UiWindowHead, UiWindowList } from '../core/ui/window';
import { LibraryStore, PageItem } from '../library/library.store';
import { TranslationKey } from '../core/i18n/translations';
import { TrashList } from '../library/trash-list';
import { PageMenu } from '../library/page-menu';
import { TagsStore } from '../library/tags.store';
import { PAGE_DRAG, SidebarTags } from '../library/sidebar-tags';
import { UiMenu, UiMenuItem, UiMenuLabel, UiMenuSeparator } from '../core/ui/menu';
import { visiblePlaces } from './places';
import { keep, kept, keptFolds } from '../core/utils/storage';
import { sameDay } from '../core/utils/date';
import { EventsStore, Occurrence } from '../schedule/events.store';
import { DesktopSearch } from './desktop-search';
import { Search } from './search';

/**
 * Desktop: the frame of every page after sign-in (the router puts the page into it), as macOS 26's —
 * the sidebar a panel floating at the left (the search: the sidebar's first row): the app's places (Library: + a new page), the
 * library's Recents and Favorites (rows folding their pages; a page's ⋯: its menu); by the account, Trash (its
 * window at it), the account at the bottom (its letter, the name — else the email
 * — and ▾; its menu: the email, Users (the admins only), the language, Log out, Log out of all
 * devices); the open page beside it. (Phones have their own, MobileLayout: neither downloads the other's.)
 */
// (the sidebar hidden, on this device)
const SIDEBAR_HIDDEN = 'layout.sidebarHidden';

@Component({
  selector: 'app-desktop-layout',
  imports: [
    Icon,
    NgTemplateOutlet,
    PageMenu,
    SidebarTags,
    RouterOutlet,
    Search,
    TranslatePipe,
    UiAvatar,
    UiFoldName,
    UiButton,
    UiMenu,
    UiMenuItem,
    UiMenuLabel,
    UiMenuSeparator,
    UiSidebar,
    UiSidebarAction,
    UiSidebarButton,
    UiSidebarItem,
    UiSidebarRow,
    UiSidebarScroll,
    TrashList,
    UiTip,
    UiWindow,
    UiWindowField,
    UiWindowFoot,
    UiWindowHead,
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
    if (this.library()) {
      // (the last opened first — one opened that isn't shown comes in at the top; one shown stays put — then
      // the last changed: 5 in all)
      const byId = new Map(items.map((x) => [x.id, x]));
      const opened = this.opened().map((id) => byId.get(id)).filter((x): x is PageItem => !!x);
      const pages = [...opened, ...items.filter((x) => !opened.includes(x))].slice(0, RECENTS);
      lists.push({ id: 'recents', label: 'library.recents', icon: 'clock', pages });
    }
    // (Favorites: off the sidebar for now)
    // if (this.favorites().length) lists.push({ id: 'favorites', label: 'library.favorites', icon: 'bookmark', pages: this.favorites() });
    return lists;
  });
  // (folded away — kept on this device)
  protected readonly folds = keptFolds<List>(FOLDED);
  // (the library — or one of its pages — open: Library's row gray)
  private readonly url = toSignal(this.router.events.pipe(filter((e) => e instanceof NavigationEnd), map(() => this.router.url)), {
    initialValue: this.router.url,
  });
  // (the library's list itself — not a page of it, nor a tag: those rows are the chosen ones then; none
  // while a window is open: its row is)
  // (the library's page open: its id)
  protected readonly openPage = computed(() => /^\/library\/([^/?#]+)/.exec(this.url())?.[1] ?? null);
  // (the pages opened, the last first — kept on this device)
  protected readonly opened = signal<string[]>((kept(OPENED) ?? '').split(',').filter(Boolean));
  private readonly keepOpened = effect(() => {
    const id = this.openPage();
    if (!id) return;
    const ids = untracked(this.opened);
    // (already in the sidebar's list: stays where it is — only one not there comes in, at the top)
    const shown = untracked(this.lists).find((l) => l.id === 'recents')?.pages ?? [];
    if (ids[0] === id || shown.some((x) => x.id === id)) return;
    const next = [id, ...ids.filter((x) => x !== id)].slice(0, 50);
    this.opened.set(next);
    keep(OPENED, next.join(','));
  });
  protected readonly onLibrary = computed(() => !this.windowOpen() && /^\/library$/.test(this.url().split('#')[0]));
  protected readonly onSchedule = computed(() => !this.windowOpen() && /^\/schedule(\/|\?|$)/.test(this.url()));
  // (a window open over the page — the search, Recently deleted: its row the chosen one)
  protected readonly windowOpen = computed(() => this.search.open() || this.trashOpen());

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

  private readonly tags = inject(TagsStore);

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
  // The title bar's ☰ (an installed app with its own title bar): the app's menu open at its button, and
  // which of its submenus is open (at its row)
  protected readonly appMenuAt = signal<HTMLElement | null>(null);
  protected readonly sub = signal<'go' | 'lang' | 'account' | null>(null);
  protected readonly subAt = signal<HTMLElement | null>(null);
  protected openSub(which: 'go' | 'lang' | 'account', at: HTMLElement): void {
    this.sub.set(which);
    this.subAt.set(at);
  }
  protected closeAppMenu(): void {
    this.appMenuAt.set(null);
    this.sub.set(null);
  }

  // The sidebar hidden (the title bar's button; kept on this device); back and forward (its ‹ ›)
  protected readonly sidebarHidden = signal(kept(SIDEBAR_HIDDEN) === '1');
  // (the sidebar hidden, on the page's root too: a Mac's title bar painted white then — index.html)
  private readonly markSidebar = effect(() => {
    const root = document.documentElement;
    if (this.sidebarHidden()) root.dataset['sideHidden'] = '';
    else delete root.dataset['sideHidden'];
    window.dispatchEvent(new Event('app-repaint'));
  });
  protected toggleSidebar(): void {
    this.sidebarHidden.set(!this.sidebarHidden());
    keep(SIDEBAR_HIDDEN, this.sidebarHidden() ? '1' : '');
  }
  protected readonly location = inject(Location);
  // The account button: the user's name, else the email
  protected readonly userName = computed(() => this.auth.name() ?? this.auth.email() ?? '');

  // The search window: open from the sidebar's Search row
  protected readonly search = inject(DesktopSearch);

  constructor() {
    this.events.show(new Date());
    if (this.library()) {
      this.store.load();
      this.tags.load();
    }
  }
}

type List = 'favorites' | 'recents' | 'events';
// (how many of the last changed pages Recents shows)
const RECENTS = 5;
// (the pages last opened, kept on this device: the sidebar's first)
const OPENED = 'sidebar.opened';
// (the lists folded away: kept on this device — storage may be off, then it just isn't kept)
const FOLDED = 'sidebar.folded';
