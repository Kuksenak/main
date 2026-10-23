import { Component, input } from '@angular/core';
import { Icon, IconName } from '../core/ui/icon/icon';

/**
 * A row of a `<ui-menu>`: `<button type="button" uiMenuItem icon="logout">Log out</button>` — a
 * thin icon and the name in the small UI text; gray under the pointer or the keys (↑ ↓).
 * Picking it closes the menu.
 */
@Component({
  selector: 'button[uiMenuItem]',
  imports: [Icon],
  host: { role: 'menuitem' },
  template: `
    @if (icon(); as name) {
      <app-icon [name]="name" class="icon" />
    }
    <span class="label"><ng-content /></span>
  `,
  styles: `
    :host {
      display: flex;
      width: 100%;
      min-height: var(--menu-row-h);
      align-items: center;
      gap: 0.625rem;
      padding: 0.25rem 0.5rem;
      border-radius: var(--radius-button);
      font-size: var(--text-ui);
      line-height: 1.25;
      color: var(--text);
      text-align: left;
      outline: none;
    }
    :host(:hover:not(:disabled)),
    :host(:focus-visible) {
      background: var(--tint-strong);
    }
    :host(:disabled) {
      opacity: 0.4;
    }
    .icon {
      width: var(--icon-menu);
      height: var(--icon-menu);
    }
    .label {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `,
})
export class UiMenuItem {
  readonly icon = input<IconName>();
}
