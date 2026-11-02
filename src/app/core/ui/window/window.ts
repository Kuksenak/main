import { booleanAttribute, Component, DestroyRef, inject, input, output } from '@angular/core';

/**
 * A desktop window, as Notion's search (measured: 600 wide, nothing dims): near the top of the
 * screen, round corners, a hairline edge; what's in it is the page's. Esc or a click outside
 * closes it (`closed`); `tall`: as tall as it may be (a chat), else as its content. The search
 * window and the page assistant's are this. Render it with @if.
 *   @if (open()) { <ui-window (closed)="open.set(false)">…</ui-window> }
 */
@Component({
  selector: 'ui-window',
  template: `
    <!-- (outside it: a click closes it; nothing dims) -->
    <div class="fixed inset-0 z-50 flex items-start justify-center pt-[8vh]" (mousedown)="closed.emit()">
      <div
        role="dialog"
        aria-modal="true"
        class="flex max-h-[76vh] w-[37.5rem] max-w-[92vw] animate-menu-in flex-col overflow-hidden rounded-[1.25rem] border-[0.5px] border-separator
               bg-dialog text-fg shadow-popover data-tall:h-[76vh]"
        [attr.data-tall]="tall() ? '' : null"
        (mousedown)="$event.stopPropagation()"
      >
        <ng-content />
      </div>
    </div>
  `,
})
export class UiWindow {
  readonly tall = input(false, { transform: booleanAttribute });
  readonly closed = output<void>();

  constructor() {
    // Esc closes it, from anywhere
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && this.closed.emit();
    document.addEventListener('keydown', onKey);
    inject(DestroyRef).onDestroy(() => document.removeEventListener('keydown', onKey));
  }
}
