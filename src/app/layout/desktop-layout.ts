import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { Router, RouterOutlet } from '@angular/router';
import { AuthStore } from '../auth/auth.store';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { tagTint, UiButton, UiFoldName } from '../core/ui';
import { UiSidebar, UiSidebarAction, UiSidebarItem, UiSidebarScroll } from '../core/ui/sidebar';
import { UiTip } from '../core/ui/tip/tip';
import { UiListKeys, UiWindow, UiWindowField, UiWindowFoot, UiWindowHead, UiWindowKeys, UiWindowList } from '../core/ui/window';
import { LibraryStore, PageItem } from '../library/library.store';
import { TrashList } from '../library/trash-list';
import { PageMenu } from '../library/page-menu';
import { TagsStore } from '../library/tags.store';
import { PAGE_DRAG, SidebarTags } from '../library/sidebar-tags';
import { visiblePlaces } from './places';
import { keptFolds } from '../core/utils/storage';
import { EventsStore, Occurrence } from '../schedule/events.store';
import { DesktopSearch } from './desktop-search';
import { Search } from './search';

/**
 * Desktop: the frame of every page after sign-in (the router puts the page into it), as macOS 26's —
 * the sidebar a panel floating at the left: the app's places (Library, Schedule: + a new one under
 * the pointer), Favorites (folding their pages; a page's ⋯: its menu), Tags, Trash at the bottom (its
 * window as the search's); the open page beside it — the search (Ctrl K / ⌘K) and the account at
 * its head's right (ToolbarEnd). (Phones have their own, MobileLayout: neither downloads the other's.)
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
    UiFoldName,
    UiButton,
    UiSidebar,
    UiSidebarAction,
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

  // (folded away — kept on this device)
  protected readonly folds = keptFolds<List>(FOLDED);
  // Schedule's +: a new event, opened in the schedule
  private readonly events = inject(EventsStore);
  protected openEvent(event: Occurrence | null): void {
    this.events.ask.set({ event });
    if (!/^\/schedule(\/|\?|$)/.test(this.router.url)) this.router.navigateByUrl('/schedule');
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

  // The search window: open from a head's 🔍, or Ctrl K (⌘K on a Mac) from anywhere
  protected readonly search = inject(DesktopSearch);
  private readonly mac = /mac/i.test(navigator.platform);

  constructor() {
    if (this.library()) {
      this.store.load();
      this.tags.load();
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'k' && (this.mac ? e.metaKey : e.ctrlKey)) {
        e.preventDefault();
        this.search.open.set(!this.search.open());
      }
    };
    document.addEventListener('keydown', onKey);
    inject(DestroyRef).onDestroy(() => document.removeEventListener('keydown', onKey));
  }
}

type List = 'favorites';
// (the lists folded away: kept on this device — storage may be off, then it just isn't kept)
const FOLDED = 'sidebar.folded';
