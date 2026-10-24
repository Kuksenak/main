import { Component, input } from '@angular/core';
import { Icon, IconName } from '../icon/icon';

/**
 * A small gray line in a menu, over its rows (e.g. the account's email; `icon`: a thin icon before
 * it, e.g. the language's globe); a long one ends in ….
 */
@Component({
  selector: 'ui-menu-label',
  imports: [Icon],
  host: { class: 'flex items-center gap-1.5 px-menu-label-x pt-1 pb-0.5 text-footnote font-medium text-fg-secondary' },
  template: `
    @if (icon(); as name) {
      <app-icon [name]="name" class="size-5 text-icon" />
    }
    <span class="min-w-0 truncate"><ng-content /></span>
  `,
})
export class UiMenuLabel {
  readonly icon = input<IconName>();
}
