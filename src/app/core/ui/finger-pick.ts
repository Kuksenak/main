import { Directive, ElementRef, OnDestroy, inject } from '@angular/core';

/**
 * iOS-menu touch: while a finger moves over the container, a highlight slides under the item
 * it's on (items are `[data-pick]`), and lifting the finger picks that item (its click). A plain
 * tap still works as usual. `<div appFingerPick>…<button data-pick>…</button>…</div>`
 */
@Directive({
  selector: '[appFingerPick]',
  host: {
    class: 'relative',
    '(touchstart)': 'track($event)',
    '(touchmove)': 'track($event)',
    '(touchend)': 'end($event)',
    '(touchcancel)': 'hide()',
  },
})
export class FingerPick implements OnDestroy {
  private readonly host: HTMLElement = inject(ElementRef).nativeElement;
  private readonly highlight = document.createElement('div');
  private current: HTMLElement | null = null;
  private point: { x: number; y: number } | null = null;
  private frame = 0;

  constructor() {
    this.highlight.style.cssText =
      'position:absolute;left:0;right:0;pointer-events:none;opacity:0;border-radius:0.875rem;' +
      'background:var(--highlight);transition:top 150ms ease-out,height 150ms ease-out,opacity 120ms';
    this.host.prepend(this.highlight);
  }

  protected track(e: TouchEvent): void {
    const t = e.touches[0];
    this.point = { x: t.clientX, y: t.clientY };
    if (this.frame) return;
    // At most once per frame, and only when the finger reaches another item.
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      const p = this.point;
      if (!p) return;
      const el = (document.elementFromPoint(p.x, p.y) as HTMLElement | null)?.closest<HTMLElement>('[data-pick]');
      const item = el && this.host.contains(el) ? el : null;
      if (item === this.current) return;
      this.current = item;
      if (!item) {
        this.highlight.style.opacity = '0';
        return;
      }
      this.highlight.style.top = `${item.offsetTop}px`;
      this.highlight.style.height = `${item.offsetHeight}px`;
      this.highlight.style.opacity = '1';
    });
  }

  // Lifting the finger on an item picks it (the tap's own click is skipped).
  protected end(e: TouchEvent): void {
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    const item = this.current;
    this.hide();
    if (!item) return;
    e.preventDefault();
    item.click();
  }

  protected hide(): void {
    this.current = null;
    this.point = null;
    this.highlight.style.opacity = '0';
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.frame);
  }
}
