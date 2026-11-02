# Frontend: what's left to tidy (from the review, 2026-11-02)

Done already: the editor's dead phone code, unused translations, dead CSS, dates / storage helpers,
New page and Duplicate in the store, the shared page ⋯ menu and window frame; then the window's
parts (list, section, keys), the shared rows' pieces (fold name, tag swatch, sidebar row / field /
scroll), `glass`, `ui-list-title`, `uiKbd`, `app-read-block`, `Toasts.fail`, `keptFolds`, the
tags' rename / recolor in their store, trash in the store, `booleanAttribute`, `i18n.lower`.

## Left from the review
- Library rows (32 tall, `rounded-md`, a tint when picked) still differ from the windows' `uiRow` (36,
  `rounded-xl`): one row for both changes the library's look — decide first.
- Users on phones: `users.html`'s phone branch copies `user-card.html` (a card per user, a typed
  limit vs the card's wheel) — one of them, if the look may change.
- Raw sizes with no token to take: `text-[0.9375rem]` (phones' search tabs), `text-[1.25rem]`
  (phones' account letter, wheel), `text-[1.75rem]` / `text-[2rem]` (shared page),
  `text-[calc(var(--icon-ui)*0.6)]` (avatar) — tokens of their own, or keep.
- `page.ts` favorite(): its own optimistic flip on top of the store's — the store's list isn't
  loaded on a page opened by its link on phones, so it can't just read it from there yet.
- The phones' avatar built by hand in `mobile-layout.html` (the email's letter, on the accent
  button) — `UiAvatar` (the name's) looks otherwise.
- `AiChatStore.clear()` never called — photos' object URLs are never freed (a New chat button?).
- Icons only Home shows: google-doodle, apple-doodle, grid, eye, filter — keep or drop.

## Features waiting
- Tags: several a page (the API takes a list already); a tag's filter on phones.
- Saving: a local outbox (IndexedDB) and fewer requests while typing.
- Toasts: swipe away, stay while held.
