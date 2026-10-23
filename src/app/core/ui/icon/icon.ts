import { Component, input } from '@angular/core';

export type IconName = 'google' | 'apple' | 'logout' | 'logout-all' | 'check' | 'globe' | 'calendar' | 'grid' | 'person' | 'chevron-left' | 'chevron-right' | 'home' | 'chevron-down';

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
      fill="none"
      stroke="currentColor"
      [attr.stroke-width]="strokeWidth()"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      @switch (name()) {
        <!-- (a screen and a phone: every device) -->
        @case ('home') { <path d="M4 10.25 12 4l8 6.25V19a1.5 1.5 0 0 1-1.5 1.5H15V15a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v5.5H5.5A1.5 1.5 0 0 1 4 19z" fill="currentColor" fill-opacity="0.1" /> }
        @case ('chevron-down') { <path d="m6 9 6 6 6-6" /> }
        <!-- A calendar page with today's date on it -->
        @case ('calendar') { <rect x="3.75" y="5" width="16.5" height="15.25" rx="2.75" /><path d="M3.75 9.25h16.5M8.25 3.25v3.5M15.75 3.25v3.5" /><text x="12" y="17.6" text-anchor="middle" font-size="7.25" font-weight="600" fill="currentColor" stroke="none">{{ day }}</text> }
        <!-- The sections' menu (phones): nine dots -->
        @case ('grid') {
          @for (y of [5, 12, 19]; track y) {
            @for (x of [5, 12, 19]; track x) {
              <circle [attr.cx]="x" [attr.cy]="y" r="2" fill="currentColor" stroke="none" />
            }
          }
        }
        @case ('person') { <circle cx="12" cy="7.75" r="4" fill="currentColor" fill-opacity="0.1" /><path d="M4.5 20.5c.4-4.1 3.5-6.5 7.5-6.5s7.1 2.4 7.5 6.5" /> }
        @case ('chevron-left') { <path d="m15 18-6-6 6-6" /> }
        @case ('chevron-right') { <path d="m9 18 6-6-6-6" /> }
        @case ('globe') { <circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9s1.3-6.4 3.8-9z" /> }
        @case ('check') { <path d="M5 12.5 10 17.5 19 7" /> }
        @case ('logout') { <path d="M14 4.5H7a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h7M10.5 12h10M17 8.5l3.5 3.5-3.5 3.5" /> }
        <!-- Log out of all devices: the same, its door doubled (another one behind it) -->
        @case ('logout-all') { <path d="M15 4.5H9a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h6M3.5 7.5v9M12 12h8.5M17 8.5l3.5 3.5-3.5 3.5" /> }
        <!-- Brand marks: filled; Google keeps its brand colors, Apple uses currentColor -->
        @case ('google') {
          <path stroke="none" fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
          <path stroke="none" fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
          <path stroke="none" fill="#FBBC05" d="M5.84 14.09A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.43.34-2.09V7.07H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.93l3.66-2.84z" />
          <path stroke="none" fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
        }
        @case ('apple') {
          <path stroke="none" fill="currentColor" d="M16.37 12.77c-.03-2.64 2.16-3.91 2.26-3.97-1.23-1.8-3.15-2.05-3.83-2.08-1.63-.17-3.18.96-4.01.96-.83 0-2.1-.94-3.46-.91-1.78.03-3.42 1.03-4.34 2.62-1.85 3.21-.47 7.96 1.33 10.56.88 1.27 1.93 2.7 3.3 2.65 1.33-.05 1.83-.86 3.43-.86 1.6 0 2.05.86 3.45.83 1.43-.02 2.33-1.29 3.2-2.57 1.01-1.47 1.42-2.9 1.45-2.97-.03-.01-2.77-1.06-2.8-4.22zM13.73 5c.73-.89 1.22-2.12 1.09-3.35-1.05.04-2.32.7-3.07 1.58-.67.78-1.26 2.03-1.1 3.23 1.17.09 2.36-.59 3.08-1.46z" />
        }
      }
    </svg>
  `,
})
export class Icon {
  readonly name = input.required<IconName>();
  readonly strokeWidth = input(1.35); // (one weight for every icon: thin, as Notion's)
  // (today's date, for the calendar's)
  protected readonly day = new Date().getDate();
}
