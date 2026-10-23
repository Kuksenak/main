import { Component, inject, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Icon, IconName } from '../core/ui/icon/icon';

/**
 * A place in the toolbar: `<a uiToolbarTab icon="home" routerLink="/">Home</a>` — its icon and
 * name, as the toolbar's buttons but gray; the current one (by the address) dark on a gray fill.
 * `routerLinkActiveOptions` as the router's (e.g. `{ exact: true }` for the start page).
 */
@Component({
  selector: 'a[uiToolbarTab]',
  imports: [Icon],
  hostDirectives: [
    { directive: RouterLink, inputs: ['routerLink'] },
    { directive: RouterLinkActive, inputs: ['routerLinkActiveOptions'] },
  ],
  template: `
    <app-icon [name]="icon()" class="icon" />
    <span><ng-content /></span>
  `,
  styles: `
    :host {
      display: inline-flex;
      flex-shrink: 0;
      align-items: center;
      gap: 0.375rem;
      height: var(--button-h);
      padding: 0 calc(var(--button-px) + 0.125rem) 0 var(--button-px);
      border-radius: var(--radius-button);
      font-size: var(--text-ui);
      line-height: 1.25;
      color: var(--text-secondary);
      white-space: nowrap;
      transition:
        background-color 120ms,
        color 120ms;
    }
    :host(:hover) {
      background: var(--tint);
      color: var(--text);
    }
    :host(.is-on) {
      background: var(--tint-strong);
      color: var(--text);
    }
    .icon {
      width: var(--icon-ui);
      height: var(--icon-ui);
    }
  `,
})
export class UiToolbarTab {
  readonly icon = input.required<IconName>();

  constructor() {
    const active = inject(RouterLinkActive);
    active.routerLinkActive = 'is-on';
    active.ariaCurrentWhenActive = 'page';
  }
}
