import { Component, computed, ElementRef, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { PortalModule } from '@angular/cdk/portal';
import { SheetRef } from './sheet';

@Component({
  selector: 'app-sheet-container',
  imports: [PortalModule],
  template: `
    <div
      class="flex shrink-0 items-center px-3 pb-1 pt-3 touch-none"
      (pointerdown)="onBarDown($event)"
      (pointermove)="onMove($event)"
      (pointerup)="onUp($event)"
      (pointercancel)="onUp($event)"
    >
      <button type="button" aria-label="Close" (click)="sheetRef.close()" class="icon-btn">
        <svg viewBox="0 0 24 24" fill="none" class="size-6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M6 6 18 18M18 6 6 18" />
        </svg>
      </button>
    </div>

    <div
      class="relative min-h-0 flex-1 overflow-hidden"
      (pointerdown)="onContentDown($event)"
      (pointermove)="onContentMove($event)"
      (pointerup)="onUp($event)"
      (pointercancel)="onUp($event)"
    >
      <ng-template [cdkPortalOutlet]="sheetRef.contentPortal"></ng-template>
    </div>
  `,
  host: {
    class:
      'flex w-full flex-col overflow-hidden rounded-t-[36px] ' +
      'bg-[var(--sheet-bg)] will-change-transform ' +
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
  private candidate = false;
  private scroller: HTMLElement | null = null;

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
    if (animate && !this.dragging) {
      this.transition.set('transform 0.25s ease, height 0.25s ease');
    }
    this.viewportOffset.set(vv?.offsetTop ?? 0);
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

  onBarDown(e: PointerEvent): void {
    this.beginDrag(e);
  }

  onContentDown(e: PointerEvent): void {
    this.startY = e.clientY;
    this.candidate = true;
    this.scroller = this.scrollableAt(e.target as HTMLElement);
  }

  onContentMove(e: PointerEvent): void {
    if (this.dragging) {
      this.follow(e);
      return;
    }
    if (!this.candidate) return;

    const delta = e.clientY - this.startY;
    const atTop = !this.scroller || this.scroller.scrollTop <= 0;

    if (delta > 6 && atTop) {
      this.beginDrag(e);
    } else if (delta < -4 || !atTop) {
      this.candidate = false;
    }
  }

  onMove(e: PointerEvent): void {
    if (this.dragging) this.follow(e);
  }

  onUp(e: PointerEvent): void {
    this.candidate = false;
    if (!this.dragging) return;
    this.dragging = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}

    if (this.dragDelta() > 110) {
      this.sheetRef.close();
    } else {
      this.transition.set('transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)');
      this.dragDelta.set(0);
    }
  }

  private beginDrag(e: PointerEvent): void {
    this.startY = e.clientY - this.dragDelta();
    this.dragging = true;
    this.candidate = false;
    this.transition.set('none');
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
  }

  private follow(e: PointerEvent): void {
    const delta = e.clientY - this.startY;
    this.dragDelta.set(delta > 0 ? delta : delta * 0.2);
  }

  private scrollableAt(el: HTMLElement | null): HTMLElement | null {
    let node = el;
    const host = this.el.nativeElement;
    while (node && node !== host) {
      const oy = getComputedStyle(node).overflowY;
      if ((oy === 'auto' || oy === 'scroll') && node.scrollHeight > node.clientHeight) {
        return node;
      }
      node = node.parentElement;
    }
    return null;
  }
}
