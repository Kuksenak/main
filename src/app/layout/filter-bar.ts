import { afterNextRender, Component, DestroyRef, ElementRef, inject, output, signal, viewChild } from '@angular/core';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { VisibleArea } from '../core/services/visible-area';
import { Icon } from '../core/ui';
import { PageFilter } from './page-filter';

/**
 * Phones: the filter of the open page (PageFilter; the top bar's funnel) — its field on a glass
 * capsule at the bottom (as iOS 26's), just over the keyboard (and its own bar: the system's, which
 * a page can't change); the page stays seen and shows only what matches while it's typed.
 * Search on the keyboard puts the keyboard away (the filter stays, the capsule at the bottom);
 * ✕ or Esc clears it and closes it.
 */
@Component({
  selector: 'app-filter-bar',
  imports: [Icon, TranslatePipe],
  templateUrl: './filter-bar.html',
})
export class FilterBar {
  readonly closed = output<void>();

  protected readonly filter = inject(PageFilter);
  protected readonly area = inject(VisibleArea);
  private readonly field = viewChild.required<ElementRef<HTMLInputElement>>('field');
  // (the field in use: the keyboard's up — the capsule just over it, not over the home indicator)
  protected readonly typing = signal(false);

  constructor() {
    // (focused at once: iOS opens the keyboard only while the tap that opened it is going on)
    afterNextRender(() => this.field().nativeElement.focus());
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && this.close();
    document.addEventListener('keydown', onKey);
    inject(DestroyRef).onDestroy(() => document.removeEventListener('keydown', onKey));
  }

  protected close(): void {
    this.filter.query.set('');
    this.closed.emit();
  }

  // The keyboard's Search: the keyboard away, what's filtered stays
  protected submit(e: Event): void {
    e.preventDefault();
    this.field().nativeElement.blur();
  }
}
