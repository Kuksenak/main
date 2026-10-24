import { Component, input } from '@angular/core';

/**
 * The sidebar's Search, as Notion's: `<button uiSidebarSearch shortcut="Ctrl+K">Search</button>` — a
 * field-like box (a hairline, a little lighter than the sidebar; darker under the pointer) with
 * its words in gray, the keys on a small chip at the right. A click opens the search window.
 */
@Component({
  selector: 'button[uiSidebarSearch]',
  host: {
    type: 'button',
    class:
      'mt-1 mb-1.5 flex h-9 w-full shrink-0 items-center gap-2.5 rounded-[0.625rem] border-[0.5px] border-fg/14 bg-side-field px-2.5 ' +
      'text-left text-ui text-fg-secondary outline-none hover:border-fg/22 hover:bg-side-on focus-visible:border-fg/22 active:transform-none',
  },
  template: `
    <span class="min-w-0 flex-1 truncate"><ng-content /></span>
    @if (shortcut(); as keys) {
      <span class="shrink-0 rounded-[0.3rem] bg-tint-strong px-1.5 py-px text-footnote">{{ keys }}</span>
    }
  `,
})
export class UiSidebarSearch {
  readonly shortcut = input<string>();
}
