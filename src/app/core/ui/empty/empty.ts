import { Component } from '@angular/core';

/** What a list says when there's nothing in it: gray, in the middle. `<ui-empty>No tags yet</ui-empty>` */
@Component({
  selector: 'ui-empty',
  host: { class: 'block py-10 text-center text-ui text-fg-secondary mobile:text-body' },
  template: `<ng-content />`,
})
export class UiEmpty {}
