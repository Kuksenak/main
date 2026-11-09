import { afterNextRender, Component, DestroyRef, Directive, ElementRef, inject, input, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Icon, IconName } from '../icon/icon';
import { UiScrollBar } from '../scroll-bar/scroll-bar';

// (a row: its look, its icon and name — the places' and the buttons'. One chosen at a time, darker than
// one under the pointer, its name a little heavier (450))
const ROW =
  'group/row flex h-side-row shrink-0 items-center gap-2 rounded-side-row px-side-row-x text-left text-ui font-normal text-side-text outline-none ' +
  'hover:bg-side-hover focus-visible:bg-side-hover aria-expanded:bg-side-hover ' +
  'aria-[current=page]:bg-side-on aria-[current=page]:font-[450] aria-[current=page]:text-side-on-text aria-[current=page]:[&>app-icon]:text-current ' +
  'data-on:bg-side-on data-on:font-[450] data-on:text-side-on-text data-on:[&>app-icon]:text-current ' +
  // (a window open — the search, Recently deleted: its row the only chosen one, the page's not)
  'in-data-window:aria-[current=page]:not-data-on:bg-transparent in-data-window:aria-[current=page]:not-data-on:font-normal ' +
  'in-data-window:aria-[current=page]:not-data-on:text-side-text in-data-window:aria-[current=page]:not-data-on:hover:bg-side-hover';
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
      'grid size-6 shrink-0 place-items-center rounded-md text-icon opacity-0 group-hover/row:opacity-100 hover:bg-tint-strong ' +
      'aria-expanded:opacity-100 aria-expanded:bg-tint-strong -mr-1',
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

/**
 * A section's rows that scroll on their own (Favorites' pages, the tags): as tall as they are, at
 * most what's left; as the backup's (Claude's): nothing over or under them at their top — scrolled
 * down, a hairline over them and their top fading under it; their bottom cut plainly (no fading); the scroll bar over them (the system's took room from the rows).
 *   <div uiSidebarScroll>…rows…</div>
 */
@Directive({
  selector: '[uiSidebarScroll]',
  hostDirectives: [UiScrollBar],
  host: {
    class:
      '-mx-1.5 flex min-h-0 flex-initial flex-col gap-px overflow-y-auto border-t-[0.5px] border-transparent px-1.5 pt-px pb-2 ' +
      'transition-[border-color] duration-150 data-scrolled:border-separator ' +
      'data-scrolled:[mask-image:linear-gradient(to_bottom,transparent,black_0.875rem)]',
    '[attr.data-scrolled]': "scrolled() ? '' : null",
    '(scroll)': 'measure()',
  },
})
export class UiSidebarScroll {
  protected readonly scrolled = signal(false);
  protected readonly el: HTMLElement = inject(ElementRef).nativeElement;

  constructor() {
    // (and as its rows come and go, or the window's height changes)
    afterNextRender(() => {
      const ro = new ResizeObserver(() => this.measure());
      ro.observe(this.el);
      const mo = new MutationObserver(() => this.measure());
      mo.observe(this.el, { childList: true, subtree: true });
      this.destroy.onDestroy(() => (ro.disconnect(), mo.disconnect()));
    });
  }
  private readonly destroy = inject(DestroyRef);

  protected measure(): void {
    const el = this.el;
    this.scrolled.set(el.scrollTop > 0);
  }
}
