# Аудит фронтенда (main/) — 2026-11-13

Сборка: `ng build --stats-json` — initial 424 kB raw / 110 kB gz (бюджет 500 kB), всего JS+CSS 845 kB в 59 файлах.
Initial: @angular/core 130 kB, router 72 kB, common 24 kB, rxjs 19 kB, platform-browser 11 kB, i18n (en) 11 kB, тосты 3 kB; zone.js 34 kB отдельно (polyfills).
Свои чанки: page 47 kB, desktop-layout 39 kB, schedule 35 kB, CDK overlay + меню 59 kB (только desktop), mobile-layout 16 kB.

## Лишнее / можно убрать

1. `src/app/core/services/theme-color.ts:5` — `refreshThemeColor()` пустая функция; вызывается в `core/ui/sheet/sheet.ts:90` и `layout/search-bar.ts:84`. Удалить файл и оба вызова (и комментарий в sheet.ts:87).
2. Barrel-файлы, хотя CLAUDE.md говорит «there's no index»: `core/ui/menu/index.ts`, `core/ui/window/index.ts`, `core/ui/sidebar/index.ts`, `core/ui/search/index.ts`. Комментарии в них ссылаются на удалённый `core/ui` index. Импортируют их `layout/desktop-layout.ts:14,16,23`, `layout/search.ts:3`, `library/page-editor.ts:6`, `page-menu.ts:4`, `page.ts:14,16`, `sidebar-tags.ts:10,11`, `tag-picker.ts:6`, `schedule/event-editor.ts:8`. На бандл не влияют (только desktop), но правило нарушают — перевести импорты на файлы.
3. Неиспользуемые ключи переводов (по 3 языка): `nav.menu`, `action.cancel`, `library.shared`, `library.shareNote`, `library.edited`, `library.created` — `core/i18n/translations.ts:24,26,53,56,133,134` (+ pl/fr).
4. Иконки, которые нигде в UI не используются (только витрина Home): `arrow-up`, `arrow-down`, `eye`, `filter`, `grid` — `core/ui/icon/icon.ts` (ICONS) и `icon-lines.ts`. Убрать, если витрина их не требует.
5. `layout/desktop-layout.ts:87,106-107` — закомментированные Favorites в сайдбаре и мёртвый `favorites` computed; в `type List` (:214) `'favorites'` больше не нужен. Там же висят оборванные комментарии :116-118.
6. `library/ai-chat.store.ts:98` — метод `clear(pageId)` нигде не вызывается.
7. Поиск на телефоне: вкладка Events (`layout/search-bar.ts:41`, `app-search.ts:47` — `scope === 'events'` всегда `[]`) — пустая вкладка-заглушка; ключ `search.noEvents`. Либо реализовать, либо убрать вкладку.
8. `public/logo.png` (20 kB), `public/logo.svg`, `public/mark.svg` — нигде не используются (ни в src, ни в манифесте, ни в бэке); при этом SW кэширует все `*.svg|png` (`ngsw-config.json`, группа assets).
9. Пустые папки `main/_backup/core/ui/icon` и `main/tools/`. `styles/base.css:51` ссылается на `tools/icons.py` и «пастели иконок» — файла нет, это остаток старого набора.
10. Остатки старых маркер-иконок: `app.html:11-20` — комментарий «a marker outline, its screen a pastel», рисунок телефона со stroke 2.6 и пастельной заливкой `fill-loading`. По CLAUDE.md иконки — линии 1.5, без пастели; перерисовать в стиле `icon-lines.ts`.
11. Лишние `export` у типов/констант, которые используются только внутри файла: `UserProfile` (auth.store.ts), `SlideWay`/`SlideScope` (slide.ts), `ConfirmAsk`/`ConfirmChoice` (confirm.ts), `SwipeAction`, `TAG_COLORS`, `Toast`, `KeptFolds`, `Place`/`PLACES`, `TrashItem`, `Piece` (marks.ts). Мелочь, но шум.
12. `src/environments/*.ts:1` — `import packageJson from '../../package.json'` кладёт весь package.json в initial (1 kB, со списком scripts и зависимостей — видно в бандле). Нужна только версия: подставлять через `define` в angular.json или генерировать константу.
13. npm: `@microsoft/signalr` (`package.json`) в `src/` не импортируется нигде — удалить зависимость. `@angular/cdk` нужен (overlay в меню). Неиспользуемых CSS-токенов/утилит не нашёл: все `@theme`-токены и `@utility` используются.

## Улучшить

1. **SW качает код обоих устройств.** `ngsw-config.json`: группа `app` с `installMode: prefetch` и `/*.js`, `/*.css` — при установке телефон скачивает desktop-чанки (CDK overlay, сайдбар, page-editor…) и `styles-desktop.css`, desktop — мобильные. Lazy-чанков всего ~420 kB, заметная часть из них — чужого устройства (на desktop одни CDK + меню 59 kB); это скачивается при установке и при каждом обновлении, разделение по устройствам теряет смысл. Решение: в prefetch оставить `index.html`, `main-*.js`, `polyfills`, `styles-*.css` initial; остальные `*.js` — отдельная группа `installMode: lazy, updateMode: lazy`.
2. **Zoneless.** `app.config.ts:22` `provideZoneChangeDetection` + `angular.json:21` polyfill `zone.js`. NgZone в коде не используется, всё на сигналах → `provideZonelessChangeDetection()` и убрать zone.js: −34 kB raw / −11 kB gz на каждом устройстве и меньше лишних проверок. Проверить места с не-сигнальным состоянием после `setTimeout`/listener (sheet, swipe, wheel, page-editor).
3. `core/services/update.service.ts:21` — TODO: `checkForUpdate` каждые 10 с у всех клиентов (запрос ngsw.json). Вернуть на ~60 с или проверять на `visibilitychange`.
4. `schedule/event-editor.ts:78` — `effect(() => this.sub() === 'add' && this.find.set(''))`: запись сигнала в effect; заменить на `linkedSignal` или сброс в обработчике.
5. `library/library.ts:57` — подписка на `queryParamMap` полем-побочкой; при `withComponentInputBinding()` проще `tag = input<string | null>()` (query param) или `toSignal`. Аналогично поля-побочки `page.ts:69 tagsLoaded`, `mobile-layout.ts:44 measured` — вынести в конструктор.
6. Доступность:
   - `library/sidebar-tags.html:86` — кнопка-точка цвета с `outline-none` без `focus-visible:` — фокус клавиатуры не виден.
   - `layout/account-sheet.html:46`, `library/trash-list.html:31` — `div` с `(click)` (нет роли/клавиатуры). На телефоне терпимо, но лучше `button`.
   - `src/index.html:9` — `user-scalable=no, maximum-scale=1` запрещает зум (WCAG 1.4.4). Если это сознательно (iOS), пометить в коде.
7. Сырые цвета (CLAUDE.md: never raw colors): `core/ui/toggle/toggle.ts:42` `bg-white` и `shadow-[0_1px_3px_rgb(0_0_0/0.25)]` — завести токены `--toggle-knob`/`shadow-knob`. `rgb(0 0 0 / …)` в масках `sheet.ts:55` и `mobile-layout.html:85` — это маски (альфа), допустимо, но маска продублирована: вынести в одну утилиту `fade-top`.
8. `layout/desktop-layout.ts` (220 строк, 41 строка комментариев) и `desktop-layout.html` (305) — самый тяжёлый свой чанк desktop. Окно корзины (trashOpen/trashQuery/trashIndex) и меню приложения (appMenuAt/sub/subAt) можно вынести в свои компоненты (как `Search`), они грузятся только при открытии.
9. Комментарии: ~260 строк вида `// (…)` в скобках; самые плотные — `page-editor.ts` (60), `event-editor.ts` (44), `desktop-layout.ts` (41), `library.store.ts`, `page.ts`. Многие пересказывают код или историю («tried, reverted») — сократить до «почему».
10. `core/ui/picker/wheel.ts:62` — `setTimeout` без `clearTimeout` при уничтожении (мелочь).

## Риски

1. **Расписание грузится без права на него.** `layout/hub.ts:71` и `layout/desktop-layout.ts:206` вызывают `events.show(new Date())` без `auth.can('schedule')` (библиотека рядом проверяется). У пользователя без schedule — запрос `/events` и, при 403, тост `schedule.loadError` на каждом старте.
2. `schedule/events.store.ts:78-85` — `from/to` записываются до ответа; при ошибке окно считается загруженным и `show()` для тех же месяцев больше не перезапрашивает (до смены месяца или `save`).
3. Бюджет: initial 424 из 500 kB warning; en-словарь (10 kB) растёт с каждым ключом — zoneless (п.2) и чистка ключей дают запас.
4. CLAUDE.md расходится с кодом: «there's no index» (а их 4), «Toasts (`core/ui`)» — теперь `core/ui/toast/toast`. Обновить, чтобы правила не врали.
5. `index.html` и правила status bar (reload при смене темы) — хрупкое место; `refreshThemeColor` (п.1 «Лишнее») — последний след прошлых попыток, удалять вместе с комментариями, не трогая логику reload.
