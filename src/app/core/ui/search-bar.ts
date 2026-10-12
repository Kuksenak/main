import { Component, ElementRef, model, viewChild } from '@angular/core';
import { TranslatePipe } from '../i18n/t.pipe';
import { Icon } from './icon/icon';

/**
 * Phones' search, like Telegram's / iOS': a gray "🔍 Search" field near the top (the placeholder
 * centered); a tap types right in it — `active` turns on (the page hides its top bar and moves the
 * field up), a round ✕ appears beside it (clears and leaves), ⓧ inside clears the text. Leaving
 * an empty field (the keyboard gone) leaves search too. Two-way bound: `[(value)]`, `[(active)]`.
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
      @if (value()) {
        <!-- ⓧ clears (the field keeps the focus) -->
        <button type="button" (pointerdown)="$event.preventDefault()" (click)="value.set('')" [attr.aria-label]="'action.clear' | t" class="-mr-1 flex size-6 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--text)_35%,transparent)] text-[var(--app-bg)]">
          <app-icon name="close" [strokeWidth]="3" class="size-3" />
        </button>
      }
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
