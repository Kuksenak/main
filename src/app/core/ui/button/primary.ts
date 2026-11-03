import { Component, input } from '@angular/core';
import { Icon, IconName } from '../icon/icon';

/**
 * A section's main action (New page, New event): filled black — the strong buttons' color — its icon
 * then its words, as the head buttons' size. `<button uiPrimary icon="plus">New page</button>`.
 */
@Component({
  selector: 'button[uiPrimary]',
  imports: [Icon],
  host: {
    type: 'button',
    class:
      'inline-flex h-button shrink-0 items-center gap-1.5 rounded-button bg-strong pr-3 pl-2 text-ui font-medium text-on-strong hover:opacity-85 disabled:opacity-50',
  },
  template: `
    @if (icon(); as name) {
      <app-icon [name]="name" class="size-4.5" />
    }
    <ng-content />
  `,
})
export class UiPrimary {
  readonly icon = input<IconName>();
}
