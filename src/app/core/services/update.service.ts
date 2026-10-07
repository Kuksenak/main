import { Injectable, inject, signal } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs';
import { version } from '../../../../package.json';

@Injectable({ providedIn: 'root' })
export class UpdateService {
  private swUpdate = inject(SwUpdate);

  // App version from package.json (bumped on every commit by .githooks/pre-commit).
  readonly version = version;
  readonly updateReady = signal(false);

  constructor() {
    if (this.swUpdate.isEnabled) {
      this.swUpdate.versionUpdates
        .pipe(filter((e): e is VersionReadyEvent => e.type === 'VERSION_READY'))
        .subscribe(() => this.updateReady.set(true));

      setInterval(() => this.swUpdate.checkForUpdate().catch(() => {}), 60_000);
    }
  }

  apply(): void {
    this.swUpdate.activateUpdate().then(() => document.location.reload());
  }
}
