import { Component, computed, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { desktop } from '../core/device';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { TranslationKey } from '../core/i18n/translations';
import { Icon, IconName, tagTint, Toasts, UiButton, UiFloatingButton, UiFoldName, UiList, UiListItem, UiTag } from '../core/ui';
import { PageTitle } from '../layout/page-title';
import { LibraryStore, PageItem } from './library.store';
import { PageMenu } from './page-menu';
import { keep, kept } from '../core/utils/storage';
import { UiTip } from '../core/ui/tip/tip';
import { TagPicker } from './tag-picker';
import { TagsStore } from './tags.store';

/**
 * The library: the account's pages, the last changed first — each its title and when it was last
 * changed; a tap opens it (/library/:id). New page: an empty one ("Untitled"), opened right away.
 * Desktops, as Notion's: the name big, the views as pills (Recents: all; Favorites; Published) and New
 * page, a tag's filter (# — its menu), the view's pages by when they were changed (Today, 7 days, 30 days, older), a row each (Ctrl+click
 * picks it; some picked: to the trash at once), ⋯ its menu (PageMenu). Phones: the pages on a card, +
 * floating at the bottom right (Trash: the account's sheet).
 */
type View = 'recents' | 'favorites' | 'published';

@Component({
  selector: 'app-library',
  imports: [Icon, NgTemplateOutlet, PageMenu, TranslatePipe, UiButton, UiFloatingButton, UiFoldName, UiList, UiListItem, UiTag, UiTip, TagPicker],
  templateUrl: './library.html',
})
export class Library {
  protected readonly store = inject(LibraryStore);
  private readonly router = inject(Router);
  private readonly i18n = inject(I18nService);

  protected readonly desktop = desktop;
  protected readonly creating = this.store.creating;
  // Desktops: the views — all the pages, the favorites, the published ones
  protected readonly views: { id: View; label: TranslationKey; icon: IconName }[] = [
    { id: 'recents', label: 'library.recents', icon: 'clock' },
    { id: 'favorites', label: 'library.favorites', icon: 'bookmark' },
    { id: 'published', label: 'library.published', icon: 'lock' },
  ];
  protected readonly view = signal<View>('recents');
  // A tag: only its pages (the views' row: # and its menu); NO_TAG: only the pages with none
  protected readonly tagFilter = signal<string | null>(null);
  // (the address' ?tag= — the sidebar's tags: their pages)
  private readonly tagFromUrl = inject(ActivatedRoute)
    .queryParamMap.pipe(takeUntilDestroyed())
    .subscribe((q) => this.tagFilter.set(q.get('tag')));
  protected readonly noTag = NO_TAG;
  protected readonly tagMenu = signal(false);
  // The tags: after a page's name; its icon in its first tag's pastel
  protected readonly tags = inject(TagsStore);
  protected tint(item: PageItem): string | null {
    return tagTint(this.tags.of(item.tagIds)[0]?.color);
  }

  // The date groups folded away (kept on this device)
  protected readonly folded = signal<string[]>(readFolded());
  protected fold(key: string): void {
    this.folded.update((f) => (f.includes(key) ? f.filter((x) => x !== key) : [...f, key]));
    keep(FOLDED, this.folded().join(','));
  }

  // A page's ⋯: its menu (as the sidebar's), at the button
  protected readonly menu = signal<{ page: PageItem; at: HTMLElement } | null>(null);
  // The pages picked (Ctrl+click): Move to trash in the views' row
  protected readonly picked = signal<Set<string>>(new Set());

  protected pick(id: string): void {
    this.picked.update((p) => {
      const next = new Set(p);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  protected unpick(): void {
    this.picked.set(new Set());
  }

  protected trashPicked(): void {
    this.store.deleteMany([...this.picked()]).subscribe({ error: () => this.toasts.error(this.i18n.t('library.deleteError')) });
    this.picked.set(new Set());
  }

  // The view's pages by when they were changed: Today, the last 7 days, 30, older (only those with any)
  protected readonly groups = computed(() => {
    const view = this.view();
    const tag = this.tagFilter();
    const items = (this.store.items() ?? []).filter(
      (i) =>
        (view === 'recents' || (view === 'favorites' ? i.favorite : i.published)) &&
        (!tag || (tag === NO_TAG ? !i.tagIds?.length : !!i.tagIds?.includes(tag))),
    );
    const day = new Date();
    day.setHours(0, 0, 0, 0);
    const today = day.getTime();
    const DAY = 86_400_000;
    const groups: { key: TranslationKey; items: PageItem[] }[] = [
      { key: 'library.today', items: [] },
      { key: 'library.week', items: [] },
      { key: 'library.month', items: [] },
      { key: 'library.older', items: [] },
    ];
    for (const item of items) {
      const at = new Date(item.updatedAt).getTime();
      groups[at >= today ? 0 : at >= today - 7 * DAY ? 1 : at >= today - 30 * DAY ? 2 : 3].items.push(item);
    }
    return groups.filter((g) => g.items.length);
  });
  private readonly toasts = inject(Toasts);

  constructor() {
    inject(PageTitle).show(computed(() => this.i18n.t('nav.library')));
    this.store.load();
    this.tags.load();
  }

  protected open(item: PageItem): void {
    this.router.navigate(['/library', item.id]);
  }

  protected create(): void {
    this.store.createAndOpen();
  }

  // "12 Oct", "12 Oct 2025" (another year); today: "15:02"
  protected changed(item: PageItem, time = false): string {
    return time ? this.i18n.time(item.updatedAt) : this.i18n.day(item.updatedAt);
  }
}

// (the date groups folded away: kept on this device — storage may be off, then it just isn't kept)
const FOLDED = 'library.folded';
// (the tag filter's No tag: the pages with none)
const NO_TAG = '-';
const readFolded = (): string[] => (kept(FOLDED) ?? '').split(',').filter(Boolean);
