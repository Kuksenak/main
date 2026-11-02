# Frontend: what's left to tidy (from the review, 2026-11-02)

Done already: the editor's dead phone code, unused translations, dead CSS, dates / storage helpers,
New page and Duplicate in the store, the shared page ⋯ menu and window frame.

## Shared pieces (the biggest win)
- The window's parts: its head (an icon, a field or a title), its foot (the keys' legend, a slot at
  the right) — `core/ui/window`. Now copied in the search window, the trash window, the assistant's
  and the tags' window.
- One list row (36px, gray under the pointer / picked) and a section's name over it — the search's,
  the trash's and the library's rows have drifted apart (corners, padding).
- A key's chip (`ui-kbd`): the sidebar's Ctrl+K, the title field's ↵, the windows' legends.
- A read-only block (the lock in its corner, the marks shown): the phones' page, the shared page, the
  assistant's answer.
- `@utility glass` for `bg-glass shadow-glass backdrop-blur-[20px] backdrop-saturate-[180%]` (5 places).
- A card's title (`px-row-x text-body font-semibold text-fg-secondary`, 6 places): `ui-list` with a title.

## Smaller
- Toasts: `toasts.error(i18n.t('…'))` ~15 times — a `Toasts.fail(key)` or an rxjs `toastOnError(key)`.
- The phones' Trash: `viewChild(TrashList)` in the account's sheet loads its code at once (the
  @defer doesn't split it any more) — Empty trash through the store instead.
- Users on phones: `users.html`'s phone branch copies `user-card.html`; `users.ts` binds six store
  methods — give the template the store.
- `booleanAttribute` on boolean inputs (`UiButton.outline / caret`, `UiSheet.tall`, `UiSelect.wide /
  glass`); then `[tall]="true"` → `tall`.
- `active:transform-none` on desktop-only buttons does nothing (base.css: no press shrink there).
- Raw sizes where tokens exist: `text-[0.9375rem]`, `text-[1.25rem]` (mobile layout, wheel),
  `text-[1.75rem]` / `text-[2rem]` (shared page); `[var(--icon-ui)]` in avatar.
- `search-window.ts`: the effect resetting the index → `linkedSignal`.
- `page.ts` favorite(): its own optimistic flip on top of the store's — read it from the store.
- Lower-casing without the locale (trash list, app search's rank).
- The phones' avatar built by hand in `mobile-layout.html` (the email's letter) — `UiAvatar` (the name's).
- `AiChatStore.clear()` never called — photos' object URLs are never freed (a New chat button?).
- Icons only Home shows: google-doodle, apple-doodle, grid, eye, filter, pencil — keep or drop.

## Features waiting
- Tags: several a page (the API takes a list already); a tag's filter on phones.
- Saving: a local outbox (IndexedDB) and fewer requests while typing.
- Toasts: swipe away, stay while held.
