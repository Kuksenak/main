import { Component, inject, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Icon, IconName } from '../icon/icon';

/**
 * A place in the sidebar: `<a uiSidebarItem icon="home" routerLink="/">Home</a>` — a thin icon and
 * the name, 14px, a soft gray; a gray fill on hover; the current one (by the address:
 * aria-current="page") on a darker gray, its text near-black. `routerLinkActiveOptions` as the
 * router's (e.g. `{ exact: true }` for the start page).
 */
@Component({
  selector: 'a[uiSidebarItem]',
  imports: [Icon],
  hostDirectives: [
    { directive: RouterLink, inputs: ['routerLink'] },
    { directive: RouterLinkActive, inputs: ['routerLinkActiveOptions'] },
  ],
  host: {
    class:
      'flex h-side-row shrink-0 items-center gap-2 rounded-side-row px-side-row-x text-ui text-side-text outline-none ' +
      'hover:bg-side-hover focus-visible:bg-side-hover aria-[current=page]:bg-side-on aria-[current=page]:font-[450] aria-[current=page]:text-fg',
  },
  template: `
    <app-icon [name]="icon()" class="size-icon-side text-icon" />
    <span class="min-w-0 truncate"><ng-content /></span>
  `,
})
export class UiSidebarItem {
  readonly icon = input.required<IconName>();

  constructor() {
    // (the current one: marked by aria-current, which its look follows — no class of its own)
    const active = inject(RouterLinkActive);
    active.routerLinkActive = '';
    active.ariaCurrentWhenActive = 'page';
  }
}
