import { Component, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../i18n/t.pipe';
import { Icon } from './icon/icon';

/**
 * Search input: magnifier, text, × to clear (shown while there's text). Two-way bound:
 * `<app-search-field [(value)]="query" />`. Inside the mobile toolbar it takes the toolbar's
 * round-button height (see layout).
 */
@Component({
  selector: 'app-search-field',
  imports: [FormsModule, Icon, TranslatePipe],
  host: { class: 'block min-w-0 flex-1' },
  template: `
    <label class="field">
      <app-icon name="search" class="size-5 opacity-40 desktop:size-4" />
      <input
        type="search"
        [ngModel]="value()"
        (ngModelChange)="value.set($event)"
        [placeholder]="placeholder() || ('students.search' | t)"
        autocomplete="off"
      />
      @if (value()) {
        <button type="button" (click)="value.set('')" [attr.aria-label]="'action.clear' | t" class="icon-plain -mr-1">
          <app-icon name="close" [strokeWidth]="2.2" class="size-5 desktop:size-4" />
        </button>
      }
    </label>
  `,
})
export class SearchField {
  readonly value = model('');
  readonly placeholder = input('');
}
