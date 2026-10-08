import { Directive, ElementRef, inject, output } from '@angular/core';

const HOLD_MS = 450;
const MOVE_TOLERANCE = 8; // px of finger movement that still counts as a hold (not a scroll)

/**
 * `(longPress)` on any element: fires after a ~0.45s hold without moving (touch or mouse).
 * The click that follows the hold is swallowed, so a row's normal tap action doesn't also run.
 * Also turns off the iOS text-selection / callout on that element.
 */
@Directive({
  selector: '[appLongPress]',
  host: {
    class: 'select-none [-webkit-touch-callout:none]',
    '(pointerdown)': 'start($event)',
    '(pointermove)': 'move($event)',
    '(pointerup)': 'cancel()',
    '(pointercancel)': 'cancel()',
    '(pointerleave)': 'cancel()',
    '(contextmenu)': 'held && $event.preventDefault()',
  },
})
export class LongPress {
  readonly longPress = output<void>();

  private el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private timer?: ReturnType<typeof setTimeout>;
  private x = 0;
  private y = 0;
  protected held = false;

  constructor() {
    // Capture phase: runs before the element's own (click).
    this.el.addEventListener(
      'click',
      (e) => {
        if (!this.held) return;
        this.held = false;
        e.stopPropagation();
        e.preventDefault();
      },
      true,
    );
  }

  protected start(e: PointerEvent): void {
    this.held = false;
    this.x = e.clientX;
    this.y = e.clientY;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.held = true;
      navigator.vibrate?.(10);
      this.longPress.emit();
    }, HOLD_MS);
  }

  protected move(e: PointerEvent): void {
    if (Math.hypot(e.clientX - this.x, e.clientY - this.y) > MOVE_TOLERANCE) this.cancel();
  }

  protected cancel(): void {
    clearTimeout(this.timer);
  }
}
