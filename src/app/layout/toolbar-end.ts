import { Component, input, output } from '@angular/core';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { TranslationKey } from '../core/i18n/translations';
import { Icon } from '../core/ui';
import { UiTip } from '../core/ui/tip/tip';

/**
 * Desktops: a section's head at its right, as macOS 26's toolbar — its + (the section's new one: a
 * page, an event) a round blue button of its own (macOS 27's). (Search
 * and the account: in the sidebar.)
 *   <app-toolbar-end addLabel="library.new" (add)="create()" />
 */
@Component({
  selector: 'app-toolbar-end',
  imports: [Icon, TranslatePipe, UiTip],
  host: { class: 'flex shrink-0 items-center gap-2' },
  template: `
    @if (addLabel(); as label) {
      <button
        type="button"
        (click)="add.emit()"
        [uiTip]="label | t"
        [attr.aria-label]="label | t"
        class="grid size-8 place-items-center rounded-full bg-accent text-on-accent shadow-accent hover:brightness-110"
      >
        <app-icon name="plus" class="size-5" />
      </button>
    }
  `,
})
export class ToolbarEnd {
  /** The section's new one (none: no +): its words (the hint). */
  readonly addLabel = input<TranslationKey | null>(null);
  readonly add = output<void>();
}
