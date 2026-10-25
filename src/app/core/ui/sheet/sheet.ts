import { afterNextRender, Component, DestroyRef, ElementRef, inject, input, output, signal, viewChild } from '@angular/core';
import { refreshThemeColor } from '../../services/theme-color';
import { VisibleArea } from '../../services/visible-area';

/**
 * Phones: a sheet from the bottom (as iOS 26's): see-through glass over a strong blur, big round
 * corners, just in from the screen's sides, right at its bottom; as tall as its content (up to 90% of the screen), or
 * `tall`: from the top bar's buttons (a little over them) down — a fixed height, so pages switching
 * inside it don't make it jump. Pulled down (anywhere: what's in it scrolled to its top, a pull
 * down moves the sheet, not it) far enough or flicked down, a tap outside or Esc: it slides away,
 * then `closed` fires. Render it with @if; `close()` from inside (e.g. after a pick) does the same.
 * A head row (‹ back, a page's name, a field) goes in with `sheetHead`: it stays put while what's
 * under it scrolls; without one, the first block starts half a head row under the grabber. With the
 * keyboard up, it sits over it (VisibleArea).
 *   @if (open()) { <ui-sheet #sheet (closed)="open.set(false)">…</ui-sheet> }
 */
@Component({
  selector: 'ui-sheet',
  // (on the part of the screen that's seen: with the keyboard up, over it, not behind it)
  // (no keyboard: the whole screen, down under the browser's own bar — 100lvh; with one: the part
  // that's seen, over the keyboard)
  host: {
    class: 'fixed inset-x-0 z-40',
    '[style.top.px]': 'area.keyboard() ? area.top() : 0',
    '[style.height]': "area.keyboard() ? area.height() + 'px' : '100lvh'",
  },
  templateUrl: './sheet.html',
})
export class UiSheet {
  readonly tall = input(false);
  readonly closed = output<void>();

  protected readonly area = inject(VisibleArea);


  protected readonly closing = signal(false);
  protected readonly dragY = signal(0);
  protected readonly dragging = signal(false);

  private readonly panel = viewChild.required<ElementRef<HTMLElement>>('panel');
  private readonly scroller = viewChild.required<ElementRef<HTMLElement>>('scroller');

  constructor() {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && this.close();
    document.addEventListener('keydown', onKey);
    inject(DestroyRef).onDestroy(() => document.removeEventListener('keydown', onKey));
    // (its own listeners: a pull must be able to stop the scrolling — not passive)
    afterNextRender(() => {
      const panel = this.panel().nativeElement;
      panel.addEventListener('touchstart', (e) => this.pullStart(e), { passive: true });
      panel.addEventListener('touchmove', (e) => this.pullMove(e), { passive: false });
      panel.addEventListener('touchend', () => this.pullEnd());
      panel.addEventListener('touchcancel', () => this.pullEnd());
    });
  }

  close(): void {
    if (this.closing()) return;
    this.dragging.set(false);
    this.closing.set(true);
    // (once the slide away has played; the status bar's color put in again: see refreshThemeColor)
    setTimeout(() => {
      this.closed.emit();
      refreshThemeColor();
    }, 380);
  }

  // A touch: not known yet whether it's a pull (the sheet down) or a scroll (what's in it)
  private pull: { mode: 'unknown' | 'pull' | 'scroll'; fromY: number; inScroller: boolean; y: number; t: number; speed: number } | null = null;

  private pullStart(e: TouchEvent): void {
    const y = e.touches[0]?.clientY ?? 0;
    const inScroller = this.scroller().nativeElement.contains(e.target as Node);
    this.pull = { mode: 'unknown', fromY: y, inScroller, y, t: e.timeStamp, speed: 0 };
  }

  private pullMove(e: TouchEvent): void {
    const pull = this.pull;
    if (!pull || this.closing()) return;
    const y = e.touches[0]?.clientY ?? 0;
    if (pull.mode === 'unknown') {
      const dy = y - pull.fromY;
      if (Math.abs(dy) < 6) return;
      // Down, and nothing above to scroll back to: the sheet's; else the scrolling's
      const atTop = !pull.inScroller || this.scroller().nativeElement.scrollTop <= 0;
      pull.mode = dy > 0 && atTop ? 'pull' : 'scroll';
      pull.fromY = y;
      if (pull.mode === 'pull') this.dragging.set(true);
    }
    if (pull.mode !== 'pull') return;
    e.preventDefault();
    // (how fast it goes down now, px/ms: a flick closes it even if short)
    if (e.timeStamp > pull.t) pull.speed = (y - pull.y) / (e.timeStamp - pull.t);
    pull.y = y;
    pull.t = e.timeStamp;
    this.dragY.set(Math.max(0, y - pull.fromY));
  }

  // Pulled far enough, or flicked: away; else back up
  private pullEnd(): void {
    const pull = this.pull;
    this.pull = null;
    if (pull?.mode !== 'pull') return;
    this.dragging.set(false);
    if (this.dragY() > 120 || pull.speed > 0.5) this.close();
    else this.dragY.set(0);
  }
}
