import { Component, DestroyRef, ElementRef, effect, inject, model, viewChild } from '@angular/core';
import { TranslatePipe } from '../i18n/t.pipe';
import { Icon } from './icon/icon';

/**
 * Phones' search, in the top bar: a gray "🔍 Search" field (the placeholder centered); a tap types
 * right in it (nothing around it moves); ✕ inside clears and leaves. A tap anywhere else puts the
 * keyboard away (an empty field leaves search then; with text the results stay). Two-way bound:
 * `[(value)]`, `[(active)]`.
 */
@Component({
  selector: 'app-search-bar',
  imports: [Icon, TranslatePipe],
  host: { class: 'flex min-w-0 items-center' },
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
      @if (active() || value()) {
        <!-- ✕ inside: clears and leaves search (pointerdown: no blur first) -->
        <button type="button" (pointerdown)="$event.preventDefault()" (click)="leave()" [attr.aria-label]="'action.cancel' | t" class="-mr-1.5 flex size-7 shrink-0 items-center justify-center rounded-full opacity-50 active:opacity-30">
          <app-icon name="close" [strokeWidth]="2.25" class="size-5" />
        </button>
      }
    </label>
  `,
})
export class SearchBar {
  readonly value = model('');
  readonly active = model(false);
  private readonly input = viewChild.required<ElementRef<HTMLInputElement>>('input');
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);

  constructor() {
    // While searching, a tap anywhere else puts the keyboard away (iOS keeps the focus otherwise)
    const outside = (e: PointerEvent) => {
      const field = this.input().nativeElement;
      if (document.activeElement === field && !this.host.nativeElement.contains(e.target as Node)) field.blur();
    };
    effect(() => {
      if (this.active()) document.addEventListener('pointerdown', outside, true);
      else document.removeEventListener('pointerdown', outside, true);
    });
    inject(DestroyRef).onDestroy(() => document.removeEventListener('pointerdown', outside, true));
  }

  protected leave(): void {
    this.value.set('');
    this.active.set(false);
    this.input().nativeElement.blur();
  }

  protected onBlur(): void {
    if (!this.value().trim()) this.active.set(false);
  }
}
