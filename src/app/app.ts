import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs';
import { AuthStore } from './auth/auth.store';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
})
export class App {
  protected readonly auth = inject(AuthStore);
  private swUpdate = inject(SwUpdate);
  protected readonly updateReady = signal(false);

  constructor() {
    if (this.swUpdate.isEnabled) {
      this.swUpdate.versionUpdates
        .pipe(filter((e): e is VersionReadyEvent => e.type === 'VERSION_READY'))
        .subscribe(() => this.updateReady.set(true));

      setInterval(() => this.swUpdate.checkForUpdate().catch(() => {}), 60_000);
    }
  }

  reload(): void {
    this.swUpdate.activateUpdate().then(() => document.location.reload());
  }
}
