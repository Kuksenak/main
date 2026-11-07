import { Component, input, output } from '@angular/core';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { TranslationKey } from '../core/i18n/translations';
import { UiButton } from '../core/ui';

/**
 * Desktops: a section's + (its new one: a page, an event) on its head — a button as the head's
 * others (a capsule, data-toolbar), + and its words ("New page"), in the row's flow left to right.
 * (Search and the account: in the sidebar.)
 *   <app-toolbar-end addLabel="library.new" (add)="create()" />
 */
@Component({
  selector: 'app-toolbar-end',
  imports: [TranslatePipe, UiButton],
  host: { class: 'flex shrink-0 items-center gap-2' },
  template: `
    @if (addLabel(); as label) {
      <button uiButton type="button" icon="plus" (click)="add.emit()">{{ label | t }}</button>
    }
  `,
})
export class ToolbarEnd {
  /** The section's new one (none: no +): its words (the hint). */
  readonly addLabel = input<TranslationKey | null>(null);
  readonly add = output<void>();
}
