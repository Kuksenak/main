import { Component } from '@angular/core';

/**
 * Desktop: the app's sidebar at the left (as macOS 26's): a panel of its own floating in the window —
 * a light gray, round corners, a soft shadow; the places as rows (`<a uiSidebarItem>`, a nav — it
 * scrolls when long), the account at the bottom under a hairline (`<… sidebarFoot>`).
 */
@Component({
  selector: 'ui-sidebar',
  host: { class: 'flex h-full w-nav shrink-0 flex-col rounded-[0.875rem] bg-side text-fg shadow-side select-none' },
  templateUrl: './sidebar.html',
})
export class UiSidebar {}
