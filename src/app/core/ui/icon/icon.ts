import { Component, input } from '@angular/core';

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
 * All app icons in one place (24×24, currentColor), drawn as by hand: ink lines a little off
 * straight, the main shape on a light gray. Size it from the host:
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
        <!-- (drawn as by hand: lines a little off straight, corners not quite even; the main shape
             on a light gray, as ink on paper) -->
        <!-- Home: a house, its roof over it, a door -->
        @case ('home') {
          <path d="M5.4 10.9 12 5.2l6.7 5.5-.2 9.4-13 .2z" fill="currentColor" fill-opacity="0.12" stroke="none" />
          <path d="M3.6 11.7 11.7 4.4c.2-.2.5-.2.7 0l8.1 7" />
          <path d="M5.3 10.6l.1 9c0 .5.3.8.8.8l11.7-.2c.5 0 .8-.3.8-.8l.1-9" />
          <path d="M10.1 20.3l.1-5c0-.5.3-.8.8-.8l2.2.1c.5 0 .8.3.8.8l.1 4.8" />
        }
        <!-- A calendar page: the binding on gray, today's date on it -->
        @case ('calendar') {
          <path d="M4.15 9.7 4.1 6.5c0-.8.5-1.3 1.3-1.3l13.3.1c.8 0 1.2.5 1.2 1.2l.1 2.9z" fill="currentColor" fill-opacity="0.12" stroke="none" />
          <path d="M4.1 6.5c0-.8.5-1.3 1.3-1.3l13.3.1c.8 0 1.2.5 1.2 1.2l-.2 12.7c0 .8-.5 1.2-1.3 1.2l-12.8-.2c-.8 0-1.3-.5-1.3-1.2z" />
          <path d="M4.2 9.7c5.2-.2 10.4-.3 15.6-.3M8.3 3.3l.1 3.6M15.6 3.2l.1 3.8" />
          <text x="12" y="17.7" text-anchor="middle" font-size="7.25" font-weight="600" fill="currentColor" stroke="none">{{ day }}</text>
        }
        <!-- The sections' menu (phones): nine dots, not quite in rows -->
        @case ('grid') {
          @for (dot of dots; track $index) {
            <circle [attr.cx]="dot[0]" [attr.cy]="dot[1]" [attr.r]="dot[2]" fill="currentColor" stroke="none" />
          }
        }
        <!-- A person: a round head on gray, the shoulders under it -->
        @case ('person') {
          <path d="M12 3.6c2.4-.1 4.2 1.8 4.1 4.2-.1 2.3-1.9 4.1-4.2 4-2.3 0-4.1-1.8-4-4.1.1-2.4 1.8-4 4.1-4.1z" fill="currentColor" fill-opacity="0.12" />
          <path d="M4.6 20.4c.4-4 3.4-6.3 7.5-6.3 3.9.1 6.8 2.4 7.3 6.2" />
        }
        <!-- The language: a globe on gray, a meridian and the equator -->
        @case ('globe') {
          <path d="M12 3.1c5-.1 9 3.9 8.9 9-.1 4.9-4 8.8-9 8.8-4.9-.1-8.8-4-8.8-9 .1-4.9 4-8.7 8.9-8.8z" fill="currentColor" fill-opacity="0.12" />
          <path d="M12 3.2c-2.6 2.6-3.7 5.7-3.7 8.8 0 3.2 1.2 6.3 3.7 8.8 2.5-2.6 3.7-5.7 3.6-8.9 0-3.1-1.2-6.1-3.6-8.7M3.3 11.8c5.8.4 11.7.4 17.5.1" />
        }
        @case ('check') { <path d="M5 12.8c1.7 1.6 3.4 3.2 5 4.8 2.8-4 5.9-7.7 9.1-11" /> }
        @case ('chevron-left') { <path d="M15.2 18.1 9.1 11.9l6-5.9" /> }
        @case ('chevron-right') { <path d="M8.9 6l6.1 6.1-5.9 6" /> }
        @case ('chevron-down') { <path d="M6 9.1l6.1 5.9 6-6.1" /> }
        <!-- Log out: a door (on gray), an arrow out of it -->
        @case ('logout') {
          <path d="M13.8 4.6 7.2 4.4c-1.4 0-2.1.8-2.1 2.2l.1 11c0 1.3.7 2 2.1 2l6.6-.2z" fill="currentColor" fill-opacity="0.12" stroke="none" />
          <path d="M13.8 4.6 7.2 4.4c-1.4 0-2.1.8-2.1 2.2l.1 11c0 1.3.7 2 2.1 2l6.6-.2" />
          <path d="M10.4 12.1c3.4-.2 6.7-.2 10.1-.1M17 8.6l3.5 3.4-3.6 3.5" />
        }
        <!-- Log out of all devices: the same, another door behind it -->
        @case ('logout-all') {
          <path d="M15 4.6 9.1 4.4c-1.4 0-2.1.8-2.1 2.2l.1 11c0 1.3.7 2 2.1 2l5.9-.2z" fill="currentColor" fill-opacity="0.12" stroke="none" />
          <path d="M15 4.6 9.1 4.4c-1.4 0-2.1.8-2.1 2.2l.1 11c0 1.3.7 2 2.1 2l5.9-.2M3.6 7.6c-.2 3-.2 5.9.1 8.9" />
          <path d="M11.9 12.1c2.9-.2 5.7-.2 8.6-.1M17 8.6l3.5 3.4-3.6 3.5" />
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
    </svg>
  `,
})
export class Icon {
  readonly name = input.required<IconName>();
  readonly strokeWidth = input(1.5); // (one weight for every icon, as an ink pen's)
  // (today's date, for the calendar's)
  protected readonly day = new Date().getDate();
  // The grid's nine dots: x, y, radius — each a little off, as dotted by hand
  protected readonly dots = [
    [5.1, 5, 2], [12.1, 4.8, 2.05], [19, 5.1, 1.95],
    [4.9, 12.1, 2.05], [12, 12, 1.95], [19.1, 11.9, 2],
    [5, 19.1, 1.95], [11.9, 19, 2], [19, 18.9, 2.05],
  ];
}
