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
import { DeviceDetectionService } from '../../services/device-detection.service';

/**
 * Scrollable area whose scroll indicator sits just outside its right edge (beside a card or
 * popover, not on top of its white surface). The native scrollbar is hidden.
 *
 *   <app-scroll-area class="min-h-0 flex-1" viewportClass="card">…rows…</app-scroll-area>
 *
 * `viewportClass` styles the scrolling element itself (e.g. `card`, so its rounded corners stay
 * put while the content scrolls inside); the content is a full-height flex column (extend it
 * with `contentClass`). The scrolling element has the cards' corners: a card scrolling past its
 * edge stays rounded instead of being cut straight (`!rounded-none` in `viewportClass` where it
 * sits inside a card; labels on phones are inset clear of the corner, see .card-label). The
 * thumb sits 10px (desktop: 6px) outside the content edge, the same everywhere; padding on the
 * host is the room it sits in. (The mask and isolation: iOS Safari otherwise sometimes stops
 * clipping a rounded scrolling box while it scrolls — rows drawn over what's above it.)
 */
@Component({
  selector: 'app-scroll-area',
  host: { class: 'flex min-h-0 flex-col', '[class.is-scrolled]': 'scrolled()' },
  template: `
    <!-- Positioning box = the content edge, so padding on the host leaves room for the thumb -->
    <div class="relative flex min-h-0 flex-1 flex-col">
      @if (thumb(); as t) {
        <div
          class="scroll-indicator"
          [style.right.px]="-gutter"
          [style.top]="track(t.top, true)"
          [style.height]="track(t.height)"
          [style.opacity]="scrolling() ? 1 : 0.5"
        ></div>
      }
      <div
        #viewport
        class="no-scrollbar relative isolate min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-[var(--radius-card)] [-webkit-mask-image:-webkit-radial-gradient(white,black)]"
        [class]="viewportClass()"
        (scroll)="onScroll()"
      >
        <div #content class="flex min-h-full flex-col" [class]="contentClass()"><ng-content /></div>
      </div>
    </div>
  `,
})
export class ScrollArea {
  readonly viewportClass = input(''); // the scrolling element (e.g. `card`)
  readonly contentClass = input(''); // the content column inside it (e.g. `gap-3`)
  // How far outside the content edge the thumb sits — the same everywhere on a device: clear of
  // the cards on phones, a little closer on desktop.
  protected readonly gutter = inject(DeviceDetectionService).isMobile() ? 10 : 6;
  /** Room kept free above and below the thumb's track, px (e.g. a popup's pinned head, its corners). */
  readonly thumbInset = input<[number, number]>([0, 0]);

  // A % of the track as CSS: within the room left between the insets
  protected track(pct: number, offset = false): string {
    const [top, bottom] = this.thumbInset();
    if (!top && !bottom) return `${pct}%`;
    return `calc(${offset ? top : 0}px + ${pct.toFixed(3)} * (100% - ${top + bottom}px) / 100)`;
  }

  private readonly viewport = viewChild.required<ElementRef<HTMLElement>>('viewport');
  private readonly content = viewChild.required<ElementRef<HTMLElement>>('content');

  // Thumb position/size in % of the area; null when everything fits.
  protected readonly thumb = signal<{ top: number; height: number } | null>(null);
  protected readonly scrolling = signal(false);
  /** Scrolled down from its top (its host gets .is-scrolled: e.g. the sidebar's line over its list). */
  readonly scrolled = signal(false);
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
    this.scrolled.set(el.scrollTop > 0);
    if (el.scrollHeight <= el.clientHeight + 1) {
      this.thumb.set(null);
      return;
    }
    const height = Math.max(10, (el.clientHeight / el.scrollHeight) * 100);
    const top = (el.scrollTop / (el.scrollHeight - el.clientHeight)) * (100 - height);
    this.thumb.set({ top, height });
  }
}
