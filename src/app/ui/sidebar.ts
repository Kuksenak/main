import { Component } from '@angular/core';

/**
 * Desktop: the app's sidebar at the left (as Claude's / Notion's): the places as rows
 * (`<a uiSidebarItem>`, a nav — it scrolls when long), the account at the bottom under a hairline
 * (`<… sidebarFoot>`). Its own quiet color, a hairline at its right.
 */
@Component({
  selector: 'ui-sidebar',
  template: `
    <nav class="places"><ng-content /></nav>
    <div class="foot"><ng-content select="[sidebarFoot]" /></div>
  `,
  styles: `
    :host {
      display: flex;
      width: var(--nav-w);
      height: 100%;
      flex-shrink: 0;
      flex-direction: column;
      border-right: 0.5px solid var(--separator);
      background: var(--side-bg);
      color: var(--text);
    }
    .places {
      display: flex;
      min-height: 0;
      flex: 1;
      flex-direction: column;
      gap: 1px;
      overflow-y: auto;
      padding: 0.5rem 0.75rem;
    }
    .foot {
      display: flex;
      flex-shrink: 0;
      align-items: center;
      padding: 0.375rem 0.75rem;
      border-top: 0.5px solid var(--separator);
    }
  `,
})
export class UiSidebar {}
