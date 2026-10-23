import { Component } from '@angular/core';

/**
 * Desktop: the app's sidebar at the left (as Claude's / Notion's): the places as rows
 * (`<a uiSidebarItem>`, a nav — it scrolls when long), the account at the bottom under a hairline
 * (`<… sidebarFoot>`). Its own quiet color, a hairline at its right.
 */
@Component({
  selector: 'ui-sidebar',
  host: { class: 'flex h-full w-nav shrink-0 flex-col border-r-[0.5px] border-separator bg-side text-fg' },
  templateUrl: './sidebar.html',
})
export class UiSidebar {}
