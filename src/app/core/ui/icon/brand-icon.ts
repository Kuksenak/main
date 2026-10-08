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
          <!-- Tear-off calendar page (iOS-like), fully transparent: its outline, the blue header,
               a curled corner as if being flipped, today's date -->
          <path
            d="M12 4h24a7 7 0 0 1 7 7v22l-9 9H12a7 7 0 0 1-7-7V11a7 7 0 0 1 7-7z"
            style="fill: none; stroke: color-mix(in srgb, var(--brand-blue) 45%, white); stroke-width: 1"
          />
          <path d="M12 4h24a7 7 0 0 1 7 7v3H5v-3a7 7 0 0 1 7-7z" style="fill: var(--brand-blue)" />
          <path
            d="M34 42c0-5 3-9 9-9l-9 9z"
            style="fill: color-mix(in srgb, var(--brand-blue) 45%, #dfe4ee); stroke: color-mix(in srgb, var(--brand-blue) 60%, white); stroke-width: 0.75; stroke-linejoin: round"
          />
          <text
            x="24"
            y="35"
            text-anchor="middle"
            style="fill: var(--brand-orange); font: 800 19.5px -apple-system, system-ui, 'Segoe UI', sans-serif; letter-spacing: -0.04em"
          >{{ today }}</text>
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
  // Calendar icon shows today's date (taken when the icon is created, e.g. each time the menu opens).
  protected readonly today = new Date().getDate();
}
