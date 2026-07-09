import { Component, afterNextRender, inject, OnInit } from '@angular/core';
import { AuthStore } from './_todo-core/auth/auth-store';
import { Navbar } from './core/ui/navbar/navbar';
import { environment } from '@environments/environment';
import { SignalRService } from './_todo-core/realtime/signalr';
import { NotificationService } from './_todo-core/notifications/notification-service';
import { AppUpdateService } from './core/services/app-update.service';
import { Theme } from './_todo-core/theme/theme';
import { HealthService } from './core/services/health.service';
import { Sheet } from './core/ui/sheet/sheet';
import { Health } from './features/health/health';

@Component({
  selector: 'app-root',
  imports: [Navbar],
  templateUrl: './app.html',
})
export class App implements OnInit {
  protected version = environment.version;
  protected authStore = inject(AuthStore);
  private signalR = inject(SignalRService);
  private notificationService = inject(NotificationService);
  private updateService = inject(AppUpdateService);
  private theme = inject(Theme);
  private health = inject(HealthService); // ingests ?steps=/?days= from the Shortcut on boot
  private sheet = inject(Sheet);

  constructor() {
    afterNextRender(() => {
      // Fresh data arrived via the Shortcut redirect → jump straight to Health.
      if (this.health.ingested()) {
        setTimeout(() => this.sheet.open(Health), 50);
      }

      const splash = document.getElementById('app-splash');
      if (!splash) return;
      sessionStorage.setItem('app-loaded', '1');
      const elapsed = Date.now() - ((window as any).__splashAt ?? Date.now());
      const wait = Math.max(0, 1000 - elapsed);
      setTimeout(() => {
        splash.classList.add('out');
        setTimeout(() => splash.remove(), 300);
      }, wait);
    });
  }

  ngOnInit() {
    this.signalR.startConnection();

    this.signalR.onNotification((msg) => {
      console.log('Notification:', msg);
      this.authStore.initAuth().subscribe();
      this.notificationService.show(msg);
    });

    this.updateService.init();
  }
}
