import { Injectable, signal } from '@angular/core';

/**
 * The part of the screen that's seen (window.visualViewport): with the keyboard up, iOS shrinks it
 * and shifts the page up under it. Things fixed to the screen that must stay in view — a sheet, the
 * search's capsule — take their place from `top` and `height` (px, in the page's fixed frame), not
 * from the whole screen. `keyboard`: how far up the keyboard (and its bar) reaches; 0 without one.
 */
@Injectable({ providedIn: 'root' })
export class VisibleArea {
  readonly top = signal(0);
  readonly height = signal(window.innerHeight);
  readonly keyboard = signal(0);

  constructor() {
    const viewport = window.visualViewport;
    const measure = () => {
      const top = viewport?.offsetTop ?? 0;
      const height = viewport?.height ?? window.innerHeight;
      this.top.set(Math.round(top));
      this.height.set(Math.round(height));
      this.keyboard.set(Math.max(0, Math.round(window.innerHeight - height - top)));
    };
    measure();
    viewport?.addEventListener('resize', measure);
    viewport?.addEventListener('scroll', measure);
    window.addEventListener('resize', measure);
  }
}
