import { inject, Injectable, signal } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs';

/**
 * A new version of the app: the service worker checks every 10 seconds (for now); once one is downloaded and
 * ready, `ready` — the account shows "Update available" (and a green dot on its button); `apply()`
 * switches to it (the page reloads).
 */
@Injectable({ providedIn: 'root' })
export class UpdateService {
  private readonly worker = inject(SwUpdate);

  readonly ready = signal(false);

  constructor() {
    if (!this.worker.isEnabled) return; // (development: no service worker)
    this.worker.versionUpdates
      .pipe(filter((e): e is VersionReadyEvent => e.type === 'VERSION_READY'))
      .subscribe(() => this.ready.set(true));
    // TODO: back to every minute or so once the app is settled — 10 s is for now, while it's
    // deployed often (each check asks the server for ngsw.json)
    setInterval(() => this.worker.checkForUpdate().catch(() => {}), 10_000);
  }

  apply(): void {
    this.worker.activateUpdate().then(() => document.location.reload());
  }
}
