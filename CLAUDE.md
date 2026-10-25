# Frontend (Angular 21, Tailwind v4)

## Components
- Pages are built from the shared UI kit in `src/app/core/ui/` (import from `core/ui`), a folder per
  piece: `menu/` holds the menu and its rows, `sidebar/` the sidebar and its items, and so on.
  A new shared piece goes there too, named `Ui*` with a `ui-*` (or attribute) selector, and is
  exported from `core/ui/index.ts`.
- A section of the app (a page and its own pieces) is one flat folder, e.g. `schedule/` holds
  `schedule.ts` (the page) and `calendar.ts`, with no subfolders.
- Markup longer than a few lines goes in its own `.html` (`templateUrl`); a one- or two-line template
  stays inline. No component stylesheets.

- Where phones and desktops differ a lot, each gets its own component, picked once by the device
  (`core/device.ts`; e.g. app.routes loads `DesktopLayout` or `MobileLayout`). Then neither device
  downloads the other's code.
- Pieces of one device only stay out of the kit's index (else the other device downloads them
  too): the desktop's menus (`core/ui/menu`, CDK overlay), sidebar (`core/ui/sidebar`) and search
  window (`core/ui/search`) are imported from their own folders.

## Styles
- Tailwind classes only, in the markup or in `host: { class: … }`. States are variants too:
  `hover:`, `focus-visible:`, `aria-expanded:`, `aria-[current=page]:`, `data-*:`, `not-disabled:`.
- A class switched on by a condition: plain names only in `[class.name]` (`[class.bg-tint]`).
  Anything with a variant or brackets (`hover:…`, `top-[…]`) Tailwind doesn't find there. Put
  those in the static `class` instead, keyed to an attribute the condition sets:
  `data-tall:top-[…]` plus `[attr.data-tall]="tall() ? '' : null"`.
- Colors and sizes are tokens, used by their Tailwind names (`bg-side`, `text-danger`, `h-button`,
  `rounded-menu`, `text-ui`, …). They are registered in `src/styles.css` (`@theme inline`), and
  their values are:
  - colors (light and dark) in `src/styles/base.css`;
  - sizes per device in `src/styles/mobile.css` / `desktop.css`.
- Never raw colors, and no `[var(--…)]` where a token name exists.
- Plain CSS only where Tailwind can't: `src/styles/base.css` (page defaults) and
  `src/styles/components.css` (`btn-strong`, the rotate hint).
- No SCSS: Tailwind v4 doesn't work with Sass.
- Device differences use the `mobile:` / `desktop:` variants (from `<html data-device>`, set in
  `index.html`) or the per-device size tokens, never width breakpoints.

## Sizes on phones
The account sheet's language list sets the size for everything on phones:
- list rows 48px tall (`h-row`), in cards (`ui-list`, 24px corners: `rounded-card`);
- 17px text (`text-body`), 16px side padding (`px-row-x`);
- 28px icons (`size-icon-menu`), ✓ / › 20px;
- hairlines between rows from the text on;
- round buttons 44px (`h-round`), as iOS's;
- a card's title over it (as iOS 26's Settings): `text-body font-semibold text-fg-secondary`,
  `px-row-x`, no icon; a note under one: `text-footnote text-fg-secondary`.

New phone screens use these tokens (`styles/mobile.css`), not sizes of their own.

## Icons
- The app's icons are drawn in one style, "marker doodle + pastel fill" (docs/icons.md): one SVG file
  each, in `public/icons/`, shown by `<app-icon name="…">`.
- `python tools/icons.py` also writes `core/ui/icon/icon-data.ts`: the icons as data: URLs, which
  `<app-icon>` uses — no request per icon (a file each showed late on phones). Never hand-edit it.
- A new icon: drawn in `tools/icons.py` (then `python tools/icons.py`) and added to `ICONS`
  (`core/ui/icon/icon.ts`). Home shows every icon in `ICONS` (outlined and coloured in), so each new
  one is there to judge.

## Toasts
- Errors (a call that failed) and short notices ("Deleted · Undo") are toasts: `inject(Toasts)`
  (`core/ui`) — `.error(text)`, `.show(text, { label, run })`. No red lines in the page for them.
  `<ui-toasts />` in app.html shows them (phones: under the top bar; desktops: the bottom right corner, as wide as the sidebar, scrolling past 80vh).

## Status bar color (keeps breaking — read before touching it)
- The status bar's color is ONE `theme-color` tag, set by the script in `src/index.html` (light
  `#fbfbf9`, dark `#000000`: the page's `--app-bg`); a new tag at each change, not an edited one.
- The "stuck bar" came from switching while the app was away: iOS doesn't redraw it then, and
  back, the tag already said the new color — nothing changed for it. So a switch made while away
  waits till the app is back (the tag then changes in sight, iOS redraws).
- A switch eases the page into its new colors (`.theme-easing`, 0.3s, base.css) as iOS eases the
  bar, so the two change together.
- Tried and taken out: two tags with `media` per scheme (black in light: iOS took the last tag),
  one-shade-off nudges (flickered), a gray cover over the app (out of step with the bar), the
  body `position: fixed`.
- Anything over the whole screen calls `refreshThemeColor()` (`core/services/theme-color.ts`) as it
  closes: the same color put in anew.
- No dimming under sheets: the status bar changed at once, the page after it (tried, reverted).

## Moving between views
- Phones slide as iOS does (`core/services/slide.ts`): the new view slides in — forward from the
  right edge, back from a little to the left — clipped by the box it's in, the old one gone at
  once. What moves is marked `data-vt="page" | "page-title" | "page-back"` (the router's moves:
  MobileLayout) or `"sheet-pane" | "sheet-title" | "sheet-back"` (a sheet's: `Slide.run`).
- Plain animations only — no View Transitions: their pictures of the page lost iOS's blur under a
  sheet (the page showed through it) and laid one view over the other.

## i18n
- Every user-facing string goes in `core/i18n/translations.ts`, with each key in en, pl and fr
  (type-checked). In templates use `{{ 'key' | t }}`.
