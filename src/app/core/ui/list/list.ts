import { Component } from '@angular/core';

/** A list of items (`uiListItem`) on a card of its own (as iOS's grouped lists), e.g. in a sheet. */
@Component({
  selector: 'ui-list',
  host: { class: 'flex flex-col overflow-hidden rounded-card border-[0.5px] border-separator bg-sheet-card' },
  template: `<ng-content />`,
})
export class UiList {}

/**
 * A card's title over it (as iOS 26's Settings): gray, semibold, in line with its rows' text.
 *   <ui-list-title>Access</ui-list-title><ui-list>…</ui-list>
 */
@Component({
  selector: 'ui-list-title',
  host: { class: 'block px-row-x text-body font-semibold text-fg-secondary' },
  template: `<ng-content />`,
})
export class UiListTitle {}
