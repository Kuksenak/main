import { Component, DestroyRef, ElementRef, inject, input, model, signal, viewChild } from '@angular/core';
import { TranslatePipe } from '../i18n/t.pipe';
import { Icon } from './icon/icon';

/**
 * Phones' search, like the Claude app's: a round 🔍 at the bottom left (or, `button` off, the
 * page's own one calling start() — e.g. in the top bar); a tap brings a search
 * field and a round ✕ to the bottom, riding on the keyboard (iOS doesn't move fixed things for
 * it: the visual viewport tells how tall it is). The keyboard's search key hides the keyboard and
 * keeps the results; ✕ clears and closes; leaving the field empty closes it too.
 * Two-way bound: `<app-floating-search [(value)]="query" />`.
 */
@Component({
  selector: 'app-floating-search',
  imports: [Icon, TranslatePipe],
  template: `
    @if (button() && !open()) {
      <button type="button" (click)="start()" [attr.aria-label]="'students.search' | t" class="icon-btn float-bottom left-4">
        <app-icon name="search" class="size-6" />
      </button>
    }
    <!-- Always there (hidden while closed): iOS opens the keyboard only for a field focused
         right in the tap, so it can't be created first -->
    <div
      class="fixed inset-x-4 z-30 flex items-center gap-2 transition-opacity duration-200"
      [style.bottom]="bottom()"
      [class.opacity-0]="!open()"
      [class.pointer-events-none]="!open()"
      [attr.aria-hidden]="!open()"
    >
      <label class="glass-neutral flex h-[var(--control-round)] min-w-0 flex-1 items-center gap-2 rounded-full px-4">
        <app-icon name="search" class="size-5 shrink-0 opacity-50" />
        <input
          #input
          type="search"
          enterkeyhint="search"
          autocomplete="off"
          [value]="value()"
          (input)="value.set(input.value)"
          (keydown.enter)="input.blur()"
          (blur)="onBlur()"
          [placeholder]="'students.search' | t"
          [tabindex]="open() ? 0 : -1"
          class="text-body min-w-0 flex-1 bg-transparent outline-none placeholder:opacity-40 [&::-webkit-search-cancel-button]:appearance-none"
        />
      </label>
      <!-- pointerdown keeps the field focused (no blur first): ✕ clears and closes -->
      <button type="button" (pointerdown)="$event.preventDefault()" (click)="stop()" [attr.aria-label]="'action.clear' | t" class="icon-btn">
        <app-icon name="close" class="size-6" />
      </button>
    </div>
  `,
})
export class FloatingSearch {
  readonly value = model('');
  readonly button = input(true);

  protected readonly open = signal(false);
  private readonly input = viewChild.required<ElementRef<HTMLInputElement>>('input');

  // Where the bar sits: above the keyboard while it's up, else where the floating buttons are.
  protected readonly bottom = signal('var(--float-bottom)');

  constructor() {
    const vv = window.visualViewport;
    if (!vv) return;
    const place = () => {
      const keyboard = window.innerHeight - vv.height - vv.offsetTop;
      this.bottom.set(keyboard > 80 ? `${keyboard + 8}px` : 'var(--float-bottom)');
    };
    vv.addEventListener('resize', place);
    vv.addEventListener('scroll', place);
    inject(DestroyRef).onDestroy(() => {
      vv.removeEventListener('resize', place);
      vv.removeEventListener('scroll', place);
    });
  }

  // Right in the tap: the keyboard comes up.
  start(): void {
    this.open.set(true);
    this.input().nativeElement.focus();
  }

  protected stop(): void {
    this.value.set('');
    this.open.set(false);
    this.input().nativeElement.blur();
  }

  // The keyboard went away with nothing typed: close.
  protected onBlur(): void {
    if (!this.value().trim()) this.open.set(false);
  }
}
