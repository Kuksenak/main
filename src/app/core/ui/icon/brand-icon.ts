import { Component, computed, inject, input } from '@angular/core';
import { I18nService } from '../../i18n/i18n.service';

export type BrandIconName = 'calendar' | 'people' | 'book';

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
      fill: #fff;
      font: 600 7.5px -apple-system, system-ui, 'Segoe UI', sans-serif;
      letter-spacing: 0.02em;
    }
    .brand-small {
      fill: rgb(0 0 0 / 0.45);
      font: 600 6px -apple-system, system-ui, 'Segoe UI', sans-serif;
      letter-spacing: 0.02em;
    }
    .brand-date {
      fill: var(--brand-orange);
      font: 700 21px -apple-system, system-ui, 'Segoe UI', sans-serif;
      letter-spacing: -0.04em;
    }
  `,
  template: `
    <svg viewBox="0 0 48 48" class="size-full">
      @switch (name()) {
        @case ('calendar') {
          <!-- A calendar page: a blue band with the weekday, a white page with today's date in orange -->
          <mask id="brand-cal-shape">
            <rect x="3" y="3" width="42" height="42" rx="8" fill="#fff" />
          </mask>
          <g mask="url(#brand-cal-shape)">
            <rect width="48" height="48" fill="#fff" />
            <rect width="48" height="16" style="fill: var(--brand-blue)" />
          </g>
          <rect x="3" y="3" width="42" height="42" rx="8" fill="none" style="stroke: rgb(0 0 0 / 0.08); stroke-width: 0.75" />
          @if (date()) {
            <!-- A given date (e.g. a lesson's): the month in the band, the date, the weekday under it -->
            <text x="24" y="12.8" text-anchor="middle" class="brand-weekday">{{ month() }}</text>
            <text x="24" y="33" text-anchor="middle" class="brand-date" style="font-size: 18px">{{ day() }}</text>
            <text x="24" y="41.5" text-anchor="middle" class="brand-small">{{ weekday() }}</text>
          } @else {
            <text x="24" y="12.8" text-anchor="middle" class="brand-weekday">{{ weekday() }}</text>
            <text x="24" y="38" text-anchor="middle" class="brand-date">{{ day() }}</text>
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
      }
    </svg>
  `,
})
export class BrandIcon {
  readonly name = input.required<BrandIconName>();
  /** Calendar: the date it shows (default today, taken when the icon is created). */
  readonly date = input<Date | null>(null);

  private readonly i18n = inject(I18nService);
  private readonly created = new Date();
  protected readonly day = computed(() => (this.date() ?? this.created).getDate());
  protected readonly month = computed(() =>
    this.i18n
      .date(this.date() ?? this.created, { month: 'short' })
      .replace('.', '')
      .toLocaleUpperCase(),
  );
  protected readonly weekday = computed(() =>
    this.i18n
      .date(this.date() ?? this.created, { weekday: 'short' })
      .replace('.', '')
      .toLocaleUpperCase(),
  );
}
