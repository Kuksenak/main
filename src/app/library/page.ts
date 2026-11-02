import { Component, computed, DestroyRef, effect, ElementRef, inject, input, signal, untracked, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription, switchMap } from 'rxjs';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { desktop } from '../core/device';
import { Confirm, Icon, Toasts, UiButton, UiKbd, UiList, UiListItem, UiSheet, UiTag } from '../core/ui';
import { UiMenu, UiMenuItem, UiMenuSeparator } from '../core/ui/menu';
import { UiTip } from '../core/ui/tip/tip';
import { UiWindow, UiWindowHead } from '../core/ui/window';
import { PageTitle } from '../layout/page-title';
import { AiChat } from './ai-chat';
import { Page, PageBlock, LibraryStore, shareUrl } from './library.store';
import { shown } from './marks';
import { PageEditor } from './page-editor';
import { TagPicker } from './tag-picker';
import { TagSheet } from './tag-sheet';
import { TagsStore } from './tags.store';

// How long after the last keystroke a change is saved
const SAVE_AFTER_MS = 700;

/**
 * A page of the library (/library/:id): its title and its text (PageEditor: blocks, "/", B I U S,
 * ⠿), edited right there and saved by themselves a moment after the typing stops (and on leaving).
 * A new one ("Untitled") opens with its title selected; Enter in it goes on into the text.
 * AI (the editor's "/" or its bar, desktop: the button at the top): its chat (AiChat) — a sheet
 * (phones) or a window in the middle (desktop); its texts go in after the caret's block.
 * Delete: the page gone, back to the library. Desktops: one row at the top — the title, the
 * title (typed over right there), its tags (a click: TagPicker), the assistant, ⋯ (Duplicate, Delete; when edited, made).
 * Phones: the title in the top bar, ‹ back to the library.
 */
@Component({
  selector: 'app-page',
  imports: [AiChat, Icon, PageEditor, TranslatePipe, UiButton, UiKbd, UiList, UiListItem, UiMenu, UiMenuItem, UiMenuSeparator, UiSheet, UiTag, UiTip, UiWindow, UiWindowHead, TagPicker, TagSheet],
  templateUrl: './page.html',
})
export class PageView {
  /** The page's id (the route's :id). */
  readonly id = input.required<string>();

  protected readonly store = inject(LibraryStore);
  private readonly router = inject(Router);
  private readonly i18n = inject(I18nService);

  protected readonly page = signal<Page | null>(null);
  private readonly toasts = inject(Toasts);
  protected readonly saving = signal(false);

  // What's being edited (the page's as loaded, then as typed)
  protected readonly title = signal('');
  private blocks: PageBlock[] = [];
  protected readonly desktop = desktop;
  protected readonly aiOpen = signal(false);
  protected readonly menuOpen = signal(false);
  protected readonly tagsOpen = signal(false);
  // Phones: the tag's sheet (from the ⋯ sheet)
  protected readonly tagSheetOpen = signal(false);
  private readonly confirm = inject(Confirm);
  // (the tag's button — a plain one or the tag's own: where the picker opens)
  private readonly tagsBtn = viewChild('tagsBtn', { read: ElementRef<HTMLElement> });
  protected readonly tagsAt = computed(() => this.tagsBtn()?.nativeElement ?? null);
  protected readonly tags = inject(TagsStore);
  private readonly tagsLoaded = this.tags.load();
  // Phones: the page read only; its actions in a sheet (the top bar's ⋯)
  protected readonly actionsOpen = signal(false);
  protected readonly shown = shown;
  protected readonly canShare = typeof navigator.share === 'function';
  protected readonly editor = viewChild(PageEditor);

  private readonly titleField = viewChild<ElementRef<HTMLInputElement>>('titleField');
  private timer: ReturnType<typeof setTimeout> | null = null;
  private dirty = false;
  private saveSub: Subscription | null = null;

  constructor() {
    // (‹ back where it was opened from: the library, or Favorites)
    const back = (history.state as { back?: string } | null)?.back ?? '/library';
    inject(PageTitle).show(computed(() => this.title() || this.i18n.t('library.untitled')), back, desktop ? null : () => this.actionsOpen.set(true));
    // (leaving with a change not saved yet: saved now)
    inject(DestroyRef).onDestroy(() => this.flush());
    // (the app about to reload — a theme switch, index.html: saved now)
    const beforeReload = () => this.flush();
    window.addEventListener('app-reload', beforeReload);
    window.addEventListener('pagehide', beforeReload);
    inject(DestroyRef).onDestroy(() => {
      window.removeEventListener('app-reload', beforeReload);
      window.removeEventListener('pagehide', beforeReload);
    });
  }

  // (another page opened in its place — Duplicate: what's typed saved, the editor made anew)
  private readonly opens = effect(() => {
    const id = this.id();
    untracked(() => {
      this.flush();
      this.page.set(null);
      this.menuOpen.set(false);
      this.open(id);
    });
  });

  private open(id: string): void {
    // (a page just made: its title selected, to type over)
    const fresh = !!(history.state as { fresh?: boolean } | null)?.fresh;
    this.store.get(id).subscribe({
      next: (page) => {
        this.page.set(page);
        this.title.set(page.title);
        this.blocks = page.blocks;
        this.texts = this.blocks;
        if (fresh && desktop) setTimeout(() => this.titleField()?.nativeElement.select());
      },
      error: () => this.toasts.fail('library.pageLoadError'),
    });
  }

  // The blocks it opened with (the editor reads them once)
  protected texts: PageBlock[] = [];

  protected typedTitle(value: string): void {
    this.title.set(value);
    this.changed();
  }

  protected typedBlocks(blocks: PageBlock[]): void {
    this.blocks = blocks;
    this.changed();
  }

  // Enter in the title: on into the text
  protected titleDone(): void {
    this.editor()?.focusStart();
  }

  // The page as text for the AI: its title, then its blocks
  protected pageText(): string {
    return [this.title(), this.editor()?.text() ?? ''].filter(Boolean).join('\n\n');
  }

  private changed(): void {
    this.dirty = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), SAVE_AFTER_MS);
  }

  /** The change saved now (if there's one): the title (else "Untitled") and the blocks (the empty ones left out). */
  private flush(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    if (!this.dirty || !this.page()) return;
    this.dirty = false;
    const title = this.title().trim() || this.i18n.t('library.untitled');
    this.saving.set(true);
    this.saveSub?.unsubscribe();
    const id = this.page()!.id;
    this.saveSub = this.store.save(id, title, this.blocks.filter((b) => b.text?.trim())).subscribe({
      next: (page) => {
        this.saving.set(false);
        // (its times, for the menu)
        this.page.update((p) => (p?.id === page.id ? { ...p, updatedAt: page.updatedAt } : p));
      },
      error: () => {
        this.saving.set(false);
        this.toasts.fail('library.saveError');
        this.dirty = true; // (tried again with the next change)
      },
    });
  }

  // ⋯ → Duplicate: a copy of it (what's typed in it too), opened
  protected duplicate(): void {
    this.flush();
    this.store.duplicate(this.id(), this.title(), this.blocks.filter((b) => b.text?.trim()));
  }

  // "26 Oct, 15:02"
  protected when(at: string): string {
    return this.i18n.day(at, true);
  }

  // Publish: its link made and copied (a toast says so); off: the link answers nothing any more
  protected share(on: boolean): void {
    const page = this.page();
    if (!page) return;
    this.store.share(page.id, on).subscribe({
      next: (p) => {
        this.page.update((x) => (x ? { ...x, shareToken: p.shareToken } : x));
        if (on) this.copyLink(this.i18n.t('library.publishedCopied'));
      },
      error: () => this.toasts.fail('library.shareError'),
    });
  }

  // "Published" clicked: Unpublish — asked first (the link stops working)
  protected async unshare(e: Event): Promise<void> {
    const yes = await this.confirm.ask(e.currentTarget as HTMLElement, {
      text: this.i18n.t('library.unshareAsk'),
      yes: this.i18n.t('library.unpublish'),
      danger: true,
    });
    if (yes) this.share(false);
  }

  protected copyLink(note = this.i18n.t('library.linkCopied')): void {
    const token = this.page()?.shareToken;
    if (!token) return;
    navigator.clipboard?.writeText(shareUrl(token)).then(
      () => this.toasts.show(note),
      () => {},
    );
  }

  // ⋯ → Preview: the page as it'd be read (its "only for me" blocks left out), in a new tab — saved first
  protected preview(): void {
    this.flush();
    const id = this.page()?.id;
    if (id) window.open(`/preview/${id}`, '_blank', 'noopener');
  }

  // Phones: the link sent by the system's own share sheet (Messages, Mail, …)
  protected shareLink(): void {
    const token = this.page()?.shareToken;
    if (token) navigator.share?.({ title: this.title(), url: shareUrl(token) }).catch(() => {});
  }

  // Its tags: picked at the top row (the library's list follows)
  protected setTags(tagIds: string[]): void {
    const page = this.page();
    if (!page) return;
    this.page.set({ ...page, tagIds });
    this.store.setTags(page.id, tagIds).subscribe({ error: () => this.page.update((x) => (x ? { ...x, tagIds: page.tagIds } : x)) });
  }

  protected favorite(): void {
    const page = this.page();
    if (!page) return;
    const on = !page.favorite;
    this.page.set({ ...page, favorite: on });
    this.store.favorite(page.id, on).subscribe({ error: () => this.page.update((x) => (x ? { ...x, favorite: !on } : x)) });
  }

  protected delete(): void {
    this.dirty = false;
    this.store.delete(this.page()?.id ?? this.id(), () => this.router.navigateByUrl('/library'));
  }
}
