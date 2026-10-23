# Ideas to think about

## Fonts (desktop)

For now the desktop uses the system font, as Notion does (Segoe UI on Windows, SF Pro on a Mac).

Another way, closer to Claude (claude.ai: Styrene B for the interface, a serif — Copernicus /
Tiempos — for its answers; both are paid, not ours to use):

- the interface in **Geist** (free, OFL; already bundled in `src/assets/fonts/geist` with its
  `@font-face` rules in `src/styles/desktop.css`);
- the tasks' text (editor, previews, the student's page) in an open serif — e.g. **Source Serif 4**
  or **Literata** — for a "book" look like Claude's answers.

Things to check before choosing: Cyrillic and Polish / French accents, how gaps and choices look in
a serif, sizes (a serif reads smaller at 14 px).

## To do later

- **Update checks less often.** `UpdateService` (`src/app/core/services/update.service.ts`) checks
  for a new version every 10 s while the app is deployed often. Set it back to about a minute once
  it's settled: each check asks the server for `ngsw.json`.
