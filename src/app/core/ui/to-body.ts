import { DestroyRef, Directive, ElementRef, afterNextRender, inject } from '@angular/core';

/**
 * Moves its element to <body>, so `position: fixed` means the window — not a scroll area with a
 * mask / isolate / transform it sits in (they make fixed children relative to themselves). For
 * menus and bars placed at screen coordinates. Removed with its owner.
 */
@Directive({ selector: '[appToBody]' })
export class ToBody {
  constructor() {
    const el: HTMLElement = inject(ElementRef).nativeElement;
    afterNextRender(() => document.body.appendChild(el));
    inject(DestroyRef).onDestroy(() => el.remove());
  }
}
