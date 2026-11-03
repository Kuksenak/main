import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { environment } from '@environments/environment';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { Confirm, Toasts, UiList, UiListItem, UiListTitle } from '../core/ui';

interface Shortcut {
  createdAt: string;
  lastUsedAt: string | null;
}

/**
 * Phones (the account's Shortcut): the key for an iPhone shortcut (Apple's Shortcuts app) to add
 * pages to the library — its text sent to the API with it, no sign-in. The key: none yet / made on
 * (when, last used); New key (the old one stops) — shown this once, Copy; Turn off. Under it what
 * the shortcut sends (its address, Copy) — a page from its text (the first line its title); Add to
 * Shortcuts: the ready one (an iCloud link — it asks for the key as it's added).
 */
@Component({
  selector: 'app-shortcut-key',
  imports: [TranslatePipe, UiList, UiListItem, UiListTitle],
  templateUrl: './shortcut-key.html',
})
export class ShortcutKey {
  private readonly http = inject(HttpClient);
  private readonly toasts = inject(Toasts);
  private readonly confirm = inject(Confirm);
  protected readonly i18n = inject(I18nService);
  private readonly url = `${environment.apiUrl}/shortcut`;

  // (undefined: not read yet; null: no key)
  protected readonly shortcut = signal<Shortcut | null | undefined>(undefined);
  // The key just made (shown this once)
  protected readonly key = signal<string | null>(null);
  // The ready shortcut (iCloud): added in Apple's Shortcuts, it asks for the key
  protected readonly shortcutLink = 'https://www.icloud.com/shortcuts/32f17a08b13c45509b8ec9f5bbffee20';
  // (whole — the dev server's API is a path on this site)
  protected readonly address = new URL(`${environment.apiUrl}/shortcut/pages`, location.origin).href;

  constructor() {
    this.http.get<Shortcut & { on: boolean }>(this.url).subscribe({
      next: (s) => this.shortcut.set(s.on ? s : null),
      error: () => this.toasts.fail('shortcut.loadError'),
    });
  }

  // A new key: the old one (if any) asked about first — the shortcut with it stops
  protected async create(e: Event): Promise<void> {
    if (this.shortcut()) {
      const yes = await this.confirm.ask(e.currentTarget as HTMLElement, { text: this.i18n.t('shortcut.replaceAsk'), yes: this.i18n.t('shortcut.newKey') });
      if (!yes) return;
    }
    this.http.post<{ key: string }>(`${this.url}/key`, {}).subscribe({
      next: ({ key }) => {
        this.key.set(key);
        this.shortcut.set({ createdAt: new Date().toISOString(), lastUsedAt: null });
      },
      error: () => this.toasts.fail('shortcut.saveError'),
    });
  }

  protected async turnOff(e: Event): Promise<void> {
    const yes = await this.confirm.ask(e.currentTarget as HTMLElement, { text: this.i18n.t('shortcut.offAsk'), yes: this.i18n.t('shortcut.off'), danger: true });
    if (!yes) return;
    this.http.delete(`${this.url}/key`).subscribe({
      next: () => {
        this.key.set(null);
        this.shortcut.set(null);
      },
      error: () => this.toasts.fail('shortcut.saveError'),
    });
  }

  protected copy(text: string): void {
    navigator.clipboard.writeText(text).then(
      () => this.toasts.show(this.i18n.t('shortcut.copied')),
      () => this.toasts.fail('shortcut.copyError'),
    );
  }

  // "3 Nov, 14:05"
  protected when(at: string): string {
    return `${this.i18n.day(at)}, ${this.i18n.time(at)}`;
  }
}
