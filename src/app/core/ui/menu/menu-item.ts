import { booleanAttribute, Component, input } from '@angular/core';
import { Icon, IconName } from '../icon/icon';

/**
 * A row of a `<ui-menu>`: `<button type="button" uiMenuItem icon="logout">Log out</button>` — a
 * thin icon and the name in the small UI text; gray under the pointer or the keys (↑ ↓), the icon
 * hopping softly.
 * `danger` (delete, log out): like the rest, in the danger color under the pointer. `checked`
 * (one of a choice, e.g. the language): a ✓ at the end of the chosen one.
 * Picking it closes the menu.
 */
@Component({
  selector: 'button[uiMenuItem]',
  imports: [Icon],
  host: {
    class:
      'group flex min-h-menu-row w-full items-center gap-2.5 rounded-button px-2 py-1 text-left text-ui leading-tight text-fg outline-none ' +
      'not-disabled:hover:bg-tint-strong not-disabled:active:bg-tint-strong focus-visible:bg-tint-strong disabled:opacity-40 ' +
      'data-danger:not-disabled:hover:text-danger data-danger:focus-visible:text-danger',
    '[attr.role]': "checked() === undefined ? 'menuitem' : 'menuitemradio'",
    '[attr.aria-checked]': 'checked()',
    '[attr.data-danger]': 'danger() || null',
  },
  templateUrl: './menu-item.html',
})
export class UiMenuItem {
  readonly icon = input<IconName>();
  readonly danger = input(false, { transform: booleanAttribute });
  readonly checked = input<boolean>();
}
