import { Component, inject, input } from '@angular/core';
import { I18nService } from '../../i18n/i18n.service';

export type BrandIconName = 'calendar' | 'people' | 'book' | 'settings' | 'info';

/**
 * Flat multi-color product icons in the logo's colors (Google-product style, no background),
 * for the navigation. Colors come from the --brand-* tokens; gaps between shapes are real
 * cut-outs (masks) or plain gaps, so they work on any background. Size it from the host:
 * `<app-brand-icon name="calendar" class="size-11" />`.
 */
/** Gear outline: `teeth` teeth between radius `inner` (root) and `outer` (tip). */
function gearPath(cx: number, cy: number, outer: number, inner: number, teeth: number): string {
  const step = (2 * Math.PI) / teeth;
  const pt = (r: number, a: number) => `${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`;
  const parts: string[] = [];
  for (let i = 0; i < teeth; i++) {
    const a = i * step - Math.PI / 2;
    parts.push(pt(inner, a - step * 0.3), pt(outer, a - step * 0.16), pt(outer, a + step * 0.16), pt(inner, a + step * 0.3));
  }
  return `M${parts.join('L')}Z`;
}

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
      fill: var(--brand-blue);
      font: 600 8.5px -apple-system, system-ui, 'Segoe UI', sans-serif;
      letter-spacing: 0.02em;
    }
    .brand-date {
      fill: var(--brand-orange);
      font: 600 21px -apple-system, system-ui, 'Segoe UI', sans-serif;
      letter-spacing: -0.04em;
    }
  `,
  template: `
    <svg viewBox="0 0 48 48" class="size-full">
      @switch (name()) {
        @case ('calendar') {
          <!-- A white tear-off page: a pale blue band with the weekday, today's date in orange,
               the bottom-right corner curling up like the old paper icon -->
          <path d="M13 3h22a10 10 0 0 1 10 10v22l-10 10H13A10 10 0 0 1 3 35V13A10 10 0 0 1 13 3z" class="brand-tile" />
          <path d="M13 3h22a10 10 0 0 1 10 10v7H3v-7A10 10 0 0 1 13 3z" style="fill: color-mix(in srgb, var(--brand-blue) 14%, white)" />
          <path d="M35 45c0-5.5 4-10 10-10l-10 10z" style="fill: #e6e9ef; stroke: rgb(0 0 0 / 0.08); stroke-width: 0.5; stroke-linejoin: round" />
          <text x="24" y="15.5" text-anchor="middle" class="brand-weekday">{{ weekday }}</text>
          <text x="24" y="38" text-anchor="middle" class="brand-date">{{ today }}</text>
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
          <!-- A blue gear with a see-through hub and an orange axle -->
          <mask id="brand-gear-hub">
            <rect width="48" height="48" fill="#fff" />
            <circle cx="24" cy="24" r="8.5" fill="#000" />
          </mask>
          <path
            [attr.d]="gear"
            mask="url(#brand-gear-hub)"
            style="fill: var(--brand-blue); stroke: var(--brand-blue); stroke-width: 2.5; stroke-linejoin: round"
          />
          <circle cx="24" cy="24" r="4.5" style="fill: var(--brand-orange)" />
        }
        @case ('info') {
          <!-- Just an "i", flat: an orange dot over a blue stem -->
          <circle cx="24" cy="10.5" r="5.5" style="fill: var(--brand-orange)" />
          <rect x="18.5" y="20" width="11" height="24" rx="5.5" style="fill: var(--brand-blue)" />
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
  // Settings: an 8-tooth gear outline, centered (teeth slightly narrower at the tip).
  protected readonly gear = gearPath(24, 24, 20, 15, 8);
  protected readonly weekday = inject(I18nService)
    .date(new Date(), { weekday: 'short' })
    .replace('.', '')
    .toLocaleUpperCase();
}
