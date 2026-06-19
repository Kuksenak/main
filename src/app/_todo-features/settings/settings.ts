import { Component, inject } from '@angular/core';
import { environment } from '@environments/environment';
import { AuthStore } from 'app/_todo-core/auth/auth-store';
import { Theme } from 'app/_todo-core/theme/theme';
import { SignalRService } from 'app/_todo-core/realtime/signalr';

/** @deprecated Не отрефакторено (legacy). Мигрировать на Tailwind + signals. */
@Component({
  selector: 'app-settings',
  imports: [],
  templateUrl: './settings.html',
})
export class Settings {
  private themeService = inject(Theme);
  private store = inject(AuthStore);
  private signalR = inject(SignalRService);

  protected version = environment.version;

  readonly accentColors = [
    '#3b82f6', // Blue
    '#a855f7', // Purple
    '#ec4899', // Pink
    '#ef4444', // Red
    '#f59e0b', // Orange
    '#10b981', // Green
    '#71717a'  // Graphite
  ];

  ngOnInit() {
    this.signalR.onNotification((msg) => {
      console.log('Notification:', msg);
    });
  }

  currentAccent = this.themeService.accentColor;
  messages: string[] = [];

  setAccent(value: string) {
    this.store.updateProfile({ accentColor: value });
    if ('vibrate' in navigator) navigator.vibrate(10);
  }
}
