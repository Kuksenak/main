import { Component, afterNextRender, inject, OnInit } from '@angular/core';
import { AuthStore } from './_todo-core/auth/auth-store';
import { Navbar } from './core/ui/navbar/navbar';
import { environment } from '@environments/environment';
import { SignalRService } from './_todo-core/realtime/signalr';
import { NotificationService } from './_todo-core/notifications/notification-service';
import { AppUpdateService } from './core/services/app-update.service';
import { Theme } from './_todo-core/theme/theme';

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

  constructor() {
    afterNextRender(() => {
      const splash = document.getElementById('app-splash');
      if (!splash) return;
      splash.classList.add('out');
      setTimeout(() => splash.remove(), 300);
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
