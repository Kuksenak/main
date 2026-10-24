import { Injectable, signal } from '@angular/core';

/**
 * The part of the screen that's seen (window.visualViewport): with the keyboard up, iOS shrinks it
 * and shifts the page up under it. Things fixed to the screen that must stay in view — a sheet, the
 * search's capsule — take their place from `top` and `height` (px, in the page's fixed frame), not
 * from the whole screen; the page itself is kept from scrolling (iOS pushes it up for a field).
 * `keyboard`: how much of the screen the keyboard (and its bar) takes; 0 without one.
 */
@Injectable({ providedIn: 'root' })
export class VisibleArea {
  readonly top = signal(0);
  readonly height = signal(window.innerHeight);
  readonly keyboard = signal(0);

  constructor() {
    const viewport = window.visualViewport;
    // The screen's height without a keyboard: the most seen at this width (iOS shrinks innerHeight
    // too with the keyboard up in some cases, so that alone can't tell)
    let width = window.innerWidth;
    let full = window.innerHeight;
    const measure = () => {
      if (window.innerWidth !== width) {
        width = window.innerWidth;
        full = window.innerHeight;
      }
      const top = viewport?.offsetTop ?? 0;
      const height = viewport?.height ?? window.innerHeight;
      full = Math.max(full, window.innerHeight, height);
      this.top.set(Math.round(top));
      this.height.set(Math.round(height));
      // (less than ~80px off: the browser's own bars moving, not a keyboard)
      const keyboard = Math.round(full - height);
      this.keyboard.set(keyboard > 80 ? keyboard : 0);
    };
    // The page itself never scrolls (its own parts do): iOS pushing it up for a field the keyboard
    // would cover, back to the top — the top bar stays where it is — and the field brought into
    // view in its own part instead
    const stay = () => {
      if (window.scrollY === 0) return;
      window.scrollTo(0, 0);
      const field = document.activeElement;
      if (field instanceof HTMLElement && field.matches('input, textarea, [contenteditable]'))
        requestAnimationFrame(() => field.scrollIntoView({ block: 'nearest' }));
    };
    const changed = () => {
      measure();
      stay();
    };
    measure();
    viewport?.addEventListener('resize', changed);
    viewport?.addEventListener('scroll', changed);
    window.addEventListener('resize', changed);
    window.addEventListener('scroll', stay);
  }
}
