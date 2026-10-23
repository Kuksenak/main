import { Component, computed, input } from '@angular/core';

/** Every icon there is (e.g. to show them all). */
export const ICONS = [
  'google',
  'apple',
  'logout',
  'logout-all',
  'check',
  'globe',
  'calendar',
  'grid',
  'person',
  'chevron-left',
  'chevron-right',
  'home',
  'chevron-down',
] as const;
export type IconName = (typeof ICONS)[number];

/**
 * All app icons in one place (24×24, currentColor), as drawn with an ink pen: sharp corners, lines
 * a little off (and wobbling a little: the hand-drawn filter, app.html), one part on a light gray.
 * The line is as thick at any size, `--icon-ink` (1.5px; a big icon a thicker one, e.g.
 * `[--icon-ink:2.2px]`). Size it from the host: `<app-icon name="home" class="size-7" />`.
 */
@Component({
  selector: 'app-icon',
  host: { class: 'inline-flex shrink-0', 'aria-hidden': 'true' },
  template: `
    <svg
      viewBox="0 0 24 24"
      class="size-full [stroke-width:var(--icon-ink,1.5px)] [&_*]:[vector-effect:non-scaling-stroke]"
      fill="none"
      stroke="currentColor"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <g [attr.filter]="brand() ? null : 'url(#hand-drawn)'">
      @switch (name()) {
        <!-- (as drawn with an ink pen: sharp corners, lines a little off, one part on gray; the
             wobble itself is the hand-drawn filter's, see app.html) -->
        <!-- Home: a house, its roof; the door on gray -->
        @case ('home') {
          <path d="M10 20.1 10.1 14.6 14 14.5 14.1 20.1z" fill="currentColor" fill-opacity="0.12" stroke="none" />
          <path d="M3.4 11.3 12.1 3.9 20.7 11.1M5.6 9.6 5.4 20.2 18.7 20 18.5 9.5M10 20.1 10.1 14.6 14 14.5 14.1 20.1" />
        }
        <!-- A calendar page: its top on gray, two rings, today's date -->
        @case ('calendar') {
          <path d="M4.1 5.4 19.8 5.2 19.9 9.4 4.2 9.6z" fill="currentColor" fill-opacity="0.12" stroke="none" />
          <path d="M4.1 5.4 19.8 5.2 19.7 20.3 4.3 20.4zM4.2 9.6 19.9 9.4M8.2 3.2 8.3 7.1M15.8 3.1 15.7 7" />
          <text x="12.1" y="17.9" text-anchor="middle" font-size="7.5" font-weight="700" fill="currentColor" stroke="none">{{ day }}</text>
        }
        <!-- The sections (phones): four squares as a little table, one on gray -->
        @case ('grid') {
          <path d="M12.6 12.7 19.9 12.6 20 19.9 12.7 20z" fill="currentColor" fill-opacity="0.12" stroke="none" />
          <path d="M4.1 4.2 19.8 4 20 19.9 4.2 20.1zM12.1 4.1 12.2 20M4.2 12.3 19.9 12.1" />
        }
        <!-- A person: the head on gray, the shoulders a flat-bottomed arch -->
        @case ('person') {
          <path d="M12.1 3.6c2.3 0 4 1.8 4 4.1 0 2.4-1.8 4.1-4.1 4.1-2.4 0-4.1-1.7-4.1-4.1 0-2.3 1.9-4.1 4.2-4.1z" fill="currentColor" fill-opacity="0.12" />
          <path d="M4.3 20.6c.2-3.9 3.4-6.6 7.8-6.6 4.3.1 7.5 2.7 7.6 6.5z" />
        }
        <!-- The language: a globe on gray, a meridian, the equator -->
        @case ('globe') {
          <path d="M12 3.2c4.9-.1 8.9 3.8 8.9 8.8 0 5-4 9-9 8.9-4.9 0-8.8-4-8.7-8.9.1-5 4-8.7 8.8-8.8z" fill="currentColor" fill-opacity="0.12" />
          <path d="M11.9 3.3c-2.5 2.7-3.6 5.6-3.6 8.8 0 3.1 1.2 6.1 3.7 8.7M12.1 3.3c2.4 2.6 3.5 5.6 3.5 8.7 0 3.2-1.2 6.2-3.6 8.8M3.4 12.1 20.8 11.9" />
        }
        @case ('check') { <path d="M4.6 12.9 9.8 17.9 19.6 6.3" /> }
        @case ('chevron-left') { <path d="M15.1 18.2 8.9 12.1 15 5.8" /> }
        @case ('chevron-right') { <path d="M9 5.8 15.1 12 8.9 18.2" /> }
        @case ('chevron-down') { <path d="M5.8 9 12 15.1 18.2 8.9" /> }
        <!-- Log out: a door on gray (open at the right), the arrow out of it -->
        @case ('logout') {
          <path d="M4.6 4.1 12.4 4.3 12.3 19.9 4.4 20z" fill="currentColor" fill-opacity="0.12" stroke="none" />
          <path d="M12.4 7.6 12.4 4.3 4.6 4.1 4.4 20 12.3 19.9 12.4 16.4M9.2 12.1 20.4 11.9M16.9 8.4 20.5 11.9 16.8 15.6" />
        }
        <!-- Log out of all devices: the same, another door behind it -->
        @case ('logout-all') {
          <path d="M6.6 6.1 13.4 6.2 13.3 19.9 6.5 20z" fill="currentColor" fill-opacity="0.12" stroke="none" />
          <path d="M3.8 17.9 3.9 4 11.3 4.1M13.4 8.9 13.4 6.2 6.6 6.1 6.5 20 13.3 19.9 13.4 17.2M10.2 13 20.4 12.9M17 9.4 20.5 12.9 16.9 16.6" />
        }
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
      </g>
    </svg>
  `,
})
export class Icon {
  readonly name = input.required<IconName>();
  // (today's date, for the calendar's)
  protected readonly day = new Date().getDate();
  // (the brands' marks are as they are: not drawn by hand)
  protected readonly brand = computed(() => this.name() === 'google' || this.name() === 'apple');
}
