import { booleanAttribute, Component, DestroyRef, inject, input, output } from '@angular/core';

/**
 * A desktop window, as Notion's search (measured: 600 wide, nothing dims): near the top of the
 * screen, round corners, a hairline edge; what's in it is the page's. Esc or a click outside
 * closes it (`closed`); always as tall as it may be (76% of the screen: it doesn't jump as results
 * come and go), glass as the menus (Liquid Glass). (`tall`: kept, no longer needed.) The search
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
        class="flex h-[76vh] w-[37.5rem] max-w-[92vw] animate-menu-in flex-col overflow-hidden rounded-menu popup-glass text-fg shadow-menu"
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
