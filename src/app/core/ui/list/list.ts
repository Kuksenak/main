import { Component } from '@angular/core';

/** A list of items (`uiListItem`) on a card of its own (as iOS's grouped lists), e.g. in a sheet. */
@Component({
  selector: 'ui-list',
  host: { class: 'flex flex-col overflow-hidden rounded-card border-[0.5px] border-separator bg-sheet-card' },
  template: `<ng-content />`,
})
export class UiList {}
