import { Component, input } from '@angular/core';

export type IconName =
  | 'plus'
  | 'check'
  | 'close'
  | 'chevron-left'
  | 'chevron-right'
  | 'chevrons-up-down'
  | 'grid';

/**
 * All app icons in one place (24×24 stroke icons, currentColor). Size it from the host:
 * `<app-icon name="plus" class="size-7" />`.
 */
@Component({
  selector: 'app-icon',
  host: { class: 'inline-flex shrink-0', 'aria-hidden': 'true' },
  template: `
    <svg
      viewBox="0 0 24 24"
      class="size-full"
      [attr.fill]="name() === 'grid' ? 'currentColor' : 'none'"
      stroke="currentColor"
      [attr.stroke-width]="strokeWidth()"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      @switch (name()) {
        @case ('plus') { <path d="M12 5v14M5 12h14" /> }
        @case ('check') { <path d="M5 12.5 10 17.5 19 7" /> }
        @case ('close') { <path d="M18 6 6 18M6 6l12 12" /> }
        @case ('chevron-left') { <path d="m15 18-6-6 6-6" /> }
        @case ('chevron-right') { <path d="m9 18 6-6-6-6" /> }
        @case ('chevrons-up-down') { <path d="M8.5 9.5 12 6l3.5 3.5M8.5 14.5 12 18l3.5-3.5" /> }
        @case ('grid') {
          @for (c of gridDots; track $index) {
            <circle [attr.cx]="c[0]" [attr.cy]="c[1]" r="2" stroke="none" />
          }
        }
      }
    </svg>
  `,
})
export class Icon {
  readonly name = input.required<IconName>();
  readonly strokeWidth = input(2.2);

  protected readonly gridDots = [5, 12, 19].flatMap((y) => [5, 12, 19].map((x) => [x, y]));
}
