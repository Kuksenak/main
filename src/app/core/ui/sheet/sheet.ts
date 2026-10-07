import { Component, output, signal } from '@angular/core';

/**
 * iOS-style bottom sheet (mobile) / centered dialog (desktop).
 * Render it with @if; call close() to animate out, then `closed` fires so the
 * parent can drop it. No header — drag the grabber down or tap outside to dismiss.
 */
@Component({
  selector: 'app-sheet',
  template: `
    <div class="fixed inset-0 z-40 sm:flex sm:items-center sm:justify-center sm:p-4">
      <div
        class="absolute inset-0 [animation:fadeIn_280ms_ease-out] sm:bg-black/30"
        [style.opacity]="closing() ? 0 : null"
        [style.transition]="'opacity 240ms ease-out'"
        (click)="close()"
      ></div>

      <div
        class="absolute inset-x-0 bottom-0 flex max-h-[calc(100dvh-env(safe-area-inset-top)-0.75rem)] flex-col overflow-hidden rounded-t-[20px] sheet-panel [animation:sheetUp_380ms_cubic-bezier(0.32,0.72,0,1)] sm:relative sm:inset-auto sm:w-full sm:max-w-sm sm:rounded-2xl sm:shadow-xl"
        [style.transform]="closing() ? 'translateY(100%)' : (dragY() ? 'translateY(' + dragY() + 'px)' : null)"
        [style.transition]="dragging() ? 'none' : 'transform 280ms cubic-bezier(0.32,0.72,0,1)'"
      >
        <div
          class="shrink-0 touch-none px-4 pb-3 pt-2 sm:pb-0 sm:pt-5"
          (touchstart)="dragStart($event)"
          (touchmove)="dragMove($event)"
          (touchend)="dragEnd()"
          (touchcancel)="dragEnd()"
        >
          <div class="mx-auto h-[5px] w-9 rounded-full bg-black/20 dark:bg-white/25 sm:hidden"></div>
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-1 sm:pb-5">
          <ng-content />
        </div>
      </div>
    </div>
  `,
})
export class Sheet {
  readonly closed = output<void>();

  protected readonly closing = signal(false);
  protected readonly dragY = signal(0);
  protected readonly dragging = signal(false);
  private startY = 0;

  close(): void {
    if (this.closing()) return;
    this.dragging.set(false);
    this.closing.set(true);
    setTimeout(() => this.closed.emit(), 240);
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
