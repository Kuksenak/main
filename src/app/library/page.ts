import { Component, computed, DestroyRef, ElementRef, inject, input, OnInit, signal, viewChild } from '@angular/core';
import type { JSONContent } from '@tiptap/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { UiButton } from '../core/ui';
import { PageTitle } from '../layout/page-title';
import { PageEditor } from './editor';
import { Page, LibraryStore } from './library.store';

// How long after the last keystroke a change is saved
const SAVE_AFTER_MS = 700;

/**
 * A page of the library (/library/:id): its title and its content (PageEditor: text, headings,
 * lists, …), edited right there and saved by themselves a moment after the typing stops (and on
 * leaving). A new one ("Untitled") opens with its title selected; Enter in the title goes on into
 * the text. Delete: the page gone, back to the library. Phones: the title in the top bar,
 * ‹ back to the library.
 */
@Component({
  selector: 'app-page',
  imports: [PageEditor, TranslatePipe, UiButton],
  templateUrl: './page.html',
})
export class PageView implements OnInit {
  /** The page's id (the route's :id). */
  readonly id = input.required<string>();

  private readonly store = inject(LibraryStore);
  private readonly router = inject(Router);
  private readonly i18n = inject(I18nService);

  protected readonly page = signal<Page | null>(null);
  protected readonly loadError = signal(false);
  protected readonly saveError = signal(false);
  protected readonly saving = signal(false);

  // What's being edited (the page's as loaded, then as typed)
  protected readonly title = signal('');
  private content: JSONContent | null = null;

  private readonly titleField = viewChild<ElementRef<HTMLInputElement>>('titleField');
  private readonly editor = viewChild(PageEditor);
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
        this.content = page.content;
        if (fresh) setTimeout(() => this.titleField()?.nativeElement.select());
      },
      error: () => this.loadError.set(true),
    });
  }

  protected typedTitle(value: string): void {
    this.title.set(value);
    this.changed();
  }

  protected typedContent(content: JSONContent): void {
    this.content = content;
    this.changed();
  }

  // Enter in the title: on into the text, at its start
  protected titleEnter(e: Event): void {
    e.preventDefault();
    this.editor()?.focus('start');
  }

  private changed(): void {
    this.dirty = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), SAVE_AFTER_MS);
  }

  /** The change saved now (if there's one): the title (else "Untitled") and the content. */
  private flush(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    if (!this.dirty || !this.page()) return;
    this.dirty = false;
    const title = this.title().trim() || this.i18n.t('library.untitled');
    this.saving.set(true);
    this.saveError.set(false);
    this.saveSub?.unsubscribe();
    this.saveSub = this.store.save(this.id(), title, this.content).subscribe({
      next: () => this.saving.set(false),
      error: () => {
        this.saving.set(false);
        this.saveError.set(true);
        this.dirty = true; // (tried again with the next change)
      },
    });
  }

  protected delete(): void {
    this.dirty = false;
    this.store.delete(this.id()).subscribe({
      next: () => this.router.navigateByUrl('/library'),
      error: () => this.saveError.set(true),
    });
  }
}
