import { booleanAttribute, Component, input } from '@angular/core';
import { Icon, IconName } from '../icon/icon';

/**
 * A row of a `<ui-menu>`, as the phones' menus (iOS 26's): `<button type="button" uiMenuItem
 * icon="logout">Log out</button>` — 36 tall, round, a thin icon and the name; gray under the pointer
 * or the keys (↑ ↓). `danger` (delete, log out): red, as iOS's. `checked`
 * (one of a choice, e.g. the language): a ✓ at the end of the chosen one.
 * Picking it closes the menu.
 */
@Component({
  selector: 'button[uiMenuItem]',
  imports: [Icon],
  host: {
    class:
      'group flex min-h-9 w-full items-center gap-3 rounded-xl px-3 py-1 text-left text-ui leading-tight text-fg outline-none ' +
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
