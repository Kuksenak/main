import { Injectable } from '@angular/core';

/**
 * Esc closes the popup on top (a menu, a sheet, a dialog, a question): each one open registers how
 * it closes (`push`, undone on destroy); Esc runs the last one's only, before anything else hears it.
 */
@Injectable({ providedIn: 'root' })
export class EscStack {
  private readonly stack: (() => void)[] = [];

  constructor() {
    document.addEventListener(
      'keydown',
      (e) => {
        if (e.key !== 'Escape' || e.isComposing || !this.stack.length) return;
        e.preventDefault();
        e.stopPropagation();
        this.stack[this.stack.length - 1]();
      },
      true,
    );
  }

  /** `close` runs on Esc while this one is on top; the function returned takes it off. */
  push(close: () => void): () => void {
    this.stack.push(close);
    return () => {
      const i = this.stack.lastIndexOf(close);
      if (i >= 0) this.stack.splice(i, 1);
    };
  }
}
