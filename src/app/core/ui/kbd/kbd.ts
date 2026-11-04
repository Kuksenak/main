import { Component } from '@angular/core';

/**
 * A key, as a keycap (as macOS shows shortcuts): the window's light color, a hairline round it and a
 * thicker one under it (the key's edge), small round corners, the smallest text — one key each
 * (`<ui-kbd>Ctrl</ui-kbd><ui-kbd>K</ui-kbd>`, `<ui-kbd>Esc</ui-kbd>`), or an icon put inside (↑, ↵);
 * a key that's a button too (the page title's ↵): `<button uiKbd>`.
 */
@Component({
  selector: 'ui-kbd, button[uiKbd]',
  host: {
    class:
      'inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-[0.3125rem] border-[0.5px] border-b-[1.5px] border-separator bg-dialog px-1 ' +
      'font-sans text-caption leading-none font-medium text-fg-secondary',
  },
  template: `<ng-content />`,
})
export class UiKbd {}
