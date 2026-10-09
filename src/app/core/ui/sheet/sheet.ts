import { NgTemplateOutlet } from '@angular/common';
import { Component, DestroyRef, inject, input, output, signal } from '@angular/core';
import { ConnectedPosition, OverlayModule } from '@angular/cdk/overlay';
import { DeviceDetectionService } from '../../services/device-detection.service';
import { LayerStack } from '../../services/layer-stack.service';

/**
 * Layout for menus (info and actions, no inputs):
 * - mobile: floating bottom sheet (0.5rem inset, large continuous corners, sized to its
 *   content up to 90% of the screen, translucent glass); drag the grabber down
 *   or tap outside to dismiss;
 * - desktop: a dropdown anchored under `origin` via CDK overlay, or a centered dialog when
 *   no origin is given.
 * The content area is a flex column: give a list `min-h-0 flex-1` (e.g. an app-scroll-area)
 * to scroll just that list while headers / buttons around it stay put.
 * Forms use <app-page-sheet> instead.
 * Render it with @if; call close() to animate out, then `closed` fires.
 */
@Component({
  selector: 'app-sheet',
  imports: [OverlayModule, NgTemplateOutlet],
  template: `
    <ng-template #content><ng-content /></ng-template>

    @if (desktop && origin()) {
      <ng-template
        cdkConnectedOverlay
        [cdkConnectedOverlayOrigin]="origin()!"
        [cdkConnectedOverlayOpen]="!closing()"
        [cdkConnectedOverlayPositions]="positions"
        [cdkConnectedOverlayPush]="true"
        [cdkConnectedOverlayViewportMargin]="24"
        [cdkConnectedOverlayHasBackdrop]="true"
        cdkConnectedOverlayBackdropClass="cdk-overlay-transparent-backdrop"
        (backdropClick)="close()"
        (detach)="close()"
      >
        <!-- Kept inside the window: pushed back in, and never taller than it (then it scrolls) -->
        <div
          class="dialog-panel flex max-h-[calc(var(--app-h,100dvh)-3rem)] origin-top-right flex-col overflow-y-auto !rounded-[0.875rem] p-3 [animation:dropdownIn_160ms_var(--ease-out-quick)]"
          [class.w-72]="!wide()"
          [class.w-96]="wide()"
        >
          <ng-container [ngTemplateOutlet]="content" />
        </div>
      </ng-template>
    } @else {
      <div class="fixed inset-0 z-40 desktop:flex desktop:items-center desktop:justify-center desktop:p-4">
        <div
          class="absolute inset-0 [animation:fadeIn_280ms_ease-out]"
          [class.desktop:bg-[var(--backdrop)]]="!overDialog"
          [style.opacity]="closing() ? 0 : null"
          [style.transition]="'opacity 340ms ease-out'"
          (click)="close()"
        ></div>

        <div
          class="absolute inset-x-2 bottom-2 flex max-h-[calc(var(--app-h,100dvh)*0.9)] flex-col overflow-hidden [animation:sheetUp_380ms_var(--ease-ios)] mobile:rounded-[2.75rem] mobile:[corner-shape:squircle] desktop:relative desktop:inset-auto desktop:max-h-[calc(var(--app-h,100dvh)*0.9)] desktop:w-full desktop:max-w-sm"
          [class.dialog-panel]="desktop"
          [class.sheet-panel]="!desktop"
          [style.transform]="closing() ? 'translateY(calc(100% + 1rem))' : (dragY() ? 'translateY(' + dragY() + 'px)' : null)"
          [style.transition]="dragging() ? 'none' : closing() ? 'transform 360ms cubic-bezier(0.4, 0, 0.2, 1)' : 'transform 280ms var(--ease-ios)'"
        >
          <div
            class="shrink-0 touch-none px-4 pb-4 pt-2.5 desktop:pb-0 desktop:pt-4"
            (touchstart)="dragStart($event)"
            (touchmove)="dragMove($event)"
            (touchend)="dragEnd()"
            (touchcancel)="dragEnd()"
          >
            <div class="grabber desktop:hidden"></div>
          </div>

          <div class="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-2 desktop:px-4 desktop:pb-4">
            <ng-container [ngTemplateOutlet]="content" />
          </div>
        </div>
      </div>
    }
  `,
})
export class Sheet {
  /** Desktop anchor: the button that opened the menu. */
  readonly origin = input<HTMLElement | null>(null);
  /** Desktop dropdown: wider (24rem instead of 18rem). */
  readonly wide = input(false);
  readonly closed = output<void>();

  protected readonly desktop = !inject(DeviceDetectionService).isMobile();
  // Desktop: a layer over the cards (the card under it dims itself; no extra window dimming).
  private readonly layers = inject(LayerStack);
  private readonly layer = this.desktop ? this.layers.add(false) : 0;
  protected readonly overDialog = this.desktop && this.layers.overPage(this.layer);

  constructor() {
    inject(DestroyRef).onDestroy(() => this.layer && this.layers.remove(this.layer));
  }

  // Under the anchor, right-aligned; flips above when there's no room below.
  protected readonly positions: ConnectedPosition[] = [
    { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 8 },
    { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -8 },
  ];

  protected readonly closing = signal(false);
  protected readonly dragY = signal(0);
  protected readonly dragging = signal(false);
  private startY = 0;

  close(): void {
    if (this.closing()) return;
    this.dragging.set(false);
    this.closing.set(true);
    // The dropdown just disappears; the sheet/dialog slides out first.
    const anchored = this.desktop && this.origin();
    // Only once the slide-away has fully played (cutting it short looked jumpy).
    setTimeout(() => this.closed.emit(), anchored ? 0 : 380);
  }

  protected dragStart(e: TouchEvent): void {
    this.dragging.set(true);
    this.startY = e.touches[0]?.clientY ?? 0;
  }

  protected dragMove(e: TouchEvent): void {
    if (!this.dragging()) return;
    this.dragY.set(Math.max(0, (e.touches[0]?.clientY ?? 0) - this.startY));
  }

  protected dragEnd(): void {
    if (!this.dragging()) return;
    this.dragging.set(false);
    if (this.dragY() > 100) this.close();
    else this.dragY.set(0);
  }
}
