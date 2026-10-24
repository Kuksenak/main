import { Component, DestroyRef, inject, input, output, signal } from '@angular/core';
import { VisibleArea } from '../../services/visible-area';

/**
 * Phones: a sheet from the bottom (as iOS 26's): see-through glass over a strong blur, big round
 * corners, just in from the screen's edges; as tall as its content (up to 90% of the screen), or
 * `tall`: from the top bar's buttons (a little over them) down — a fixed height, so pages switching
 * inside it don't make it jump. Drag it down by the top, tap outside or press Esc: it slides away,
 * then `closed` fires. Render it with @if; `close()` from inside (e.g. after a pick) does the same.
 * A head row (‹ back, a page's name, a field) goes in with `sheetHead`: it stays put while what's
 * under it scrolls; without one, the first block starts a little under the grabber. With the
 * keyboard up, it sits over it (VisibleArea).
 *   @if (open()) { <ui-sheet #sheet (closed)="open.set(false)">…</ui-sheet> }
 */
@Component({
  selector: 'ui-sheet',
  // (on the part of the screen that's seen: with the keyboard up, over it, not behind it)
  host: { class: 'fixed inset-x-0 z-40', '[style.top.px]': 'area.top()', '[style.height.px]': 'area.height()' },
  templateUrl: './sheet.html',
})
export class UiSheet {
  readonly tall = input(false);
  readonly closed = output<void>();

  protected readonly area = inject(VisibleArea);

  // In a phone's browser (not the installed app): a bit higher, clear of its bottom bar
  protected readonly inBrowser = !(
    matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone
  );

  protected readonly closing = signal(false);
  protected readonly dragY = signal(0);
  protected readonly dragging = signal(false);
  private startY = 0;

  constructor() {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && this.close();
    document.addEventListener('keydown', onKey);
    inject(DestroyRef).onDestroy(() => document.removeEventListener('keydown', onKey));
  }

  close(): void {
    if (this.closing()) return;
    this.dragging.set(false);
    this.closing.set(true);
    // (once the slide away has played)
    setTimeout(() => this.closed.emit(), 380);
  }

  protected dragStart(e: TouchEvent): void {
    this.dragging.set(true);
    this.startY = e.touches[0]?.clientY ?? 0;
  }

  protected dragMove(e: TouchEvent): void {
    if (this.dragging()) this.dragY.set(Math.max(0, (e.touches[0]?.clientY ?? 0) - this.startY));
  }

  // Dragged far enough: away; else back up
  protected dragEnd(): void {
    if (!this.dragging()) return;
    this.dragging.set(false);
    if (this.dragY() > 100) this.close();
    else this.dragY.set(0);
  }
}
