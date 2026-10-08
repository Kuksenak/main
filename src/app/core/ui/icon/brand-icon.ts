import { Component, inject, input } from '@angular/core';
import { I18nService } from '../../i18n/i18n.service';

export type BrandIconName = 'calendar' | 'people' | 'book' | 'settings' | 'info';

/**
 * Flat multi-color product icons in the logo's colors (Google-product style, no background),
 * for the navigation. Colors come from the --brand-* tokens; gaps between shapes are real
 * cut-outs (masks) or plain gaps, so they work on any background. Size it from the host:
 * `<app-brand-icon name="calendar" class="size-11" />`.
 */
@Component({
  selector: 'app-brand-icon',
  host: { class: 'inline-flex shrink-0', 'aria-hidden': 'true' },
  styles: `
    /* iOS-like white app tile: stays white in dark mode, a hairline + soft shadow on white */
    .brand-tile {
      fill: #fff;
      stroke: rgb(0 0 0 / 0.08);
      stroke-width: 0.75;
      filter: drop-shadow(0 1px 1.5px rgb(0 0 0 / 0.12));
    }
    .brand-weekday {
      fill: var(--brand-orange);
      font: 600 8.5px -apple-system, system-ui, 'Segoe UI', sans-serif;
      letter-spacing: 0.02em;
    }
    .brand-date {
      fill: #1c1c1e;
      font: 300 25px -apple-system, system-ui, 'Segoe UI', sans-serif;
      letter-spacing: -0.03em;
    }
  `,
  template: `
    <svg viewBox="0 0 48 48" class="size-full">
      @switch (name()) {
        @case ('calendar') {
          <!-- iOS Calendar style: a white rounded square, the weekday in orange, today's date -->
          <rect x="3" y="3" width="42" height="42" rx="10" class="brand-tile" />
          <text x="24" y="16" text-anchor="middle" class="brand-weekday">{{ weekday }}</text>
          <text x="24" y="39.5" text-anchor="middle" class="brand-date">{{ today }}</text>
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
        @case ('settings') {
          <!-- Three sliders: colored tracks, each with its knob -->
          <rect x="4" y="8.5" width="40" height="5" rx="2.5" style="fill: var(--brand-blue)" />
          <circle cx="31" cy="11" r="6.5" style="fill: var(--brand-orange)" />
          <rect x="4" y="21.5" width="40" height="5" rx="2.5" style="fill: var(--brand-teal)" />
          <circle cx="15" cy="24" r="6.5" style="fill: var(--brand-blue)" />
          <rect x="4" y="34.5" width="40" height="5" rx="2.5" style="fill: var(--brand-yellow)" />
          <circle cx="35" cy="37" r="6.5" style="fill: var(--brand-teal)" />
        }
        @case ('info') {
          <!-- The same white square with an "i": orange dot, blue stem -->
          <rect x="3" y="3" width="42" height="42" rx="10" class="brand-tile" />
          <circle cx="24" cy="14.5" r="3.5" style="fill: var(--brand-orange)" />
          <rect x="20.75" y="21" width="6.5" height="17" rx="3.25" style="fill: var(--brand-blue)" />
        }
      }
    </svg>
  `,
})
export class BrandIcon {
  readonly name = input.required<BrandIconName>();
  // Calendar icon shows today's weekday and date (taken when the icon is created, e.g. each
  // time the menu opens).
  protected readonly today = new Date().getDate();
  protected readonly weekday = inject(I18nService)
    .date(new Date(), { weekday: 'short' })
    .replace('.', '')
    .toLocaleUpperCase();
}
