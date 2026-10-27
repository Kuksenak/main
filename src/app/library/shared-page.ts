import { Component, inject, input, OnInit, signal } from '@angular/core';
import { map } from 'rxjs';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { LibraryStore, SharedPage } from './library.store';
import { shown } from './marks';

/**
 * A published page (/s/:token), for anyone with its link — no sign-in (or any of one's own, as it'd be
 * read: /preview/:id): its title and its blocks
 * (its "only for me" ones left out by the server), their marks as styles, read only. Not
 * published (any more), or in the trash: a line saying so.
 */
@Component({
  selector: 'app-shared-page',
  imports: [TranslatePipe],
  host: { class: 'block h-full overflow-y-auto' },
  templateUrl: './shared-page.html',
})
export class SharedPageView implements OnInit {
  /** The link's token (the route's :token) — or, a preview: the page's id (:id). */
  readonly token = input<string>();
  readonly id = input<string>();

  private readonly store = inject(LibraryStore);
  protected readonly page = signal<SharedPage | null>(null);
  protected readonly missing = signal(false);
  protected readonly shown = shown;

  ngOnInit(): void {
    const id = this.id();
    // (a preview: the page as it is, its "only for me" blocks left out here, as the server does)
    const page$ = id
      ? this.store.get(id).pipe(map((p): SharedPage => ({ title: p.title, blocks: p.blocks.filter((b) => !b.private) })))
      : this.store.shared(this.token() ?? '');
    page$.subscribe({
      next: (page) => {
        this.page.set(page);
        document.title = page.title;
      },
      error: () => this.missing.set(true),
    });
  }
}
