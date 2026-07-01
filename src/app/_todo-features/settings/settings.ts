import { Component, inject } from '@angular/core';
import { environment } from '@environments/environment';
import { SignalRService } from 'app/_todo-core/realtime/signalr';

/** @deprecated Не отрефакторено (legacy). Мигрировать на Tailwind + signals. */
@Component({
  selector: 'app-settings',
  imports: [],
  templateUrl: './settings.html',
})
export class Settings {
  private signalR = inject(SignalRService);

  protected version = environment.version;
  messages: string[] = [];

  ngOnInit() {
    this.signalR.onNotification((msg) => {
      console.log('Notification:', msg);
    });
  }
}
