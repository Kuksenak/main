import { afterRenderEffect, Component, computed, ElementRef, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { Confirm } from '../core/ui/confirm/confirm';
import { UiFoldName } from '../core/ui/fold/fold';
import { TAG_CHOICES, tagColorLabel, UiTagSwatch } from '../core/ui/tag/tag';
import { UiMenu, UiMenuItem, UiMenuSeparator } from '../core/ui/menu';
import { UiSidebarAction, UiSidebarField, UiSidebarItem, UiSidebarRow, UiSidebarScroll } from '../core/ui/sidebar';
import { UiTip } from '../core/ui/tip/tip';
import { keptFolds } from '../core/utils/storage';
import { LibraryStore } from './library.store';
import { Tag, TagsStore } from './tags.store';

/** A page dragged (its id): what a tag's row takes. */
export const PAGE_DRAG = 'application/x-page';

/**
 * Desktop: the account's tags in the sidebar, as folders (as Bear's, Things'): a row as a place's —
 * # Tags, ⌄ / ⌃ folding them, + (a new one: a field in the list, Enter makes it — its color the next
 * one round); a row each: its color's swatch, its name — a click: the library, only its pages (the
 * current one gray); a page dropped on it: tagged so; ⋯ under the pointer — Rename (a field in its
 * place), its colors, Delete (asked first).
 */
@Component({
  selector: 'app-sidebar-tags',
  imports: [
    UiFoldName,
    UiTagSwatch,
    TranslatePipe,
    UiMenu,
    UiMenuItem,
    UiMenuSeparator,
    UiSidebarAction,
    UiSidebarField,
    UiSidebarItem,
    UiSidebarRow,
    UiSidebarScroll,
    UiTip,
  ],
  host: { class: 'flex min-h-0 flex-initial flex-col gap-px' },
  templateUrl: './sidebar-tags.html',
})
export class SidebarTags {
  protected readonly store = inject(TagsStore);
  private readonly library = inject(LibraryStore);
  private readonly router = inject(Router);
  private readonly confirm = inject(Confirm);
  private readonly i18n = inject(I18nService);
  protected readonly colors = TAG_CHOICES;
  protected readonly colorLabel = tagColorLabel;

  // (folded away — kept on this device)
  protected readonly folds = keptFolds<'tags'>(FOLDED);

  // The library's tag shown (the address' ?tag=): its row gray
  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map(() => this.router.url),
    ),
    { initialValue: this.router.url },
  );
  protected readonly current = computed(() => {
    const url = this.url();
    return url.startsWith('/library?') ? new URLSearchParams(url.split('?')[1]).get('tag') : null;
  });

  // + : a field for a new one, at the list's top
  protected readonly adding = signal(false);
  // ⋯ : its menu at the button; Rename: a field in its row
  protected readonly menuFor = signal<{ tag: Tag; at: HTMLElement } | null>(null);
  protected closeMenu(): void {
    this.menuFor.set(null);
  }
  protected readonly renaming = signal<string | null>(null);
  // A page dragged over a row: that row gray
  protected readonly dropOn = signal<string | null>(null);

  private readonly field = viewChild<ElementRef<HTMLInputElement>>('field');

  constructor() {
    this.store.load();
    // (a field shown: focused, what's in it selected)
    afterRenderEffect(() => {
      if (this.adding() || this.renaming()) this.field()?.nativeElement.select();
    });
  }

  protected open(tag: Tag): void {
    this.router.navigate(['/library'], { queryParams: { tag: tag.id } });
  }

  protected startAdding(): void {
    if (this.folds.has('tags')) this.folds.toggle('tags');
    this.adding.set(true);
  }

  // Enter in the new one's field: made (a name another has: that one shown instead)
  protected add(field: HTMLInputElement): void {
    const name = field.value.trim();
    this.adding.set(false);
    if (!name) return;
    const there = this.store.named(name);
    if (there) this.open(there);
    else this.store.create(name).subscribe();
  }

  // (Enter or away: saved — not empty, not another tag's name)
  protected rename(tag: Tag, field: HTMLInputElement): void {
    this.renaming.set(null);
    this.store.rename(tag, field.value);
  }

  protected async remove(tag: Tag, at: HTMLElement): Promise<void> {
    const yes = await this.confirm.ask(at, { text: this.i18n.t('tags.deleteAsk'), yes: this.i18n.t('tags.delete'), danger: true });
    if (!yes) return;
    this.store.remove(tag.id);
    if (this.current() === tag.id) this.router.navigateByUrl('/library');
  }

  // A page dragged over a row / dropped on it: tagged so (one tag a page, for now)
  protected over(e: DragEvent, tag: Tag): void {
    if (!e.dataTransfer?.types.includes(PAGE_DRAG)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'link';
    this.dropOn.set(tag.id);
  }

  protected drop(e: DragEvent, tag: Tag): void {
    this.dropOn.set(null);
    const page = e.dataTransfer?.getData(PAGE_DRAG);
    if (!page) return;
    e.preventDefault();
    this.library.setTags(page, [tag.id]).subscribe();
  }
}

const FOLDED = 'sidebar.tags.folded';
