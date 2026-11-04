import { Component } from '@angular/core';

/**
 * Desktop: the app's sidebar at the left (as macOS 26's): a panel of its own floating in the window —
 * a light gray, round corners, a soft shadow; the places as rows (`<a uiSidebarItem>`, a nav — it
 * scrolls when long), the account at the bottom under a hairline (`<… sidebarFoot>`). An installed
 * app with its title bar hidden: the panel up to the window's top, room at its top as tall as the
 * bar was — a Mac's window buttons sit in it (as Apple's apps'), the window dragged by it.
 */
@Component({
  selector: 'ui-sidebar',
  host: {
    class:
      'relative flex h-full w-nav shrink-0 flex-col rounded-[1.375rem] bg-side pt-[env(titlebar-area-height,0px)] text-fg shadow-side select-none',
  },
  templateUrl: './sidebar.html',
})
export class UiSidebar {}
