import { Directive, ElementRef, OnDestroy, afterNextRender, inject, input } from '@angular/core';

/**
 * Phones: a scroll bar of its own (as iOS's: thin, gray, shown while scrolling) kept on the part that's
 * seen — between `barTop` / `barBottom` px from the box's edges (what's under a head or a top bar, or
 * the home indicator, scrolls on, the bar doesn't go there). The box's own bar hidden.
 *   <div uiScrollBar [barTop]="headHeight" [barBottom]="24" class="overflow-y-auto">…</div>
 */
@Directive({
  selector: '[uiScrollBar]',
  host: { class: '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden', '(scroll)': 'moved()' },
})
export class UiScrollBar implements OnDestroy {
  readonly barTop = input(0);
  readonly barBottom = input(0);

  private readonly box: HTMLElement = inject(ElementRef).nativeElement;
  private readonly thumb = document.createElement('div');
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    this.thumb.className =
      'pointer-events-none fixed z-[60] w-[3px] rounded-full bg-fg-secondary/60 opacity-0 transition-opacity duration-300';
    afterNextRender(() => document.body.appendChild(this.thumb));
  }

  protected moved(): void {
    const { scrollTop, scrollHeight, clientHeight } = this.box;
    if (scrollHeight <= clientHeight + 1) return;
    const r = this.box.getBoundingClientRect();
    const track = r.height - this.barTop() - this.barBottom() - 6;
    const h = Math.max(36, (track * clientHeight) / scrollHeight);
    const at = Math.min(1, Math.max(0, scrollTop / (scrollHeight - clientHeight)));
    Object.assign(this.thumb.style, {
      left: `${r.right - 6}px`,
      top: `${r.top + this.barTop() + 3 + at * (track - h)}px`,
      height: `${h}px`,
      opacity: '1',
    });
    clearTimeout(this.timer);
    this.timer = setTimeout(() => (this.thumb.style.opacity = '0'), 700);
  }

  ngOnDestroy(): void {
    clearTimeout(this.timer);
    this.thumb.remove();
  }
}
