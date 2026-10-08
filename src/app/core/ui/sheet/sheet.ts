import { NgTemplateOutlet } from '@angular/common';
import { Component, inject, input, output, signal } from '@angular/core';
import { ConnectedPosition, OverlayModule } from '@angular/cdk/overlay';
import { DeviceDetectionService } from '../../services/device-detection.service';

/**
 * Layout for menus (info and actions, no inputs):
 * - mobile: floating bottom sheet (8px inset, large continuous corners, half the screen,
 *   translucent glass); drag the grabber down or tap outside to dismiss;
 * - desktop: a dropdown anchored under `origin` via CDK overlay, or a centered dialog when
 *   no origin is given.
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
        [cdkConnectedOverlayHasBackdrop]="true"
        cdkConnectedOverlayBackdropClass="cdk-overlay-transparent-backdrop"
        (backdropClick)="close()"
        (detach)="close()"
      >
        <div class="dialog-panel w-72 origin-top-right !rounded-[14px] p-3 [animation:dropdownIn_160ms_var(--ease-out-quick)]">
          <ng-container [ngTemplateOutlet]="content" />
        </div>
      </ng-template>
    } @else {
      <div class="fixed inset-0 z-40 desktop:flex desktop:items-center desktop:justify-center desktop:p-4">
        <div
          class="absolute inset-0 [animation:fadeIn_280ms_ease-out] desktop:bg-[var(--backdrop)]"
          [style.opacity]="closing() ? 0 : null"
          [style.transition]="'opacity 240ms ease-out'"
          (click)="close()"
        ></div>

        <div
          class="absolute inset-x-2 bottom-2 flex h-[50dvh] flex-col overflow-hidden [animation:sheetUp_380ms_var(--ease-ios)] mobile:rounded-[44px] mobile:[corner-shape:squircle] desktop:relative desktop:inset-auto desktop:h-auto desktop:w-full desktop:max-w-sm"
          [class.dialog-panel]="desktop"
          [class.sheet-panel]="!desktop"
          [style.transform]="closing() ? 'translateY(calc(100% + 1rem))' : (dragY() ? 'translateY(' + dragY() + 'px)' : null)"
          [style.transition]="dragging() ? 'none' : 'transform 280ms var(--ease-ios)'"
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

          <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-2 desktop:px-4 desktop:pb-4">
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
  readonly closed = output<void>();

  protected readonly desktop = !inject(DeviceDetectionService).isMobile();

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
    setTimeout(() => this.closed.emit(), anchored ? 0 : 240);
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
