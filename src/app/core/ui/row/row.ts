import { booleanAttribute, Component, input } from '@angular/core';
import { Icon, IconName } from '../icon/icon';

/**
 * A row of a window's list (the search's, the trash's, the tags'), as Notion's: 36 tall, round —
 * at the left its icon (`icon`, coloured in) or what's put in with `rowStart` (a tag's swatch);
 * its name, a hint after it gray (`hint`: "— 26 Oct"); at the right what's put in with `rowEnd`
 * (its buttons: on desktops shown under the pointer only). Gray under the pointer (`hover`: off
 * where the keys pick one — `aria-selected` grays it then); phones: as tall as a list's row.
 *   <div uiRow icon="page" [hint]="when">{{ title }}<button rowEnd uiButton icon="trash"></button></div>
 */
@Component({
  selector: 'button[uiRow], div[uiRow]',
  imports: [Icon],
  host: {
    class:
      'group flex min-h-9 w-full shrink-0 items-center gap-2.5 rounded-xl px-2 py-1 text-left ' +
      'aria-selected:bg-tint desktop:data-hover:hover:bg-tint mobile:min-h-row mobile:px-0',
    '[attr.data-hover]': "hover() ? '' : null",
  },
  template: `
    <ng-content select="[rowStart]" />
    @if (icon(); as name) {
      <app-icon [name]="name" colored class="size-5 shrink-0 text-icon mobile:size-icon-menu" />
    }
    <span class="min-w-0 flex-1 truncate text-ui text-side-text mobile:text-body mobile:text-fg">
      <ng-content />
      @if (hint()) {
        <span class="text-footnote whitespace-pre text-fg-secondary"> — {{ hint() }}</span>
      }
    </span>
    <span class="flex shrink-0 items-center gap-0.5 empty:hidden desktop:opacity-0 desktop:group-hover:opacity-100 desktop:focus-within:opacity-100"
      ><ng-content select="[rowEnd]"
    /></span>
  `,
})
export class UiRow {
  readonly icon = input<IconName>();
  readonly hint = input<string | null>();
  readonly hover = input(true, { transform: booleanAttribute });
}
