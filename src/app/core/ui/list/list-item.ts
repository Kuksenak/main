import { booleanAttribute, Component, input } from '@angular/core';
import { Icon, IconName } from '../icon/icon';

/**
 * An item of a `<ui-list>` (as iOS's rows): an icon (the outline: a small one), the name, then (put
 * in with `itemValue`) a value in gray, ✓ when `checked`, › when it opens something (`chevron`);
 * `danger` (log out): its text in the danger color. A hairline under it, from the text on (not under
 * the last). A `div` for one that isn't tapped (e.g. the email); a button grays while pressed, edge
 * to edge (not shrunk as other buttons are).
 */
@Component({
  selector: 'button[uiListItem], div[uiListItem]',
  imports: [Icon],
  host: {
    class:
      'relative flex h-row w-full shrink-0 items-center gap-3 px-row-x text-left text-body ' +
      'after:absolute after:right-0 after:bottom-0 after:left-4 after:h-[0.5px] after:bg-separator last:after:hidden ' +
      'data-icon:after:left-12 [button&]:active:bg-highlight [button&]:active:transform-none',
    '[attr.data-icon]': "icon() ? '' : null",
    '[class.text-danger]': 'danger()',
    '[attr.aria-pressed]': 'checked()',
  },
  templateUrl: './list-item.html',
})
export class UiListItem {
  readonly icon = input<IconName>();
  readonly chevron = input(false, { transform: booleanAttribute });
  readonly checked = input<boolean>();
  readonly danger = input(false, { transform: booleanAttribute });
}
