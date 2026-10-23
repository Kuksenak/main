import { Component } from '@angular/core';

/** A small gray line in a menu, over its rows (e.g. the account's email); a long one ends in …. */
@Component({
  selector: 'ui-menu-label',
  template: `<ng-content />`,
  styles: `
    :host {
      display: block;
      padding: 0.25rem 0.5rem 0.125rem;
      overflow: hidden;
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--text-secondary);
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `,
})
export class UiMenuLabel {}
