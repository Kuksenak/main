import { Component } from '@angular/core';

/** A group of rows (`uiListRow`) on a card (as iOS's grouped lists), e.g. in a sheet. */
@Component({
  selector: 'ui-card',
  host: { class: 'flex flex-col overflow-hidden rounded-card border-[0.5px] border-separator bg-sheet-card' },
  template: `<ng-content />`,
})
export class UiCard {}
