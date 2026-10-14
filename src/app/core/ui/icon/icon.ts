import { Component, input } from '@angular/core';

export type IconName =
  | 'plus'
  | 'check'
  | 'close'
  | 'chevron-left'
  | 'chevron-right'
  | 'enter'
  | 'menu'
  | 'cloud-check'
  | 'dots'
  | 'duplicate'
  | 'paste'
  | 'clipboard'
  | 'arrow-up'
  | 'page'
  | 'arrow-up-right'
  | 'sidebar'
  | 'inbox'
  | 'unlock'
  | 'trash'
  | 'popout'
  | 'chevrons-up-down'
  | 'chevron-down'
  | 'search'
  | 'person'
  | 'people'
  | 'calendar'
  | 'info'
  | 'book'
  | 'link'
  | 'text'
  | 'copy'
  | 'paperclip'
  | 'repeat'
  | 'i'
  | 'grid'
  | 'heading'
  | 'grip'
  | 'image'
  | 'video'
  | 'checklist'
  | 'compose'
  | 'google'
  | 'apple'
  | 'share'
  | 'plus-square'
  | 'dots-vertical'
  | 'install'
  | 'phone'
  | 'monitor'
  | 'mail'
  | 'call'
  | 'globe'
  | 'lock'
  | 'eye'
  | 'exercise'
  | 'bell'
  | 'clock'
  | 'library'
  | 'calendar-day'
  | 'wand';

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
        @case ('lock') { <rect x="5" y="11" width="14" height="9.5" rx="2.5" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /> }
        @case ('eye') { <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="3" /> }
        @case ('exercise') { <circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17v.01" /> }
        @case ('wand') { <path d="m4 20 11-11M13.5 7.5l3 3" /><path d="M17 3v3M15.5 4.5h3M20 8.5v2.5M18.75 9.75h2.5M10 3.5v2M9 4.5h2" /> }
        <!-- (Notion Calendar's: today's date on the page, a page behind) -->
        @case ('calendar-day') { <path d="M4.5 16.5V6a1.5 1.5 0 0 1 1.5-1.5h10.5" /><rect x="7" y="7" width="13.5" height="13.5" rx="2" /><path d="M7 10.5h13.5" /><text x="13.75" y="18.4" text-anchor="middle" font-size="7.5" font-weight="600" fill="currentColor" stroke="none">{{ day }}</text> }
        @case ('library') { <rect x="4.5" y="4" width="4" height="16" rx="0.75" /><rect x="8.5" y="4" width="4" height="16" rx="0.75" /><path d="M12.6 5.2 16.5 4.4l3.1 14.8-3.9.8z" /> }
        @case ('clock') { <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /> }
        @case ('bell') { <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" /><path d="M10 20.5a2 2 0 0 0 4 0" /> }
        @case ('globe') { <circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9s1.3-6.4 3.8-9z" /> }
        @case ('info') { <circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.5v.5" /> }
        @case ('book') { <path d="M12 6.5C10 5 7 4.5 3.5 4.5v14c3.5 0 6.5.5 8.5 2 2-1.5 5-2 8.5-2v-14c-3.5 0-6.5.5-8.5 2zM12 6.5v14" /> }
        @case ('link') { <path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1" /> }
        @case ('text') { <path d="M5 6h14M5 10h14M5 14h14M5 18h9" /> }
        @case ('copy') { <rect x="8.5" y="8.5" width="12" height="12" rx="2.5" /><path d="M15.5 8.5v-2a2.5 2.5 0 0 0-2.5-2.5H6a2.5 2.5 0 0 0-2.5 2.5v7A2.5 2.5 0 0 0 6 16h2.5" /> }
        <!-- SF Symbols-like: "info" (a typeset i) and "square.and.pencil" (edit) -->
        @case ('i') { <circle cx="12" cy="5.5" r="1.6" fill="currentColor" stroke="none" /><path d="M10 10h2v9M9 19h6" /> }
        @case ('compose') { <path d="M11.5 4.5h-5a2.5 2.5 0 0 0-2.5 2.5v10.5a2.5 2.5 0 0 0 2.5 2.5H17a2.5 2.5 0 0 0 2.5-2.5v-5" /><path d="M18.3 3.7a1.9 1.9 0 0 1 2.7 2.7l-8.3 8.3-3.6.9.9-3.6z" /> }
        @case ('grid') {
          @for (y of [5, 12, 19]; track y) {
            @for (x of [5, 12, 19]; track x) {
              <circle [attr.cx]="x" [attr.cy]="y" r="2" fill="currentColor" stroke="none" />
            }
          }
        }
        @case ('grip') {
          @for (y of [6, 12, 18]; track y) {
            <circle cx="9" [attr.cy]="y" r="1.5" fill="currentColor" stroke="none" /><circle cx="15" [attr.cy]="y" r="1.5" fill="currentColor" stroke="none" />
          }
        }
        @case ('heading') { <path d="M6 5v14M18 5v14M6 12h12" /> }
        @case ('image') { <rect x="3.5" y="4.5" width="17" height="15" rx="3" /><circle cx="9" cy="10" r="1.75" /><path d="m4 17 5-4.5 4 3.5 3-2.5 4 3.5" /> }
        @case ('video') { <rect x="3.5" y="5.5" width="13" height="13" rx="3" /><path d="m16.5 10 4-2.5v9l-4-2.5" /> }
        @case ('checklist') { <path d="m4 6.5 1.5 1.5L8 5.5M4 13.5 5.5 15 8 12.5M11 7h9M11 14h9M11 19h6" /> }
        @case ('repeat') { <path d="m17 3 3 3-3 3" /><path d="M4 11.5V10a4 4 0 0 1 4-4h12" /><path d="m7 21-3-3 3-3" /><path d="M20 12.5V14a4 4 0 0 1-4 4H4" /> }
        @case ('paperclip') { <path d="m20.5 11.5-8.6 8.6a5.5 5.5 0 0 1-7.8-7.8l8.6-8.6a3.7 3.7 0 0 1 5.2 5.2l-8.6 8.6a1.8 1.8 0 0 1-2.6-2.6l8-8" /> }
        @case ('person') { <circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /> }
        @case ('search') { <circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /> }
        @case ('chevron-left') { <path d="m15 18-6-6 6-6" /> }
        @case ('chevron-right') { <path d="m9 18 6-6-6-6" /> }
        <!-- Open in a window: a square, an arrow out of it -->
        @case ('popout') { <path d="M13 4h7v7" /><path d="M20 4l-9 9" /><path d="M18 14v4.5A1.5 1.5 0 0 1 16.5 20h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10" /> }
        <!-- Delete: a bin -->
        @case ('trash') { <path d="M4.5 6.5h15" /><path d="M9.5 6.5V5a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 14.5 5v1.5" /><path d="M6.5 6.5l.8 12.1A1.5 1.5 0 0 0 8.8 20h6.4a1.5 1.5 0 0 0 1.5-1.4l.8-12.1" /><path d="M10.25 10.5v6M13.75 10.5v6" /> }
        <!-- More: three dots in a row -->
        @case ('dots') { <circle cx="6" cy="12" r="1.1" fill="currentColor" /><circle cx="12" cy="12" r="1.1" fill="currentColor" /><circle cx="18" cy="12" r="1.1" fill="currentColor" /> }
        <!-- Duplicate: two pages, a plus on the front one -->
        @case ('duplicate') { <rect x="8.5" y="8.5" width="11.5" height="11.5" rx="2" /><path d="M15.5 8.5V6A2 2 0 0 0 13.5 4H6a2 2 0 0 0-2 2v7.5a2 2 0 0 0 2 2h2.5" /> }
        <!-- Paste: a clipboard -->
        <!-- Paste (as Notion's): a plain clipboard -->
        @case ('paste') { <path d="M15 4.5h1.5A2.5 2.5 0 0 1 19 7v11.5a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 5 18.5V7a2.5 2.5 0 0 1 2.5-2.5H9" /><rect x="9" y="2.75" width="6" height="3.5" rx="1.25" /> }
        <!-- A page (as Notion's): a sheet with a folded corner and lines -->
        @case ('page') { <path d="M13.5 3.5H7.5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-10z" /><path d="M13.5 3.5v5h5" /><path d="M9 13h6M9 16.5h6" /> }
        <!-- The sidebar: a panel, its left column -->
        @case ('sidebar') { <rect x="3.5" y="5" width="17" height="14" rx="2.5" /><path d="M9.5 5v14" /> }
        <!-- The inbox: a tray -->
        @case ('inbox') { <path d="M4 13.5 6.2 6.4A2 2 0 0 1 8.1 5h7.8a2 2 0 0 1 1.9 1.4L20 13.5V17a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" /><path d="M4 13.5h4.5a3.5 3.5 0 0 0 7 0H20" /> }
        <!-- Go to (a page): a diagonal arrow -->
        @case ('arrow-up-right') { <path d="M7.5 16.5 16.5 7.5M9 7.5h7.5V15" /> }
        <!-- Send: an arrow up -->
        @case ('arrow-up') { <path d="M12 19V5M5.5 11.5 12 5l6.5 6.5" /> }
        <!-- Copy contents: a clipboard with lines -->
        @case ('clipboard') { <rect x="8" y="3" width="8" height="4" rx="1" /><path d="M16 5h1.5A1.5 1.5 0 0 1 19 6.5v12a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 18.5v-12A1.5 1.5 0 0 1 6.5 5H8" /><path d="M9 12h6M9 15.5h4" /> }
        <!-- Unlocked: an open padlock -->
        @case ('unlock') { <rect x="5" y="11" width="14" height="9.5" rx="2" /><path d="M8 11V7.5a4 4 0 0 1 7.75-1.4" /> }
        <!-- Saved: a cloud with a check -->
        @case ('cloud-check') { <path d="M7 18.5h10.5a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.3 9.6 4.5 4.5 0 0 0 7 18.5z" /><path d="m9.5 13.75 1.75 1.75 3.5-3.5" /> }
        @case ('menu') { <path d="M4 7h16M4 12h16M4 17h16" /> }
        <!-- The Enter key: down, then left -->
        @case ('enter') { <path d="M19 5v6.5a3.5 3.5 0 0 1-3.5 3.5H5.5" /><path d="m9.5 10.5-4.5 4.5 4.5 4.5" /> }
        @case ('chevron-down') { <path d="m6 9 6 6 6-6" /> }
        @case ('chevrons-up-down') { <path d="M8.5 10 12 7.25l3.5 2.75M8.5 14 12 16.75l3.5-2.75" /> }
        <!-- Installing: Safari's Share and "Add to Home Screen", Chrome's ⋮ and install marks, devices -->
        @case ('share') { <path d="M12 3v12M8 6.5 12 2.5l4 4" /><path d="M8.5 10H7a2.5 2.5 0 0 0-2.5 2.5v6A2.5 2.5 0 0 0 7 21h10a2.5 2.5 0 0 0 2.5-2.5v-6A2.5 2.5 0 0 0 17 10h-1.5" /> }
        @case ('plus-square') { <rect x="3.5" y="3.5" width="17" height="17" rx="4" /><path d="M12 8v8M8 12h8" /> }
        @case ('dots-vertical') { <circle cx="12" cy="5" r="1.6" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" /><circle cx="12" cy="19" r="1.6" fill="currentColor" stroke="none" /> }
        @case ('install') { <rect x="2.5" y="4" width="19" height="13" rx="2.5" /><path d="M8 21h8M12 7.5v6M9.5 11 12 13.5 14.5 11" /> }
        @case ('phone') { <rect x="6" y="2.5" width="12" height="19" rx="3" /><path d="M10.5 18.5h3" /> }
        <!-- Contact actions: an envelope, a handset -->
        @case ('mail') { <rect x="3" y="5" width="18" height="14" rx="3" /><path d="m3.5 7 8.5 6 8.5-6" /> }
        @case ('call') { <path d="M6.6 3.5h2.6l1.6 4.2-2 1.4a11 11 0 0 0 6.1 6.1l1.4-2 4.2 1.6v2.6a2.1 2.1 0 0 1-2.3 2.1C10.3 18.9 5.1 13.7 4.5 5.8a2.1 2.1 0 0 1 2.1-2.3z" /> }
        @case ('monitor') { <rect x="2.5" y="4" width="19" height="13" rx="2.5" /><path d="M8 21h8M12 17v4" /> }
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
  readonly strokeWidth = input(2);
  protected readonly day = new Date().getDate();
}
