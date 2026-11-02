import { Component, Directive, ElementRef, inject, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Icon, IconName } from '../icon/icon';

// (a row: its look, its icon and name — the places' and the buttons')
const ROW =
  'group/row flex h-side-row shrink-0 items-center gap-2 rounded-side-row px-side-row-x text-left text-ui text-side-text outline-none ' +
  'hover:bg-side-hover focus-visible:bg-side-hover aria-[current=page]:bg-side-on aria-[current=page]:font-[450] aria-[current=page]:text-fg ' +
  'aria-expanded:bg-side-on';
const TEMPLATE = `
  <app-icon [name]="icon()" colored [tint]="tint()" class="size-icon-side text-icon" />
  <span class="min-w-0 flex-1 truncate"><ng-content /></span>
  <ng-content select="[itemEnd]" />
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
  /** (its icon coloured in with another pastel: a page's tag's) */
  readonly tint = input<string | null>(null);

  constructor() {
    // (the current one: marked by aria-current, which its look follows — no class of its own)
    const active = inject(RouterLinkActive);
    active.routerLinkActive = '';
    active.ariaCurrentWhenActive = 'page';
  }
}

/** A row of the sidebar that's a button, not a place (e.g. Recents, Favorites: folding their pages): the
 * same look; `itemEnd` at its right (e.g. a ⌄). */
@Component({
  selector: 'button[uiSidebarItem]',
  imports: [Icon],
  host: { class: ROW, type: 'button' },
  template: TEMPLATE,
})
export class UiSidebarButton {
  readonly icon = input.required<IconName>();
  /** (its icon coloured in with another pastel: a page's tag's) */
  readonly tint = input<string | null>(null);
}

/**
 * A row's own small button, at its right (`itemEnd`): + (a new one), ⋯ (its menu) — seen only under
 * the pointer (or while its menu is open: aria-expanded); a click on it isn't the row's.
 *   <a uiSidebarItem …><button itemEnd uiSidebarAction icon="plus" (click)="…"></button></a>
 */
@Component({
  selector: 'button[uiSidebarAction]',
  imports: [Icon],
  host: {
    type: 'button',
    class:
      'grid size-6 shrink-0 place-items-center rounded-md text-icon opacity-0 group-hover/row:opacity-100 hover:bg-side-on ' +
      'aria-expanded:opacity-100 aria-expanded:bg-side-on -mr-1',
    '(click)': '$event.preventDefault(); $event.stopPropagation()',
  },
  template: `<app-icon [name]="icon()" class="size-4.5" />`,
})
export class UiSidebarAction {
  readonly icon = input.required<IconName>();
  /** (the element: what a `<ui-menu>` opens at) */
  readonly element: HTMLElement = inject(ElementRef).nativeElement;
}

/**
 * A row of the sidebar whose insides are the page's own (a tag's: its swatch, its name or a field
 * renaming it): the rows' look only — gray under the pointer, the current one (aria-current="page")
 * darker. `<div uiSidebarRow role="link" …>`
 */
@Directive({ selector: '[uiSidebarRow]', host: { class: ROW } })
export class UiSidebarRow {}

/** A field in a sidebar row (a new tag's name, a tag renamed): 24 tall, on the window's color, a thin ring. */
@Directive({
  selector: 'input[uiSidebarField]',
  host: {
    type: 'text',
    class: 'h-6 min-w-0 flex-1 rounded-md bg-dialog px-1.5 text-ui text-fg outline-none ring-1 ring-separator placeholder:text-fg-secondary',
  },
})
export class UiSidebarField {}
