import { Component } from '@angular/core';

/** A hairline between a menu's groups of rows. */
@Component({
  selector: 'ui-menu-separator',
  host: { role: 'separator' },
  template: ``,
  styles: `
    :host {
      display: block;
      height: 1px;
      margin: 0.25rem 0.5rem;
      background: var(--separator);
    }
  `,
})
export class UiMenuSeparator {}
