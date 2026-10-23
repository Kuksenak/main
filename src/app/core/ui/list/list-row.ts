import { booleanAttribute, Component, input } from '@angular/core';
import { Icon, IconName } from '../icon/icon';

/**
 * A row of a `<ui-card>` (as iOS's): an icon (coloured in: these are the phones'), the name, then (put in with `rowValue`) a value
 * in gray, ✓ when `checked`, › when it opens something (`chevron`); `danger` (log out): its text
 * in the danger color. A hairline under it, from the text on (not under the last). A `div` for a
 * row that isn't tapped (e.g. the email); a button grays while pressed.
 */
@Component({
  selector: 'button[uiListRow], div[uiListRow]',
  imports: [Icon],
  host: {
    class:
      'relative flex h-row w-full shrink-0 items-center gap-3 px-row-x text-left text-body ' +
      'after:absolute after:right-0 after:bottom-0 after:left-4 after:h-[0.5px] after:bg-separator last:after:hidden ' +
      'data-icon:after:left-12 [button&]:active:bg-highlight',
    '[attr.data-icon]': "icon() ? '' : null",
    '[class.text-danger]': 'danger()',
    '[attr.aria-pressed]': 'checked()',
  },
  templateUrl: './list-row.html',
})
export class UiListRow {
  readonly icon = input<IconName>();
  readonly chevron = input(false, { transform: booleanAttribute });
  readonly checked = input<boolean>();
  readonly danger = input(false, { transform: booleanAttribute });
}
