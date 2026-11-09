import { Component, input } from '@angular/core';
import { Icon, IconName } from '../icon/icon';

/**
 * A section's main action (New page, New event), as macOS 26's prominent button: a capsule in the
 * accent color, its icon then its words. `<button uiPrimary icon="plus">New page</button>`.
 */
@Component({
  selector: 'button[uiPrimary]',
  imports: [Icon],
  host: {
    type: 'button',
    class:
      'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full desktop:rounded-button bg-accent pr-3.5 pl-2.5 text-ui font-medium text-on-accent shadow-accent hover:brightness-105 disabled:opacity-50',
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
