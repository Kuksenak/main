import { Component, input } from '@angular/core';

export type BrandIconName = 'calendar' | 'people' | 'info';

/**
 * Flat multi-color product icons in the logo's colors (Google-product style, no background),
 * for the navigation launcher. Colors come from the --brand-* tokens; gaps between shapes are
 * real cut-outs (masks), so they work on any background. Size it from the host:
 * `<app-brand-icon name="calendar" class="size-11" />`.
 */
@Component({
  selector: 'app-brand-icon',
  host: { class: 'inline-flex shrink-0', 'aria-hidden': 'true' },
  template: `
    <svg viewBox="0 0 48 48" class="size-full">
      @switch (name()) {
        @case ('calendar') {
          <!-- Google-Calendar style: white page, frame in the four brand colors, folded corner,
               today's date in the middle -->
          <path d="M11 5h26a6 6 0 0 1 6 6v23l-9 9H11a6 6 0 0 1-6-6V11a6 6 0 0 1 6-6z" fill="#fff" />
          <path d="M11 5h26a6 6 0 0 1 6 6v2H5v-2a6 6 0 0 1 6-6z" style="fill: var(--brand-blue)" />
          <path d="M5 13h7v22H5z" style="fill: var(--brand-teal)" />
          <path d="M5 35h29v8H11a6 6 0 0 1-6-6z" style="fill: var(--brand-yellow)" />
          <path d="M36 13h7v21h-7z" style="fill: var(--brand-orange)" />
          <path d="M34 34h9l-9 9z" style="fill: color-mix(in srgb, var(--brand-orange) 70%, black)" />
          <text
            x="24"
            y="31.5"
            text-anchor="middle"
            style="fill: var(--brand-blue); font: 700 18px -apple-system, system-ui, 'Segoe UI', sans-serif; letter-spacing: -0.04em"
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
        @case ('info') {
          <!-- An "i" on a soft round badge -->
          <circle cx="24" cy="24" r="19" style="fill: color-mix(in srgb, var(--brand-teal) 18%, transparent)" />
          <circle cx="24" cy="15" r="3.6" style="fill: var(--brand-orange)" />
          <rect x="20.5" y="21.5" width="7" height="15" rx="3.5" style="fill: var(--brand-teal)" />
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
