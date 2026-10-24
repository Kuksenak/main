import { Component, computed, DestroyRef, ElementRef, inject, input, OnInit, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { desktop } from '../core/device';
import { Toasts, UiButton, UiSheet } from '../core/ui';
import { PageTitle } from '../layout/page-title';
import { AiChat } from './ai-chat';
import { Page, LibraryStore } from './library.store';
import { PageEditor } from './page-editor';

// How long after the last keystroke a change is saved
const SAVE_AFTER_MS = 700;

/**
 * A page of the library (/library/:id): its title and its text (PageEditor: blocks, "/", B I U S,
 * ⠿), edited right there and saved by themselves a moment after the typing stops (and on leaving).
 * A new one ("Untitled") opens with its title selected; Enter in the title goes on into the text.
 * AI (the editor's "/" or its bar, desktop: the button at the top): its chat (AiChat) — a sheet
 * (phones) or a panel at the right (desktop); its texts go in after the caret's block.
 * Delete: the page gone, back to the library. Phones: the title in the top bar, ‹ back to the
 * library.
 */
@Component({
  selector: 'app-page',
  imports: [AiChat, PageEditor, TranslatePipe, UiButton, UiSheet],
  templateUrl: './page.html',
})
export class PageView implements OnInit {
  /** The page's id (the route's :id). */
  readonly id = input.required<string>();

  private readonly store = inject(LibraryStore);
  private readonly router = inject(Router);
  private readonly i18n = inject(I18nService);

  protected readonly page = signal<Page | null>(null);
  private readonly toasts = inject(Toasts);
  protected readonly saving = signal(false);

  // What's being edited (the page's as loaded, then as typed)
  protected readonly title = signal('');
  private blocks: string[] = [];
  protected readonly desktop = desktop;
  protected readonly aiOpen = signal(false);
  protected readonly editor = viewChild(PageEditor);

  private readonly titleField = viewChild<ElementRef<HTMLInputElement>>('titleField');
  private timer: ReturnType<typeof setTimeout> | null = null;
  private dirty = false;
  private saveSub: Subscription | null = null;

  constructor() {
    inject(PageTitle).show(computed(() => this.title() || this.i18n.t('library.untitled')), '/library');
    // (leaving with a change not saved yet: saved now)
    inject(DestroyRef).onDestroy(() => this.flush());
  }

  ngOnInit(): void {
    // (a page just made: its title selected, to type over)
    const fresh = !!(history.state as { fresh?: boolean } | null)?.fresh;
    this.store.get(this.id()).subscribe({
      next: (page) => {
        this.page.set(page);
        this.title.set(page.title);
        this.blocks = page.blocks.map((b) => b.text ?? '');
        this.texts = this.blocks;
        if (fresh) setTimeout(() => this.titleField()?.nativeElement.select());
      },
      error: () => this.toasts.error(this.i18n.t('library.pageLoadError')),
    });
  }

  // The blocks it opened with (the editor reads them once)
  protected texts: string[] = [];

  protected typedTitle(value: string): void {
    this.title.set(value);
    this.changed();
  }

  protected typedBlocks(blocks: string[]): void {
    this.blocks = blocks;
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
    this.saveSub = this.store.save(this.id(), title, this.blocks.filter((t) => t.trim()).map((text) => ({ kind: 'text' as const, text }))).subscribe({
      next: () => this.saving.set(false),
      error: () => {
        this.saving.set(false);
        this.toasts.error(this.i18n.t('library.saveError'));
        this.dirty = true; // (tried again with the next change)
      },
    });
  }

  protected delete(): void {
    this.dirty = false;
    this.store.delete(this.id()).subscribe({
      next: () => this.router.navigateByUrl('/library'),
      error: () => this.toasts.error(this.i18n.t('library.deleteError')),
    });
  }
}
