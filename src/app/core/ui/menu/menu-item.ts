import { booleanAttribute, Component, input } from '@angular/core';
import { Icon, IconName } from '../icon/icon';

/**
 * A row of a `<ui-menu>`, as the phones' menus (iOS 26's): `<button type="button" uiMenuItem
 * icon="logout">Log out</button>` — 28 tall (as compact as macOS's), round, a thin icon and the name; gray under the pointer
 * or the keys (↑ ↓). `danger` (delete, log out): red, as iOS's. `checked`
 * (one of a choice, e.g. the language): a ✓ at the end of the chosen one.
 * Picking it closes the menu.
 */
@Component({
  selector: 'button[uiMenuItem]',
  imports: [Icon],
  host: {
    class:
      'group flex min-h-7 w-full items-center gap-2 rounded-full px-2.5 py-0.5 text-left text-ui leading-tight text-fg outline-none ' +
      'not-disabled:hover:bg-tint not-disabled:active:bg-tint-strong focus-visible:bg-tint disabled:opacity-40 ' +
      'data-danger:text-danger',
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
