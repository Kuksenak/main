import { TitleCasePipe } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { environment } from '@environments/environment';
import { AuthStore } from 'app/_todo-core/auth/auth-store';
import { Theme } from 'app/_todo-core/theme/theme';
import { SignalRService } from 'app/_todo-core/realtime/signalr';

@Component({
  selector: 'app-settings',
  imports: [FormsModule, TitleCasePipe],
  templateUrl: './settings.html',
  // styleUrl: './settings.scss',
})
export class Settings implements OnInit {
  private themeService = inject(Theme);
  private store = inject(AuthStore);
  private signalR = inject(SignalRService);

  readonly themes: string[] = ['light', 'dark', 'system'];

  protected version = environment.version;
  protected currentTheme = this.themeService.theme;

  changeTheme(value: string) {
    // this.themeService.setTheme(val);
    this.store.updateProfile({ theme: value });
    if ('vibrate' in navigator) navigator.vibrate(10);
  }

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
    // console.log('Настройки загружены, устанавливаем соединение с SignalR...');
    // this.signalrService.startConnection();
    // this.signalrService.notification$.subscribe((msg) => {
    //   console.log('Сервер говорит:', msg);

    //   // Логика: если что-то изменилось — перекачиваем данные по HTTP
    //   this.messages.push(msg);
    //   console.log('Текущие сообщения:', this.messages);
    // });
  }

  currentAccent = this.themeService.accentColor;
  messages: string[] = [];
  setAccent(value: string) {
    this.store.updateProfile({ accentColor: value });
    if ('vibrate' in navigator) navigator.vibrate(10);

  }
}
