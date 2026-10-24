import { Component, computed, DestroyRef, effect, ElementRef, inject, signal, viewChild } from '@angular/core';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { VisibleArea } from '../core/services/visible-area';
import { Icon, UiFloatingButton } from '../core/ui';
import { PageFilter } from './page-filter';

/**
 * Phones: the filter of the open page (PageFilter) — its field on a glass capsule at the bottom
 * (as iOS 26's), just over the keyboard (and its own bar: the system's, which a page can't change),
 * ✕ a round button of its own at its right; the page stays where it is, seen, and shows only what
 * matches while it's typed. Search on the keyboard puts the keyboard away (the filter stays, the
 * capsule at the bottom); ✕ or Esc clears it and closes it.
 *
 * It's there (unseen) all the while a page offers a filter: the top bar's funnel calls `start()`,
 * which focuses the field during the tap (else iOS doesn't open the keyboard). The field is at the
 * top of the screen then, so iOS doesn't push the page up to show it; once the keyboard is up, it
 * shows just over it. (iOS pushing the page up anyway is undone: scrolled back to the top.)
 */
@Component({
  selector: 'app-filter-bar',
  imports: [Icon, TranslatePipe, UiFloatingButton],
  templateUrl: './filter-bar.html',
})
export class FilterBar {
  protected readonly filter = inject(PageFilter);
  protected readonly area = inject(VisibleArea);
  private readonly field = viewChild.required<ElementRef<HTMLInputElement>>('field');

  protected readonly open = signal(false);
  // (the field in use: the keyboard's up — the capsule just over it, not over the home indicator)
  protected readonly typing = signal(false);
  // (opened, the keyboard not up yet: unseen at the top a moment — at most 0.6s, for a keyboard
  // that never comes, e.g. a hardware one)
  private readonly waited = signal(false);
  protected readonly shown = computed(() => this.open() && (this.area.keyboard() > 0 || !this.typing() || this.waited()));

  constructor() {
    let timer = 0;
    effect(() => {
      if (!this.open()) return;
      clearTimeout(timer);
      timer = setTimeout(() => this.waited.set(true), 600);
    });
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && this.open() && this.close();
    // (iOS pushing the page up for the field: back to the top — the page stays put)
    const stay = () => this.open() && window.scrollY !== 0 && window.scrollTo(0, 0);
    document.addEventListener('keydown', onKey);
    window.visualViewport?.addEventListener('resize', stay);
    window.addEventListener('scroll', stay);
    inject(DestroyRef).onDestroy(() => {
      clearTimeout(timer);
      document.removeEventListener('keydown', onKey);
      window.visualViewport?.removeEventListener('resize', stay);
      window.removeEventListener('scroll', stay);
    });
  }

  // The funnel: opened, the field focused at once (during the tap)
  start(): void {
    this.waited.set(false);
    this.open.set(true);
    this.field().nativeElement.focus({ preventScroll: true });
  }

  protected close(): void {
    this.filter.query.set('');
    this.open.set(false);
    this.field().nativeElement.blur();
  }

  // The keyboard's Search: the keyboard away, what's filtered stays
  protected submit(e: Event): void {
    e.preventDefault();
    this.field().nativeElement.blur();
  }
}
