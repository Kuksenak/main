import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthStore } from './_todo-core/auth/auth-store';
import { Navbar } from './core/ui/navbar/navbar';
import { environment } from '@environments/environment';
import { SignalRService } from './_todo-core/realtime/signalr';
import { NotificationService } from './_todo-core/notifications/notification-service';
import { AppUpdateService } from './core/services/app-update.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Navbar],
  templateUrl: './app.html',
})
export class App implements OnInit {
  protected version = environment.version;
  authStore = inject(AuthStore);
  signalR = inject(SignalRService);
  notificationService = inject(NotificationService);
  updateService = inject(AppUpdateService);

  ngOnInit() {
    this.signalR.startConnection();

    this.signalR.onNotification((msg) => {
      console.log('Notification:', msg);
      this.authStore.initAuth().subscribe();
      this.notificationService.show(msg);
    });

    // Инициализируем проверку обновлений
    this.updateService.init();
  }
}
