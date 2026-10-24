import { booleanAttribute, Component, computed, input } from '@angular/core';
import { ICON_DATA } from './icon-data';

/** Every icon there is (e.g. to show them all). */
export const ICONS = [
  'google',
  'apple',
  'google-doodle',
  'apple-doodle',
  'logout',
  'logout-all',
  'check',
  'globe',
  'calendar',
  'grid',
  'grip',
  'sparkle',
  'person',
  'library',
  'update',
  'plus',
  'page',
  'trash',
  'search',
  'filter',
  'enter',
  'arrow-up',
  'arrow-down',
  'close',
  'chevron-left',
  'chevron-right',
  'home',
  'chevron-down',
  'lock',
] as const;
export type IconName = (typeof ICONS)[number];

/**
 * The app's icons, as drawn with a marker (docs/icons.md): each its own SVG, 64×64 (in the
 * app's code as data: URLs — icon-data.ts, made by tools/icons.py with the files) —
 * public/icons/{name}.svg the outline only (small ones: menus, rows), drawn in the text's
 * color (currentColor: a mask); and `filled`: public/icons/filled/{name}.svg coloured in with
 * one pastel (big ones, 40px+: the phones' sections) — the dark theme turns those over. The brands' marks (Google,
 * Apple) are drawn here, in currentColor. Size it from the host: `<app-icon name="home" class="size-7" />`.
 */
@Component({
  selector: 'app-icon',
  host: { class: 'inline-flex shrink-0', 'aria-hidden': 'true' },
  template: `
    @if (brand()) {
      <svg viewBox="0 0 24 24" class="size-full">
        @switch (name()) {
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
    } @else {
      @if (filled()) {
        <img [src]="filledUrl()" alt="" draggable="false" class="size-full select-none dark:invert dark:hue-rotate-180" />
      } @else {
        <!-- (the outline as a mask over the text's color: it takes the color it's in — gray, red on
             a Log out under the pointer, light in the dark theme) -->
        <span
          class="block size-full bg-current [mask-position:center] [mask-repeat:no-repeat] [mask-size:contain]"
          [style.mask-image]="url()"
          [style.-webkit-mask-image]="url()"
        ></span>
      }
    }
  `,
})
export class Icon {
  readonly name = input.required<IconName>();
  readonly filled = input(false, { transform: booleanAttribute });
  // (the brands' marks: drawn here; the rest: their files)
  protected readonly brand = computed(() => this.name() === 'google' || this.name() === 'apple');
  // (from the app's own code, not a file each: no request each — ICON_DATA, tools/icons.py)
  protected readonly url = computed(() => `url("${ICON_DATA[this.name()]?.[0]}")`);
  protected readonly filledUrl = computed(() => ICON_DATA[this.name()]?.[1] ?? '');
}
