import { Component } from '@angular/core';

/**
 * A key on a chip, as the sidebar's Ctrl+K: a gray fill, small round corners, the small gray text —
 * `<ui-kbd>Esc</ui-kbd>`, `<ui-kbd>Ctrl+K</ui-kbd>`, or an icon put inside (↑, ↵); a key that's a
 * button too (the page title's ↵): `<button uiKbd>`.
 */
@Component({
  selector: 'ui-kbd, button[uiKbd]',
  host: {
    class:
      'inline-flex shrink-0 items-center justify-center rounded-[0.3rem] bg-tint-strong px-1.5 py-px ' +
      'font-sans text-footnote text-fg-secondary',
  },
  template: `<ng-content />`,
})
export class UiKbd {}
