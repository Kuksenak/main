import { Component, OnDestroy, OnInit, input, output, signal } from '@angular/core';

/**
 * iOS-style bottom sheet (mobile) / centered dialog (desktop).
 * Render it with @if; call close() to animate out, then `closed` fires so the
 * parent can drop it. Drag the header down to dismiss.
 */
@Component({
  selector: 'app-sheet',
  template: `
    <div class="fixed inset-0 z-40 sm:flex sm:items-center sm:justify-center sm:p-4">
      <div
        class="absolute inset-0 bg-black/40 [animation:fadeIn_280ms_ease-out] sm:bg-black/30"
        [style.opacity]="closing() ? 0 : null"
        [style.transition]="'opacity 240ms ease-out'"
        (click)="close()"
      ></div>

      <div
        class="absolute inset-x-0 bottom-0 flex max-h-[calc(100dvh-env(safe-area-inset-top)-0.75rem)] flex-col overflow-hidden rounded-t-[20px] bg-[var(--sheet-bg)] text-[var(--text)] shadow-[0_-8px_30px_rgba(0,0,0,0.12)] [animation:sheetUp_380ms_cubic-bezier(0.32,0.72,0,1)] sm:relative sm:inset-auto sm:w-full sm:max-w-sm sm:rounded-2xl sm:shadow-xl"
        [style.transform]="closing() ? 'translateY(100%)' : (dragY() ? 'translateY(' + dragY() + 'px)' : null)"
        [style.transition]="dragging() ? 'none' : 'transform 280ms cubic-bezier(0.32,0.72,0,1)'"
      >
        <div
          class="shrink-0 touch-none px-4 pb-3 pt-2 sm:pt-4"
          (touchstart)="dragStart($event)"
          (touchmove)="dragMove($event)"
          (touchend)="dragEnd()"
          (touchcancel)="dragEnd()"
        >
          <div class="mx-auto mb-2 h-[5px] w-9 rounded-full bg-black/20 dark:bg-white/25 sm:hidden"></div>
          <div class="relative flex items-center">
            <button type="button" (click)="close()" aria-label="Close" class="icon-btn !text-current">
              <svg viewBox="0 0 24 24" fill="none" class="size-5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
            <span class="pointer-events-none absolute inset-x-0 text-center text-[17px] font-semibold">{{ title() }}</span>
          </div>
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-1 sm:pb-5">
          <ng-content />
        </div>
      </div>
    </div>
  `,
})
export class Sheet implements OnInit, OnDestroy {
  readonly title = input('');
  readonly closed = output<void>();

  protected readonly closing = signal(false);
  protected readonly dragY = signal(0);
  protected readonly dragging = signal(false);
  private startY = 0;

  ngOnInit(): void {
    this.tintStatusBar(true);
  }

  ngOnDestroy(): void {
    this.tintStatusBar(false);
  }

  close(): void {
    if (this.closing()) return;
    this.dragging.set(false);
    this.closing.set(true);
    this.tintStatusBar(false);
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

  // Match the status bar to the dim backdrop while the sheet is up.
  private tintStatusBar(dimmed: boolean): void {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) return;
    const css = getComputedStyle(document.documentElement);
    const color = css.getPropertyValue(dimmed ? '--app-bg-dimmed' : '--app-bg').trim();
    if (color) meta.setAttribute('content', color);
  }
}
