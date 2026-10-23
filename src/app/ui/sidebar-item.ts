import { Component, inject, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Icon, IconName } from '../core/ui/icon/icon';

/**
 * A place in the sidebar: `<a uiSidebarItem icon="home" routerLink="/">Home</a>` — a thin icon and
 * the name, 14px, a soft gray; a gray fill on hover; the current one (by the address) on a darker
 * gray, its text near-black. `routerLinkActiveOptions` as the router's (e.g. `{ exact: true }` for
 * the start page).
 */
@Component({
  selector: 'a[uiSidebarItem]',
  imports: [Icon],
  hostDirectives: [
    { directive: RouterLink, inputs: ['routerLink'] },
    { directive: RouterLinkActive, inputs: ['routerLinkActiveOptions'] },
  ],
  template: `
    <app-icon [name]="icon()" class="icon" />
    <span class="label"><ng-content /></span>
  `,
  styles: `
    :host {
      display: flex;
      height: var(--side-row-h);
      flex-shrink: 0;
      align-items: center;
      gap: 0.625rem;
      padding: 0 0.625rem;
      border-radius: var(--radius-side-row);
      font-size: var(--text-ui);
      color: var(--side-text);
      outline: none;
    }
    :host(:hover),
    :host(:focus-visible) {
      background: var(--side-hover);
    }
    :host(.is-on) {
      background: var(--side-on);
      color: var(--text);
      font-weight: 450;
    }
    .icon {
      width: var(--icon-menu);
      height: var(--icon-menu);
    }
    .label {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `,
})
export class UiSidebarItem {
  readonly icon = input.required<IconName>();

  constructor() {
    const active = inject(RouterLinkActive);
    active.routerLinkActive = 'is-on';
    active.ariaCurrentWhenActive = 'page';
  }
}
