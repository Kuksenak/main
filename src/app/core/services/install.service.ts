import { Injectable, signal } from '@angular/core';

interface InstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * Installing the app (PWA) to the home screen / desktop. Opened as the installed app it's
 * `standalone` (nothing to offer then); Chrome / Edge / Android hand over a prompt we can show
 * from a button (`canPrompt`), Safari has only its own menus (see the Install page).
 */
@Injectable({ providedIn: 'root' })
export class InstallService {
  readonly standalone =
    matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;

  private deferred: InstallPrompt | null = null;
  readonly canPrompt = signal(false);

  constructor() {
    // Offered before the app started (see main.ts)
    const early = (window as Window & { installPrompt?: Event }).installPrompt;
    if (early && !this.standalone) {
      this.deferred = early as InstallPrompt;
      this.canPrompt.set(true);
    }
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault(); // no mini-infobar: our Install button shows it
      this.deferred = e as InstallPrompt;
      this.canPrompt.set(true);
    });
    window.addEventListener('appinstalled', () => {
      this.deferred = null;
      this.canPrompt.set(false);
    });
  }

  async prompt(): Promise<void> {
    const p = this.deferred;
    if (!p) return;
    await p.prompt();
    await p.userChoice;
    this.deferred = null;
    this.canPrompt.set(false);
  }
}
