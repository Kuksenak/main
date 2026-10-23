import { booleanAttribute, Component, input } from '@angular/core';
import { Icon, IconName } from './icon/icon';

/**
 * A row of a `<ui-menu>`: `<button type="button" uiMenuItem icon="logout">Log out</button>` — a
 * thin icon and the name in the small UI text; gray under the pointer or the keys (↑ ↓).
 * `danger` (delete, log out): like the rest, in the danger color under the pointer. `checked`
 * (one of a choice, e.g. the language): a ✓ at the end of the chosen one.
 * Picking it closes the menu.
 */
@Component({
  selector: 'button[uiMenuItem]',
  imports: [Icon],
  host: {
    '[attr.role]': "checked() === undefined ? 'menuitem' : 'menuitemradio'",
    '[attr.aria-checked]': 'checked()',
    '[class.danger]': 'danger()',
  },
  template: `
    @if (icon(); as name) {
      <app-icon [name]="name" class="icon" />
    }
    <span class="label"><ng-content /></span>
    @if (checked()) {
      <app-icon name="check" class="icon" />
    }
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
    :host(.danger:hover:not(:disabled)),
    :host(.danger:focus-visible) {
      color: var(--danger);
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
  readonly danger = input(false, { transform: booleanAttribute });
  readonly checked = input<boolean>();
}
