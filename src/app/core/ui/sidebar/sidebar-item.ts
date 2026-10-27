import { Component, ElementRef, inject, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Icon, IconName } from '../icon/icon';

// (a row: its look, its icon and name — the places' and the buttons')
const ROW =
  'flex h-side-row shrink-0 items-center gap-2 rounded-side-row px-side-row-x text-left text-ui text-side-text outline-none ' +
  'hover:bg-side-hover focus-visible:bg-side-hover aria-[current=page]:bg-side-on aria-[current=page]:font-[450] aria-[current=page]:text-fg ' +
  'aria-expanded:bg-side-on';
const TEMPLATE = `
  <app-icon [name]="icon()" colored class="size-icon-side text-icon" />
  <span class="min-w-0 truncate"><ng-content /></span>
`;

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
  host: { class: ROW },
  template: TEMPLATE,
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

/** A row of the sidebar that's a button, not a place (e.g. Trash, opening its window): the same look. */
@Component({
  selector: 'button[uiSidebarItem]',
  imports: [Icon],
  host: { class: ROW, type: 'button' },
  template: TEMPLATE,
})
export class UiSidebarButton {
  readonly icon = input.required<IconName>();
  /** (the element: what a `<ui-menu>` opens at) */
  readonly element: HTMLElement = inject(ElementRef).nativeElement;
}
