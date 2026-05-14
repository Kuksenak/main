import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthStore } from './_todo-core/auth/auth-store';
import { Navbar } from './core/ui/navbar/navbar';
import { PlayerBar } from './core/ui/player-bar/player-bar';
import { environment } from '@environments/environment';
import { SignalRService } from './_todo-core/realtime/signalr';
import { NotificationService } from './_todo-core/notifications/notification-service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Navbar, PlayerBar],
  templateUrl: './app.html',
  // styleUrl: './app.scss'
})
export class App implements OnInit {
  protected version = environment.version;
  authStore = inject(AuthStore);
  signalR = inject(SignalRService);
  notificationService = inject(NotificationService);

  ngOnInit() {
    this.signalR.startConnection();

    this.signalR.onNotification((msg) => {
      console.log('Notification:', msg);
      this.authStore.initAuth().subscribe();
      this.notificationService.show(msg);

    });
  }
}


