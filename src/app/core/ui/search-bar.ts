import { Component, ElementRef, model, viewChild } from '@angular/core';
import { TranslatePipe } from '../i18n/t.pipe';
import { Icon } from './icon/icon';

/**
 * Phones' search, in the top bar: a gray "🔍 Search" field (the placeholder centered); a tap types
 * right in it — `active` turns on (the top bar's menu and account step aside, the field widens), a
 * round ✕ appears beside it: it clears and leaves. Leaving an empty field (the keyboard gone)
 * leaves search too. Two-way bound: `[(value)]`, `[(active)]`.
 */
@Component({
  selector: 'app-search-bar',
  imports: [Icon, TranslatePipe],
  host: { class: 'flex items-center gap-2' },
  template: `
    <label class="relative flex h-[var(--control-round)] min-w-0 flex-1 items-center gap-2 rounded-full bg-[var(--fill)] px-4">
      <!-- At rest: the icon and "Search" in the middle (the field is under it, empty) -->
      @if (!active() && !value()) {
        <span class="pointer-events-none absolute inset-0 flex items-center justify-center gap-2 opacity-45">
          <app-icon name="search" class="size-5" />
          <span class="text-body">{{ 'students.search' | t }}</span>
        </span>
      } @else {
        <app-icon name="search" class="size-5 shrink-0 opacity-45" />
      }
      <input
        #input
        type="search"
        enterkeyhint="search"
        autocomplete="off"
        [value]="value()"
        (input)="value.set(input.value)"
        (focus)="active.set(true)"
        (blur)="onBlur()"
        (keydown.enter)="input.blur()"
        [placeholder]="active() ? ('students.search' | t) : ''"
        class="text-body min-w-0 flex-1 bg-transparent outline-none placeholder:opacity-40 [&::-webkit-search-cancel-button]:appearance-none"
      />
    </label>
    @if (active()) {
      <!-- ✕: clears and leaves search (pointerdown: no blur first) -->
      <button type="button" (pointerdown)="$event.preventDefault()" (click)="leave()" [attr.aria-label]="'action.cancel' | t" class="icon-btn [animation:fadeIn_200ms_ease-out]">
        <app-icon name="close" class="size-6" />
      </button>
    }
  `,
})
export class SearchBar {
  readonly value = model('');
  readonly active = model(false);
  private readonly input = viewChild.required<ElementRef<HTMLInputElement>>('input');

  protected leave(): void {
    this.value.set('');
    this.active.set(false);
    this.input().nativeElement.blur();
  }

  protected onBlur(): void {
    if (!this.value().trim()) this.active.set(false);
  }
}
