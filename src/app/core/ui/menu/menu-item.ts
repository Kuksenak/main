import { booleanAttribute, Component, input } from '@angular/core';
import { Icon, IconName } from '../icon/icon';

/**
 * A row of a `<ui-menu>`, as macOS 26's Liquid Glass menus: `<button type="button" uiMenuItem
 * icon="logout">Log out</button>` — 30 tall, a capsule, a thin one-color icon and the name; a soft gray
 * under the pointer or the keys (↑ ↓). `danger` (delete, log out): red. `checked` (one of a choice,
 * e.g. the language): a ✓ at the end of the chosen one. Picking it closes the menu.
 */
@Component({
  selector: 'button[uiMenuItem]',
  imports: [Icon],
  host: {
    class:
      'group flex min-h-[1.875rem] w-full items-center gap-2 rounded-full px-3 py-0.5 text-left text-ui leading-tight text-fg outline-none ' +
      'not-disabled:hover:bg-tint-strong not-disabled:active:bg-tint-strong focus-visible:bg-tint-strong disabled:opacity-40 data-danger:text-danger',
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
