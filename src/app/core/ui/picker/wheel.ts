import { afterNextRender, Component, ElementRef, input, model, viewChild } from '@angular/core';
import { UiOption } from './select';

const ROW = 36;

/**
 * A wheel, as iOS's in Clock: a column turned by the finger, the one in the middle (on a gray band)
 * the chosen one; five in sight, the ends fading out; a tap on one turns it to the middle. Set as it
 * comes to rest. `[(value)]`, `options`.
 *   <ui-wheel [options]="limits" [(value)]="limit" />
 */
@Component({
  selector: 'ui-wheel',
  host: { class: 'relative block h-[180px] select-none' },
  template: `
    <div class="pointer-events-none absolute inset-x-2 top-[72px] h-9 rounded-full bg-tint"></div>
    <div
      #column
      role="listbox"
      [attr.aria-label]="label() || null"
      (scroll)="moved()"
      class="relative h-full snap-y snap-mandatory overflow-y-auto overscroll-contain py-[72px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden
             [mask-image:linear-gradient(transparent,black_30%,black_70%,transparent)]"
    >
      @for (option of options(); track option.value; let i = $index) {
        <button
          type="button"
          role="option"
          [attr.aria-selected]="option.value === value()"
          (click)="turnTo(i)"
          class="flex h-9 w-full snap-center items-center justify-center text-[1.25rem] text-fg tabular-nums"
        >
          {{ option.label }}
        </button>
      }
    </div>
  `,
})
export class UiWheel {
  readonly options = input.required<UiOption[]>();
  readonly value = model<string>('');
  readonly label = input('');

  private readonly column = viewChild.required<ElementRef<HTMLElement>>('column');
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    // (opened: the chosen one in the middle, at once)
    afterNextRender(() => {
      const i = this.options().findIndex((o) => o.value === this.value());
      this.column().nativeElement.scrollTop = Math.max(0, i) * ROW;
    });
  }

  protected turnTo(i: number): void {
    this.column().nativeElement.scrollTo({ top: i * ROW, behavior: 'smooth' });
  }

  // (at rest: the one in the middle chosen)
  protected moved(): void {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      const options = this.options();
      const i = Math.min(options.length - 1, Math.max(0, Math.round(this.column().nativeElement.scrollTop / ROW)));
      if (options[i] && options[i].value !== this.value()) this.value.set(options[i].value);
    }, 150);
  }
}
