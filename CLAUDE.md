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
- round buttons 44px (`h-round`), as iOS's.

New phone screens use these tokens (`styles/mobile.css`), not sizes of their own.

## Icons
- The app's icons are drawn in one style, "marker doodle + pastel fill" (docs/icons.md): one SVG file
  each, in `public/icons/`, shown by `<app-icon name="…">`.
- A new icon: drawn in `tools/icons.py` (then `python tools/icons.py`) and added to `ICONS`
  (`core/ui/icon/icon.ts`). Home shows every icon in `ICONS` (outlined and coloured in), so each new
  one is there to judge.

## Status bar color (keeps breaking — read before touching overlays)
- The status bar's color is the `theme-color` tag, set only by the script in `src/index.html`
  (light `#fbfbf9`, dark `#000000`: the page's `--app-bg`). Nothing else edits it.
- iOS keeps the old color when the theme (light/dark) changed while something over the whole
  screen was open (the search, a sheet). So anything full-screen calls `refreshThemeColor()`
  (`core/services/theme-color.ts`) as it closes: the tag is put in anew. A new overlay does the
  same.
- No dimming under sheets: the status bar changed at once, the page after it (tried, reverted).

## Moving between views
- Phones slide as iOS does with View Transitions (`core/services/slide.ts`, CSS in
  `styles/base.css`): the router's moves and a sheet's panes (`Slide.run`). What moves is marked
  `data-vt="…"`; base.css names it only during its own scope's move. The old fades out first,
  then the new comes in — both at once, they ran over each other.

## i18n
- Every user-facing string goes in `core/i18n/translations.ts`, with each key in en, pl and fr
  (type-checked). In templates use `{{ 'key' | t }}`.
