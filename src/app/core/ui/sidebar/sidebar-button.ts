import { Component, input } from '@angular/core';
import { Icon, IconName } from '../icon/icon';

/**
 * A row of the sidebar that does something rather than go somewhere (Search):
 * `<button uiSidebarButton icon="search" shortcut="Ctrl K">Search</button>` — as a place's row
 * (`uiSidebarItem`), its keys in gray at the right, shown under the pointer.
 */
@Component({
  selector: 'button[uiSidebarButton]',
  imports: [Icon],
  host: {
    type: 'button',
    class:
      'group flex h-side-row w-full shrink-0 items-center gap-2 rounded-side-row px-side-row-x text-left text-ui text-side-text outline-none ' +
      'hover:bg-side-hover focus-visible:bg-side-hover active:transform-none',
  },
  template: `
    <app-icon [name]="icon()" class="size-icon-side" />
    <span class="min-w-0 flex-1 truncate"><ng-content /></span>
    @if (shortcut(); as keys) {
      <span class="shrink-0 text-footnote text-fg-secondary opacity-0 group-hover:opacity-100">{{ keys }}</span>
    }
  `,
})
export class UiSidebarButton {
  readonly icon = input.required<IconName>();
  readonly shortcut = input<string>();
}
