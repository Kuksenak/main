# Phones: Apple's Human Interface Guidelines, as this app follows them

The phone UI follows iOS (26/27, Liquid Glass) — Apple's HIG
(developer.apple.com/design/human-interface-guidelines; its pages also as JSON:
`developer.apple.com/tutorials/data/design/human-interface-guidelines/<page>.json`). These are its rules
that apply here, with the app's own tokens and pieces. Desktops follow Notion / Claude (CLAUDE.md), not this.
A rule here broken on purpose says so in the code, with the why.

## Liquid Glass (materials)
- Glass is for what floats over the content — the top bar's buttons, floating buttons, the search
  field, the bar over the keyboard, a question's panel, sheets. Never for content: cards, rows,
  the page's background (`glass` utility only on the former).
- Sparingly: only the most important controls get it.
- Regular glass (blurred, legible) everywhere; clear glass (nearly see-through) only over photos /
  video — the app has none, so: regular only.
- Glass has no color of its own: it takes it from what's under it. A tinted one (`accent`) only for
  the one primary action of a view.
- Its look (light): white at 70%, a half-pixel light-gray rim (a little more at the sides), a light
  blur, the shadow barely there — `--glass`, `--glass-shadow` (styles/base.css), measured values from
  github.com/seunghan91/ios27-design-system (MIT; Apple publishes none).
- Text and symbols on glass: the label colors (`text-fg`, `text-fg-secondary`), never pale fixed grays.

## Buttons
- Hit area at least 44×44 pt (`h-round` / `w-round`, `h-row`); room around a button so it's told
  apart from its neighbours.
- One — at most two — prominent buttons (accent-filled) per view, for the most likely action.
  Never a destructive one as the prominent / default.
- Several options, one preferred: the same size, the preferred one by style (not bigger).
- Every custom button has a pressed state (`uiFloatingButton` grows; list rows gray).
- Icon-only only for well-known actions (close, add, share, search, back); else a short label,
  starting with a verb, Title Case in English ("Add to Shortcuts").
- Destructive: the red (`text-danger` / `bg-danger`, the system red), and a way out (Cancel / a tap
  outside).
- An action that takes a while: show it working (a spinner / "Saving…"), not a dead button.

## Bars (the top bar, the floating buttons)
- Only the most important actions in the bar; the rest in a menu (⋯).
- At most three groups. Navigation (‹ back, ✕ close) in a group of its own; the primary action
  (Done ✓, Save) at the trailing edge, alone, tinted.
- Related buttons on one capsule: `uiFloatingGroup` with `uiFloatingButton round bare`.
- Symbols over text; text only for what a symbol can't say ("Edit", "Today"). Back is ‹, close is ✕ —
  never the words "Back" / "Close" in a bar. Symbol and text buttons not mixed on one capsule.
- Symbols in a bar plain — no circles or outlines of their own (the capsule is their shape).
- No custom backgrounds behind bars: the content scrolls under them (the top bar's fade, not a band).
- Titles short (≈15 characters at most), never the app's name; the root screen's title may be large.

## Lists
- Grouped (cards: `ui-list`, `rounded-card`), a title over a card (`ui-list-title`), a note under it
  (`text-footnote text-fg-secondary`).
- Short row text; long content: the title in the list, the rest on its own page.
- › (`chevron`) only when the row opens a deeper level; ✓ (`checked`) for the chosen option.
- A value at the row's right in gray (`itemValue`); a choice of a few: the gray value with ⌃⌄
  (`ui-select plain`) — the system's own menu.
- Hairlines between rows from the text on, none under the last.
- Swipe actions (`ui-swipe`): to the left, round buttons with a symbol and a word under it; also on
  a tap of the row; shown once (what's to swipe).

## Sheets and full-screen pages
- A sheet (`ui-sheet`) for a short task done before going back (pick a tag, a language page); a
  full-screen page for a longer one (an event: create / edit).
- One sheet at a time.
- Resizable: a grabber; swipe down dismisses.
- Cancel / ✕ at the leading edge, Done / ✓ at the trailing — ✓ inactive (gray) until there's
  something to save. Never Done alone. Never Cancel, Done and Back together; a step back is ‹.
- Dismissed with unsaved changes: asked first ("Discard Changes").

## Questions (alerts, confirmations)
- An alert only for what's rare and can't be undone (Delete forever, Empty trash, Discard Changes).
  No alert for common undoable actions (to the trash: a toast with Undo instead), none just to
  inform, none at launch.
- Several choices for something chosen on purpose (this event / the future ones): an action sheet —
  `Confirm.choose` (by the button, the answers one under another).
- At most three answers. The likeliest on top of a stack; Cancel last (or a tap outside).
- Titles of answers: one or two words, a verb — "Delete", "Discard Changes", never "OK" / "Yes" /
  "No"; Title Case, no full stop.
- The question: specific, what and why, two lines at most; a full sentence ends with "?" / ".".

## Text
- Body 17 pt (`text-body`), never under 11 pt (`text-caption`); the sizes: Large Title 34, Title 1
  28, Title 2 22, Title 3 20, Headline 17 semibold, Body 17, Callout 16, Subhead 15, Footnote 13
  (`text-footnote`), Caption 12 / 11.
- Weights: Regular, Medium, Semibold, Bold — never Thin / Light. Emphasis by the style's own
  emphasized weight, not a random one.

## Color
- System colors (light / dark): red 255,56,60 / 255,66,69 (`--danger`); blue 0,136,255 / 0,145,255;
  green 52,199,89 / 48,209,88. Labels: primary, secondary (`text-fg-secondary`), placeholder;
  separators (`bg-separator`).
- Backgrounds: the page white (light) / black (dark) on phones; grouped cards a step off it.
- Color never alone to tell a state: with a word or a symbol.
- Don't give a color another meaning (a separator's color as text, a label's as a background).

## Layout
- The most important at the top and the leading side; aligned things read as related, indented as
  under the one above.
- Group with space, a card or a hairline.
- Safe areas: nothing under the status bar / the home indicator (`env(safe-area-inset-*)`).
- Full-screen backgrounds go on under the bars.
