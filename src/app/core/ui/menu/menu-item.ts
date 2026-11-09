import { booleanAttribute, Component, input } from '@angular/core';
import { Icon, IconName } from '../icon/icon';

/**
 * A row of a `<ui-menu>`, as Notion's / Claude's: `<button type="button" uiMenuItem
 * icon="logout">Log out</button>` — the menus' row (`menu-row`, styles.css): 28 tall, round by 6, a thin
 * one-color icon and the name; a soft gray under the pointer or the keys (↑ ↓). `danger` (delete, log out): red. `checked` (one of a choice,
 * e.g. the language): a ✓ at the end of the chosen one. Picking it closes the menu.
 */
@Component({
  selector: 'button[uiMenuItem]',
  imports: [Icon],
  host: {
    class:
      'group menu-row data-danger:text-danger',
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
