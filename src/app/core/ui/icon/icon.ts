import { Component, input } from '@angular/core';

export type IconName =
  | 'plus'
  | 'check'
  | 'close'
  | 'chevron-left'
  | 'chevron-right'
  | 'chevrons-up-down'
  | 'search'
  | 'person'
  | 'people'
  | 'calendar'
  | 'info'
  | 'book'
  | 'link'
  | 'text'
  | 'copy'
  | 'google'
  | 'apple';

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
        @case ('plus') { <path d="M12 5v14M5 12h14" /> }
        @case ('check') { <path d="M5 12.5 10 17.5 19 7" /> }
        @case ('close') { <path d="M18 6 6 18M6 6l12 12" /> }
        @case ('people') { <circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14a6.5 6.5 0 0 1 3.5 6" /> }
        @case ('calendar') { <rect x="3.5" y="5" width="17" height="15.5" rx="3" /><path d="M3.5 10h17M8 3v4M16 3v4" /> }
        @case ('info') { <circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.5v.5" /> }
        @case ('book') { <path d="M12 6.5C10 5 7 4.5 3.5 4.5v14c3.5 0 6.5.5 8.5 2 2-1.5 5-2 8.5-2v-14c-3.5 0-6.5.5-8.5 2zM12 6.5v14" /> }
        @case ('link') { <path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1" /> }
        @case ('text') { <path d="M5 6h14M5 10h14M5 14h14M5 18h9" /> }
        @case ('copy') { <rect x="8.5" y="8.5" width="12" height="12" rx="2.5" /><path d="M15.5 8.5v-2a2.5 2.5 0 0 0-2.5-2.5H6a2.5 2.5 0 0 0-2.5 2.5v7A2.5 2.5 0 0 0 6 16h2.5" /> }
        @case ('person') { <circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /> }
        @case ('search') { <circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /> }
        @case ('chevron-left') { <path d="m15 18-6-6 6-6" /> }
        @case ('chevron-right') { <path d="m9 18 6-6-6-6" /> }
        @case ('chevrons-up-down') { <path d="M8.5 9.5 12 6l3.5 3.5M8.5 14.5 12 18l3.5-3.5" /> }
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
  readonly strokeWidth = input(2.2);
}
