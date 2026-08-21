import { Component, computed, OnDestroy, OnInit, signal } from '@angular/core';
import { PortalModule } from '@angular/cdk/portal';
import { SheetRef } from './sheet';

@Component({
  selector: 'app-sheet-container',
  imports: [PortalModule],
  template: `
    <div
      class="flex shrink-0 cursor-grab touch-none justify-center py-3 active:cursor-grabbing"
      (pointerdown)="onDown($event)"
      (pointermove)="onMove($event)"
      (pointerup)="onUp($event)"
      (pointercancel)="onUp($event)"
    >
      <div class="h-1.5 w-10 rounded-full bg-black/20 dark:bg-white/25"></div>
    </div>

    <div class="relative min-h-0 flex-1 overflow-hidden">
      <ng-template [cdkPortalOutlet]="sheetRef.contentPortal"></ng-template>
    </div>
  `,
  host: {
    class:
      'flex w-full flex-col overflow-hidden rounded-t-[24px] border-t border-black/10 ' +
      'bg-[var(--surface)] will-change-transform dark:border-white/10',
    '[style.height]': 'heightStyle()',
    '[style.transform]': 'transform()',
    '[style.transition]': 'transition()',
  },
})
export class SheetContainer implements OnInit, OnDestroy {
  sheetRef!: SheetRef;

  private open = signal(false);
  private dragDelta = signal(0);
  private keyboardOffset = signal(0);
  private viewportHeight = signal<number | null>(null);

  protected transition = signal('none');

  protected transform = computed(() => {
    if (!this.open()) {
      return 'translate3d(0, 100%, 0)';
    }
    const y = this.dragDelta() - this.keyboardOffset();
    return `translate3d(0, ${y}px, 0)`;
  });

  protected heightStyle = computed(() => {
    const vh = this.viewportHeight();
    return vh !== null
      ? `${vh}px`
      : 'calc(100dvh - env(safe-area-inset-top, 20px) - 10px)';
  });

  private startY = 0;
  private dragging = false;

  ngOnInit(): void {
    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener('resize', this.onViewport);
      vv.addEventListener('scroll', this.onViewport);
    }
  }

  ngOnDestroy(): void {
    const vv = window.visualViewport;
    if (vv) {
      vv.removeEventListener('resize', this.onViewport);
      vv.removeEventListener('scroll', this.onViewport);
    }
  }

  private onViewport = (): void => {
    const vv = window.visualViewport;
    if (!vv) return;

    const keyboard = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);

    if (!this.dragging) {
      this.transition.set('transform 0.25s ease, height 0.25s ease');
    }

    if (keyboard > 80) {
      this.keyboardOffset.set(keyboard);
      this.viewportHeight.set(vv.height);
    } else {
      this.keyboardOffset.set(0);
      this.viewportHeight.set(null);
    }
  };

  enter(): void {
    this.transition.set('transform 0.5s cubic-bezier(0.32, 0.72, 0, 1)');
    this.open.set(true);
  }

  leave(): void {
    this.transition.set('transform 0.45s cubic-bezier(0.32, 0.72, 0, 1)');
    this.dragDelta.set(0);
    this.open.set(false);
  }

  onDown(e: PointerEvent): void {
    this.startY = e.clientY;
    this.dragging = true;
    this.transition.set('none');
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  onMove(e: PointerEvent): void {
    if (!this.dragging) return;
    const delta = e.clientY - this.startY;
    this.dragDelta.set(delta > 0 ? delta : delta * 0.2);
  }

  onUp(e: PointerEvent): void {
    if (!this.dragging) return;
    this.dragging = false;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);

    if (this.dragDelta() > 110) {
      this.sheetRef.close();
    } else {
      this.transition.set('transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)');
      this.dragDelta.set(0);
    }
  }
}
