import { Injectable, inject, signal } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AppUpdateService {
  private swUpdate = inject(SwUpdate);

  // Публичный signal для состояния обновления
  readonly updateAvailable = signal(false);

  /**
   * Инициализирует проверку обновлений
   * Подписывается на события и запускает периодическую проверку
   */
  init() {
    if (!this.swUpdate.isEnabled) return;

    this.swUpdate.versionUpdates
      .pipe(filter((event): event is VersionReadyEvent => event.type === 'VERSION_READY'))
      .subscribe(() => {
        this.updateAvailable.set(true);
      });

    // Проверяем обновления каждые 10 секунд
    setInterval(() => this.swUpdate.checkForUpdate(), 10000);
  }

  /**
   * Перезагружает приложение для применения обновлений
   */
  reloadApp() {
    window.location.reload();
  }
}
