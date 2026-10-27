import { Component, inject, input, OnInit, signal } from '@angular/core';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { LibraryStore, SharedPage } from './library.store';
import { shown } from './marks';

/**
 * A published page (/s/:token), for anyone with its link — no sign-in: its title and its blocks
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
  /** The link's token (the route's :token). */
  readonly token = input.required<string>();

  private readonly store = inject(LibraryStore);
  protected readonly page = signal<SharedPage | null>(null);
  protected readonly missing = signal(false);
  protected readonly shown = shown;

  ngOnInit(): void {
    this.store.shared(this.token()).subscribe({
      next: (page) => {
        this.page.set(page);
        document.title = page.title;
      },
      error: () => this.missing.set(true),
    });
  }
}
