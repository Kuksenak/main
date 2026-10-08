import { Component, inject, input, output, signal } from '@angular/core';
import { DeviceDetectionService } from '../../services/device-detection.service';

/**
 * Layout for forms (screens with inputs):
 * - mobile: full-screen page sliding in from the right, so the keyboard never fights a
 *   sheet. Top bar: [leading] button · title · [trailing] button;
 * - desktop: centered solid dialog, capped to the viewport; [footer] holds its buttons.
 * Menus without inputs use <app-sheet> instead.
 * Render it with @if; call close() to animate out, then `closed` fires.
 */
@Component({
  selector: 'app-page-sheet',
  template: `
    <div
      class="fixed inset-0 z-30 desktop:flex desktop:items-center desktop:justify-center desktop:bg-[var(--backdrop)] desktop:p-4"
      (click)="close()"
    >
      <div
        class="flex h-full w-full flex-col text-[var(--text)] [animation:pageInRight_360ms_var(--ease-out-quick)] mobile:bg-[var(--app-bg)] desktop:h-auto desktop:max-h-[calc(100dvh-2rem)] desktop:max-w-md desktop:p-4"
        [class.dialog-panel]="desktop"
        [style.transform]="closing() ? 'translateX(100%)' : null"
        [style.transition]="closing() ? 'transform 240ms var(--ease-out-quick)' : null"
        (click)="$event.stopPropagation()"
      >
        <!-- Mobile top bar — 16px side inset like the cards, 48pt controls -->
        <div class="relative flex shrink-0 items-center gap-2 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.5rem)] desktop:hidden">
          <ng-content select="[leading]" />
          <span class="text-body pointer-events-none absolute inset-x-0 text-center font-semibold">{{ title() }}</span>
          <span class="relative ml-auto flex"><ng-content select="[trailing]" /></span>
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-1 desktop:flex-initial desktop:px-0 desktop:pb-0 desktop:pt-0">
          <ng-content />
        </div>

        <!-- Desktop footer -->
        <div class="mt-4 flex items-center gap-2 mobile:hidden">
          <ng-content select="[footer]" />
        </div>
      </div>
    </div>
  `,
})
export class PageSheet {
  readonly title = input('');
  readonly closed = output<void>();

  protected readonly desktop = !inject(DeviceDetectionService).isMobile();
  protected readonly closing = signal(false);

  close(): void {
    if (this.closing()) return;
    this.closing.set(true);
    setTimeout(() => this.closed.emit(), 240);
  }
}
