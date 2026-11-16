import { Component, input } from '@angular/core';
import { Icon, IconName } from '../icon/icon';

/**
 * A section's main action (New page, New event), as Claude's: black (white in the dark theme), its
 * icon then its words; a little lighter under the pointer. Desktops: as small as the head's other
 * buttons (28 tall, regular weight). `<button uiPrimary icon="plus">New page</button>`.
 */
@Component({
  selector: 'button[uiPrimary]',
  imports: [Icon],
  host: {
    type: 'button',
    class:
      'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-strong pr-3.5 pl-2.5 text-ui font-medium text-on-strong desktop:h-button desktop:gap-1 desktop:rounded-button desktop:pr-2.5 desktop:pl-1.5 desktop:font-normal hover:opacity-85 disabled:opacity-50',
  },
  template: `
    @if (icon(); as name) {
      <app-icon [name]="name" class="size-4.5 desktop:size-4" />
    }
    <ng-content />
  `,
})
export class UiPrimary {
  readonly icon = input<IconName>();
}
