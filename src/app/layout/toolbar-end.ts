import { Component, inject, input, output } from '@angular/core';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { TranslationKey } from '../core/i18n/translations';
import { Icon } from '../core/ui';
import { UiTip } from '../core/ui/tip/tip';
import { DesktopSearch } from './desktop-search';

/**
 * Desktops: a head's right end, as macOS 26's toolbar — one glass capsule [+ | 🔍] (+: the section's
 * new one, when it has one — `add`; 🔍: the search, as Ctrl K). (The account: the sidebar's bottom.)
 *   <app-toolbar-end addLabel="library.new" (add)="create()" />
 */
@Component({
  selector: 'app-toolbar-end',
  imports: [Icon, TranslatePipe, UiTip],
  host: { class: 'flex shrink-0 items-center gap-2' },
  template: `
    <span class="flex h-8 items-center gap-0.5 rounded-full bg-(--bar-button) px-1 shadow-(--bar-button-shadow)">
      @if (addLabel(); as label) {
        <button type="button" (click)="add.emit()" [uiTip]="label | t" [attr.aria-label]="label | t" class="grid size-7 place-items-center rounded-full text-fg hover:bg-tint">
          <app-icon name="plus" class="size-5" />
        </button>
      }
      <button type="button" (click)="search.open.set(true)" [uiTip]="'search.title' | t" [attr.aria-label]="'search.title' | t" class="grid size-7 place-items-center rounded-full text-fg hover:bg-tint">
        <app-icon name="search" class="size-5" />
      </button>
    </span>
  `,
})
export class ToolbarEnd {
  /** The section's new one (none: no +): its words (the hint). */
  readonly addLabel = input<TranslationKey | null>(null);
  readonly add = output<void>();

  protected readonly search = inject(DesktopSearch);
}
