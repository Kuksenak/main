import { Component, input } from '@angular/core';

export type BrandIconName = 'calendar' | 'people' | 'book' | 'info';

/**
 * Flat multi-color product icons in the logo's colors (Google-product style, no background),
 * for the navigation. Colors come from the --brand-* tokens; gaps between shapes are real
 * cut-outs (masks) or plain gaps, so they work on any background. Size it from the host:
 * `<app-brand-icon name="calendar" class="size-11" />`.
 */
@Component({
  selector: 'app-brand-icon',
  host: { class: 'inline-flex shrink-0', 'aria-hidden': 'true' },
  template: `
    <svg viewBox="0 0 48 48" class="size-full">
      @switch (name()) {
        @case ('calendar') {
          <!-- Flat calendar: a blue header bar over a grid of days, today in orange -->
          <rect x="4" y="5" width="40" height="9" rx="4.5" style="fill: var(--brand-blue)" />
          @for (d of calendarDays; track $index) {
            <rect [attr.x]="d.x" [attr.y]="d.y" width="7.75" height="7.75" rx="2.5" [style.fill]="d.color" />
          }
        }
        @case ('people') {
          <!-- Two people with round shoulders; the back one is cut around the front one -->
          <mask id="brand-people-cut">
            <rect width="48" height="48" fill="#fff" />
            <circle cx="19" cy="16" r="8.5" fill="#000" />
            <path d="M3.5 38a15.5 13.5 0 0 1 31 0v1a6.5 6.5 0 0 1-6.5 6.5H10a6.5 6.5 0 0 1-6.5-6.5z" fill="#000" />
          </mask>
          <g mask="url(#brand-people-cut)">
            <circle cx="32" cy="15" r="5.5" style="fill: var(--brand-yellow)" />
            <path d="M22 35a10.5 10 0 0 1 21 0v0.5a4.5 4.5 0 0 1-4.5 4.5h-12a4.5 4.5 0 0 1-4.5-4.5z" style="fill: var(--brand-orange)" />
          </g>
          <circle cx="19" cy="16" r="7" style="fill: var(--brand-teal)" />
          <path d="M5 38a14 12 0 0 1 28 0v0.5a5.5 5.5 0 0 1-5.5 5.5h-17a5.5 5.5 0 0 1-5.5-5.5z" style="fill: var(--brand-blue)" />
        }
        @case ('book') {
          <!-- Lines of a lesson, no page behind them: an orange heading, then text lines in
               blue and teal (the same footprint as the people icon) -->
          <rect x="4" y="7" width="26" height="7.5" rx="3.75" style="fill: var(--brand-orange)" />
          <rect x="4" y="18" width="40" height="6.5" rx="3.25" style="fill: var(--brand-blue)" />
          <rect x="4" y="28" width="40" height="6.5" rx="3.25" style="fill: var(--brand-teal)" />
          <rect x="4" y="38" width="27" height="6.5" rx="3.25" style="fill: var(--brand-blue)" />
        }
        @case ('info') {
          <!-- Flat "i": an orange dot over a blue stem -->
          <circle cx="24" cy="10" r="6" style="fill: var(--brand-orange)" />
          <rect x="18" y="20" width="12" height="25" rx="6" style="fill: var(--brand-blue)" />
        }
      }
    </svg>
  `,
})
export class BrandIcon {
  readonly name = input.required<BrandIconName>();
  // Calendar: 4 × 3 days; one is today (orange), one more highlighted (yellow).
  protected readonly calendarDays = [0, 1, 2].flatMap((row) =>
    [0, 1, 2, 3].map((col) => ({
      x: 4 + col * 10.75,
      y: 19 + row * 9.25,
      color:
        row === 1 && col === 2
          ? 'var(--brand-orange)'
          : row === 2 && col === 0
            ? 'var(--brand-yellow)'
            : 'var(--brand-teal)',
    })),
  );
}
