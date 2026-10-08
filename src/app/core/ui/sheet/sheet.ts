import { NgTemplateOutlet } from '@angular/common';
import { Component, input, output, signal } from '@angular/core';
import { ConnectedPosition, OverlayModule } from '@angular/cdk/overlay';

const DESKTOP = '(min-width: 40rem)'; // Tailwind `sm`

/**
 * One menu surface, two presentations:
 * - mobile: iOS-style floating bottom sheet (8px inset, large continuous corners,
 *   half the screen tall, translucent glass); drag the grabber down or tap outside;
 * - desktop: a dropdown anchored under `origin` via CDK overlay (like the pickers),
 *   or a centered dialog when no origin is given.
 * Render it with @if; call close() to animate out, then `closed` fires so the
 * parent can drop it.
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
        <div class="dialog-panel w-72 origin-top-right !rounded-[24px] p-2 [animation:dropdownIn_160ms_cubic-bezier(0.2,0,0,1)]">
          <ng-container [ngTemplateOutlet]="content" />
        </div>
      </ng-template>
    } @else {
      <div class="fixed inset-0 z-40 sm:flex sm:items-center sm:justify-center sm:p-4">
        <div
          class="absolute inset-0 [animation:fadeIn_280ms_ease-out] sm:bg-black/30"
          [style.opacity]="closing() ? 0 : null"
          [style.transition]="'opacity 240ms ease-out'"
          (click)="close()"
        ></div>

        <div
          class="absolute inset-x-2 bottom-2 flex h-[50dvh] flex-col overflow-hidden max-sm:rounded-[44px] max-sm:[corner-shape:squircle] [animation:sheetUp_380ms_cubic-bezier(0.32,0.72,0,1)] sm:relative sm:inset-auto sm:h-auto sm:w-full sm:max-w-sm"
          [class.dialog-panel]="desktop"
          [class.sheet-panel]="!desktop"
          [style.transform]="closing() ? 'translateY(calc(100% + 1rem))' : (dragY() ? 'translateY(' + dragY() + 'px)' : null)"
          [style.transition]="dragging() ? 'none' : 'transform 280ms cubic-bezier(0.32,0.72,0,1)'"
        >
          <div
            class="shrink-0 touch-none px-4 pb-4 pt-2.5 sm:pb-0 sm:pt-4"
            (touchstart)="dragStart($event)"
            (touchmove)="dragMove($event)"
            (touchend)="dragEnd()"
            (touchcancel)="dragEnd()"
          >
            <div class="mx-auto h-[5px] w-9 rounded-full bg-black/20 dark:bg-white/25 sm:hidden"></div>
          </div>

          <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-1 sm:pb-4">
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

  // Sheet on mobile, dropdown/dialog on desktop (read once — the menu is short-lived).
  protected readonly desktop = window.matchMedia(DESKTOP).matches;

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
