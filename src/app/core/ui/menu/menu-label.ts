import { Component } from '@angular/core';

/** A small gray line in a menu, over its rows (e.g. the account's email); a long one ends in …. */
@Component({
  selector: 'ui-menu-label',
  host: { class: 'block truncate px-2 pt-1 pb-0.5 text-footnote font-medium text-fg-secondary' },
  template: `<ng-content />`,
})
export class UiMenuLabel {}
