import { Component } from '@angular/core';

/**
 * The bar at the top of the signed-in pages, flat on the page's own color (no fill, no line under
 * it): the app's places at the left (`<a uiToolbarTab>`, a nav), the rest at the right
 * (`<… toolbarEnd>`, e.g. the account). Phones: under the status bar.
 */
@Component({
  selector: 'ui-toolbar',
  host: { role: 'banner' },
  template: `
    <nav class="start"><ng-content /></nav>
    <div class="end"><ng-content select="[toolbarEnd]" /></div>
  `,
  styles: `
    :host {
      display: flex;
      flex-shrink: 0;
      align-items: center;
      gap: 0.5rem;
      height: calc(var(--toolbar-h) + env(safe-area-inset-top));
      padding: env(safe-area-inset-top) var(--toolbar-px) 0;
      background: var(--app-bg);
      color: var(--text);
    }
    .start,
    .end {
      display: flex;
      align-items: center;
      gap: 0.125rem;
    }
    .start {
      flex: 1;
      min-width: 0;
      overflow: hidden;
    }
    .end {
      flex-shrink: 0;
    }
  `,
})
export class UiToolbar {}
