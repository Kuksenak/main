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
  too): the desktop's menus (`core/ui/menu`, CDK overlay), sidebar (`core/ui/sidebar`), window
  (`core/ui/window`: the search's and the assistant's frame) and search window (`core/ui/search`) are
  imported from their own folders.

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
- Phones' glass (floating buttons, the top bar's choice, …) is the `glass` utility (styles.css).
- Plain CSS only where Tailwind can't: `src/styles/base.css` (page defaults) and
  `src/styles/components.css` (`btn-strong`, the rotate hint).
- No SCSS: Tailwind v4 doesn't work with Sass.
- Device differences use the `mobile:` / `desktop:` variants (from `<html data-device>`, set in
  `index.html`) or the per-device size tokens, never width breakpoints.

## Phones follow Apple's HIG
- The phone UI follows iOS's Human Interface Guidelines (Liquid Glass): docs/hig.md — glass, buttons,
  bars, lists, sheets, questions, text, color. Read it before changing a phone screen; a rule broken
  on purpose says so in the code. Desktops follow Notion / Claude instead.

## Sizes on phones
The account sheet's lists set the size for everything on phones:
- list rows 48px tall (`h-row`), in cards (`ui-list`, 24px corners: `rounded-card`);
- 17px text (`text-body`), 16px side padding (`px-row-x`);
- 28px icons (`size-icon-menu`), ✓ / › 20px;
- hairlines between rows from the text on;
- round buttons 44px (`h-round`), as iOS's;
- a card's title over it (as iOS 26's Settings): `<ui-list-title>` (`text-body font-semibold
  text-fg-secondary`, `px-row-x`, no icon); a note under one: `text-footnote text-fg-secondary`.

New phone screens use these tokens (`styles/mobile.css`), not sizes of their own.

## Icons
- The app's icons are our own, drawn as Notion's menus are: even lines of one weight (1.5 on a 24 grid),
  round ends, no solid shapes but dots (⋯, the drag handle) — on every device, in
  `core/ui/icon/icon-lines.ts` (as data: URLs — no request each), shown by `<app-icon name="…">` in the
  text's color. No pastel, no marker.
- A new icon: drawn in `icon-lines.ts` in the same style (same grid, same stroke), its name added to
  `ICONS` (`core/ui/icon/icon.ts`). Home shows every icon in `ICONS`.

## Toasts
- Errors (a call that failed) and short notices ("Deleted · Undo") are toasts: `inject(Toasts)`
  (`core/ui`) — `.error(text)` (a failed call: `.fail('its.key')`), `.show(text, { label, run })`. No red lines in the page for them.
  `<ui-toasts />` in app.html shows them (phones: a bar as wide as the screen at the bottom, over the floating buttons; desktops: the bottom right corner, as wide as the sidebar, scrolling past 80vh).

## Status bar color (keeps breaking — read before touching it)
- Now: the theme is read once as the app starts; a system theme switch reloads the app (at once,
  or as it comes back if it was away) — after a reload iOS always got the bar right. Before it,
  `app-reload` on window: a page saves what's typed. No `theme-color` tag on phones (nor in the
  manifest); desktops get one at load (index.html): an installed app's title bar in the page's color.
- Everything tried with a tag fell out of step somewhere: a new tag per switch (stuck after a
  switch made while away / while the bar was hidden sideways), two tags with `media` (black in
  light: iOS took the last), one-shade-off nudges (flickered), a gray cover (it can't cover the
  bar), waiting till the bar's in sight (gray / black the wrong way round).
- Without it the whole app bounced: the body stays `position: fixed` on phones.
- No dimming under sheets: the status bar changed at once, the page after it (tried, reverted).

## Moving between views
- Phones slide as iOS does (`core/services/slide.ts`): the new view slides in — forward from the
  right edge, back from a little to the left — clipped by the box it's in, the old one gone at
  once. What moves is marked `data-vt="page" | "page-title" | "page-back"` (the router's moves:
  MobileLayout) or `"sheet-pane" | "sheet-title" | "sheet-back"` (a sheet's: `Slide.run`).
- Plain animations only — no View Transitions: their pictures of the page lost iOS's blur under a
  sheet (the page showed through it) and laid one view over the other.

## i18n
- Every user-facing string goes in `core/i18n/`: `translations.ts` (English — the keys, the fallback,
  in the app from the start), `translations.pl.ts` and `translations.fr.ts` (each key there too,
  type-checked; downloaded only when that language is the one chosen). In templates use `{{ 'key' | t }}`.
