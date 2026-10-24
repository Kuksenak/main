import { Component, computed, DestroyRef, ElementRef, inject, input, OnInit, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { UiButton } from '../core/ui';
import { PageTitle } from '../layout/page-title';
import { Page, LibraryStore } from './library.store';

// How long after the last keystroke a change is saved
const SAVE_AFTER_MS = 700;

/**
 * A page of the library (/library/:id): its title and its text, edited right there and saved by
 * themselves a moment after the typing stops (and on leaving). A new one ("Untitled") opens with its
 * title selected. Delete: the page gone, back to the library. Phones: the title in the top bar,
 * ‹ back to the library.
 */
@Component({
  selector: 'app-page',
  imports: [TranslatePipe, UiButton],
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
  protected readonly text = signal('');

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
        this.text.set(page.blocks.map((b) => b.text ?? '').join('\n\n'));
        if (fresh) setTimeout(() => this.titleField()?.nativeElement.select());
      },
      error: () => this.loadError.set(true),
    });
  }

  protected typed(field: 'title' | 'text', value: string): void {
    (field === 'title' ? this.title : this.text).set(value);
    this.dirty = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), SAVE_AFTER_MS);
  }

  /** The change saved now (if there's one): the title (else "Untitled") and the text as one block. */
  private flush(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    if (!this.dirty || !this.page()) return;
    this.dirty = false;
    const title = this.title().trim() || this.i18n.t('library.untitled');
    const text = this.text().trim();
    this.saving.set(true);
    this.saveError.set(false);
    this.saveSub?.unsubscribe();
    this.saveSub = this.store.save(this.id(), title, text ? [{ kind: 'text', text }] : []).subscribe({
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

  // The text's box as tall as its text (no scrollbar of its own: the page scrolls)
  protected grow(area: HTMLTextAreaElement): void {
    area.style.height = 'auto';
    area.style.height = `${area.scrollHeight}px`;
  }
}
