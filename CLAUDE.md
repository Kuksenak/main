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

## Styles
- Tailwind classes only, in the markup or in `host: { class: … }`. States are variants too:
  `hover:`, `focus-visible:`, `aria-expanded:`, `aria-[current=page]:`, `data-*:`, `not-disabled:`.
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

## Icons
- The app's icons are drawn in one style, "marker doodle + pastel fill" (docs/icons.md): one SVG file
  each, in `public/icons/ui/`, shown by `<app-icon name="…">`.

## i18n
- Every user-facing string goes in `core/i18n/translations.ts`, with each key in en, pl and fr
  (type-checked). In templates use `{{ 'key' | t }}`.
