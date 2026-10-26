import { Component, computed, DestroyRef, effect, ElementRef, inject, input, signal, untracked, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription, switchMap } from 'rxjs';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { desktop } from '../core/device';
import { Toasts, UiButton, UiSheet } from '../core/ui';
import { UiMenu, UiMenuItem, UiMenuSeparator } from '../core/ui/menu';
import { PageTitle } from '../layout/page-title';
import { AiChat } from './ai-chat';
import { Page, PageBlock, LibraryStore } from './library.store';
import { PageEditor } from './page-editor';

// How long after the last keystroke a change is saved
const SAVE_AFTER_MS = 700;

/**
 * A page of the library (/library/:id): its title and its text (PageEditor: blocks, "/", B I U S,
 * ⠿), edited right there and saved by themselves a moment after the typing stops (and on leaving).
 * A new one ("Untitled") opens with its title selected; Enter in the title goes on into the text.
 * AI (the editor's "/" or its bar, desktop: the button at the top): its chat (AiChat) — a sheet
 * (phones) or a panel at the right (desktop); its texts go in after the caret's block.
 * Delete: the page gone, back to the library. Desktops: one row at the top — the title, the
 * assistant, ⋯ (Duplicate, Copy / Paste content, Delete; how many blocks, when edited, made).
 * Phones: the title in the top bar, ‹ back to the library.
 */
@Component({
  selector: 'app-page',
  imports: [AiChat, PageEditor, TranslatePipe, UiButton, UiMenu, UiMenuItem, UiMenuSeparator, UiSheet],
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
  protected readonly blockCount = signal(0);
  protected readonly editor = viewChild(PageEditor);

  private readonly titleField = viewChild<ElementRef<HTMLInputElement>>('titleField');
  private timer: ReturnType<typeof setTimeout> | null = null;
  private dirty = false;
  private saveSub: Subscription | null = null;

  constructor() {
    inject(PageTitle).show(computed(() => this.title() || this.i18n.t('library.untitled')), '/library');
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
        this.blockCount.set(page.blocks.length);
        if (fresh) setTimeout(() => this.titleField()?.nativeElement.select());
      },
      error: () => this.toasts.error(this.i18n.t('library.pageLoadError')),
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
    this.blockCount.set(blocks.filter((b) => b.text?.trim()).length);
    this.changed();
  }

  // Enter in the title: on into the text
  protected titleEnter(e: Event): void {
    e.preventDefault();
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
        this.toasts.error(this.i18n.t('library.saveError'));
        this.dirty = true; // (tried again with the next change)
      },
    });
  }

  // ⋯ → Duplicate: a copy of it (what's typed in it too), opened
  protected duplicate(): void {
    this.flush();
    const title = this.i18n.t('library.copyOf').replace('{title}', this.title().trim() || this.i18n.t('library.untitled'));
    const blocks = this.blocks.filter((b) => b.text?.trim());
    this.store
      .create(title)
      .pipe(switchMap((page) => this.store.save(page.id, title, blocks)))
      .subscribe({
        next: (page) => this.router.navigate(['/library', page.id]),
        error: () => this.toasts.error(this.i18n.t('library.duplicateError')),
      });
  }

  // ⋯ → Copy content: its blocks kept, to paste into another page (their text to the clipboard too)
  protected copyContent(): void {
    const blocks = this.editor()?.now() ?? [];
    this.store.clipboard.set(blocks);
    navigator.clipboard?.writeText(this.editor()?.text() ?? '').catch(() => {});
  }

  // ⋯ → Paste content: the blocks copied, at the end
  protected pasteContent(): void {
    this.editor()?.append(this.store.clipboard() ?? []);
  }

  // "26 Oct, 15:02"
  protected when(at: string): string {
    return this.i18n.date(new Date(at), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  protected delete(): void {
    this.dirty = false;
    this.store.delete(this.page()?.id ?? this.id()).subscribe({
      next: () => this.router.navigateByUrl('/library'),
      error: () => this.toasts.error(this.i18n.t('library.deleteError')),
    });
  }
}
