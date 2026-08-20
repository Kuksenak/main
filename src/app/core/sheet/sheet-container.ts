import { Component, signal } from '@angular/core';
import { PortalModule } from '@angular/cdk/portal';
import { SheetRef } from './sheet';

@Component({
  selector: 'app-sheet-container',
  imports: [PortalModule],
  template: `
    <div
      class="flex shrink-0 cursor-grab touch-none justify-center pb-1 pt-2.5 active:cursor-grabbing"
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
      'h-[calc(100dvh_-_env(safe-area-inset-top,20px)_-_10px)]',
    '[style.transform]': 'transform()',
    '[style.transition]': 'transition()',
  },
})
export class SheetContainer {
  sheetRef!: SheetRef;

  protected transform = signal('translate3d(0, 100%, 0)');
  protected transition = signal('none');

  private startY = 0;
  private dragging = false;

  enter(): void {
    this.transition.set('transform 0.5s cubic-bezier(0.32, 0.72, 0, 1)');
    this.transform.set('translate3d(0, 0, 0)');
  }

  leave(): void {
    this.transition.set('transform 0.45s cubic-bezier(0.32, 0.72, 0, 1)');
    this.transform.set('translate3d(0, 100%, 0)');
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
    if (delta > 0) {
      this.transform.set(`translate3d(0, ${delta}px, 0)`);
    }
  }

  onUp(e: PointerEvent): void {
    if (!this.dragging) return;
    this.dragging = false;
    const delta = e.clientY - this.startY;
    if (delta > 140) {
      this.sheetRef.close();
    } else {
      this.enter();
    }
  }
}
