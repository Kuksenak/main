import { Component } from '@angular/core';
import { Icon } from '../icon/icon';

/**
 * A folding section's name, as Notion's (the sidebar's Recents, Favorites, Tags; the library's date
 * groups): the name, ⌄ right after it — seen under the pointer, › while folded. Its row is
 * `group/fold`, open marked by `data-open` (the sidebar's: its aria-expanded is a row whose menu is
 * open) or `aria-expanded="true"`.
 *   <button class="group/fold" [attr.aria-expanded]="open"><ui-fold-name>Today</ui-fold-name></button>
 */
@Component({
  selector: 'ui-fold-name',
  imports: [Icon],
  host: { class: 'inline-flex min-w-0 max-w-full items-center gap-1 align-middle' },
  template: `
    <span class="truncate"><ng-content /></span>
    <app-icon
      name="chevron-down"
      class="size-4 shrink-0 text-icon opacity-0 transition -rotate-90 group-hover/fold:opacity-100 group-data-open/fold:rotate-0 group-aria-expanded/fold:rotate-0"
    />
  `,
})
export class UiFoldName {}
