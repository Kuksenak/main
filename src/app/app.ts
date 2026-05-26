import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs';
import { AuthStore } from './_todo-core/auth/auth-store';
import { Navbar } from './core/ui/navbar/navbar';
import { environment } from '@environments/environment';
import { SignalRService } from './_todo-core/realtime/signalr';
import { NotificationService } from './_todo-core/notifications/notification-service';

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
  private swUpdate = inject(SwUpdate);

  // Update state
  updateAvailable = signal(false);

  ngOnInit() {
    this.signalR.startConnection();

    this.signalR.onNotification((msg) => {
      console.log('Notification:', msg);
      this.authStore.initAuth().subscribe();
      this.notificationService.show(msg);
    });

    this.checkForUpdates();
  }

  private checkForUpdates() {
    if (!this.swUpdate.isEnabled) return;

    this.swUpdate.versionUpdates
      .pipe(filter((event): event is VersionReadyEvent => event.type === 'VERSION_READY'))
      .subscribe(() => {
        this.updateAvailable.set(true);
      });

    // Check every 30 seconds
    setInterval(() => this.swUpdate.checkForUpdate(), 10000);
  }

  reloadApp() {
    window.location.reload();
  }
}