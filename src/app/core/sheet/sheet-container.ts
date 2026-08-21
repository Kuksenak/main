import { Component, computed, ElementRef, inject, OnDestroy, OnInit, signal } from '@angular/core';
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
      'bg-[var(--surface)] will-change-transform dark:border-white/10 ' +
      'mt-[calc(env(safe-area-inset-top,20px)+8px)]',
    '[style.height]': 'height()',
    '[style.transform]': 'transform()',
    '[style.transition]': 'transition()',
  },
})
export class SheetContainer implements OnInit, OnDestroy {
  private el = inject<ElementRef<HTMLElement>>(ElementRef);

  sheetRef!: SheetRef;

  private open = signal(false);
  private dragDelta = signal(0);
  private viewportOffset = signal(0);
  protected transition = signal('none');
  protected height = signal('100dvh');

  protected transform = computed(() =>
    this.open()
      ? `translate3d(0, ${this.viewportOffset() + this.dragDelta()}px, 0)`
      : 'translate3d(0, 100%, 0)',
  );

  private gap = 0;
  private startY = 0;
  private dragging = false;

  ngOnInit(): void {
    this.gap = parseFloat(getComputedStyle(this.el.nativeElement).marginTop) || 0;
    this.updateHeight(false);

    window.visualViewport?.addEventListener('resize', this.onViewport);
    window.visualViewport?.addEventListener('scroll', this.onViewport);
    window.addEventListener('resize', this.onViewport);
  }

  ngOnDestroy(): void {
    window.visualViewport?.removeEventListener('resize', this.onViewport);
    window.visualViewport?.removeEventListener('scroll', this.onViewport);
    window.removeEventListener('resize', this.onViewport);
  }

  private onViewport = (): void => this.updateHeight(true);

  private updateHeight(animate: boolean): void {
    const vv = window.visualViewport;
    const visible = vv?.height ?? window.innerHeight;
    const offset = vv?.offsetTop ?? 0;

    if (animate && !this.dragging) {
      this.transition.set('transform 0.25s ease, height 0.25s ease');
    }
    this.viewportOffset.set(offset);
    this.height.set(`${Math.round(visible - this.gap)}px`);
  }

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
