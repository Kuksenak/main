import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';

/**
 * Scrollable area whose scroll indicator sits just outside its right edge (beside a card or
 * popover, not on top of its white surface). The native scrollbar is hidden.
 *
 *   <app-scroll-area class="min-h-0 flex-1" viewportClass="card">…rows…</app-scroll-area>
 *
 * `viewportClass` styles the scrolling element itself (e.g. `card`, so its rounded corners stay
 * put while the content scrolls inside); the content is a full-height flex column (extend it
 * with `contentClass`); `gutter` is how far outside the edge the thumb sits.
 */
@Component({
  selector: 'app-scroll-area',
  host: { class: 'relative flex min-h-0 flex-col' },
  template: `
    @if (thumb(); as t) {
      <div
        class="scroll-indicator"
        [style.right.px]="-gutter()"
        [style.top.%]="t.top"
        [style.height.%]="t.height"
        [style.opacity]="scrolling() ? 1 : 0.5"
      ></div>
    }
    <div
      #viewport
      class="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain"
      [class]="viewportClass()"
      (scroll)="onScroll()"
    >
      <div #content class="flex min-h-full flex-col" [class]="contentClass()"><ng-content /></div>
    </div>
  `,
})
export class ScrollArea {
  readonly viewportClass = input(''); // the scrolling element (e.g. `card`)
  readonly contentClass = input(''); // the content column inside it (e.g. `gap-3`)
  readonly gutter = input(10);

  private readonly viewport = viewChild.required<ElementRef<HTMLElement>>('viewport');
  private readonly content = viewChild.required<ElementRef<HTMLElement>>('content');

  // Thumb position/size in % of the area; null when everything fits.
  protected readonly thumb = signal<{ top: number; height: number } | null>(null);
  protected readonly scrolling = signal(false);
  private timer?: ReturnType<typeof setTimeout>;

  constructor() {
    const destroyRef = inject(DestroyRef);
    // Track size changes of both the area and its content (rows added, fonts loaded, …).
    afterNextRender(() => {
      const ro = new ResizeObserver(() => this.update());
      ro.observe(this.viewport().nativeElement);
      ro.observe(this.content().nativeElement);
      destroyRef.onDestroy(() => ro.disconnect());
    });
  }

  protected onScroll(): void {
    this.update();
    this.scrolling.set(true);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.scrolling.set(false), 800);
  }

  private update(): void {
    const el = this.viewport().nativeElement;
    if (el.scrollHeight <= el.clientHeight + 1) {
      this.thumb.set(null);
      return;
    }
    const height = Math.max(10, (el.clientHeight / el.scrollHeight) * 100);
    const top = (el.scrollTop / (el.scrollHeight - el.clientHeight)) * (100 - height);
    this.thumb.set({ top, height });
  }
}
