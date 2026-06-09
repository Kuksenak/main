import { Component, inject, OnInit } from '@angular/core';
import { environment } from '@environments/environment';
import { AuthStore } from 'app/_todo-core/auth/auth-store';
import { Theme, ThemeMode } from 'app/_todo-core/theme/theme';
import { SignalRService } from 'app/_todo-core/realtime/signalr';
import { createSheetTitleRegistrar } from 'app/core/ui/sheet/sheet-buttons.helper';
import { Button } from 'app/core/ui/button/button';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [Button],
  templateUrl: './settings.html',
})
export class Settings implements OnInit {
  protected themeService = inject(Theme);
  private store = inject(AuthStore);
  private signalR = inject(SignalRService);
  private title = createSheetTitleRegistrar();

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

  readonly themeOptions: { mode: ThemeMode; label: string; icon: string }[] = [
    { mode: 'system', label: 'Системная', icon: '⚙️' },
    { mode: 'light', label: 'Светлая', icon: '☀️' },
    { mode: 'dark', label: 'Темная', icon: '🌙' }
  ];

  ngOnInit() {
    this.title.set('Settings');

    this.signalR.onNotification((msg) => {
      console.log('Notification:', msg);
    });
  }

  currentAccent = this.themeService.accentColor;
  currentTheme = this.themeService.themeMode;
  messages: string[] = [];

  setAccent(value: string) {
    this.store.updateProfile({ accentColor: value });
    if ('vibrate' in navigator) navigator.vibrate(10);
  }

  toggleTheme() {
    const modes: ThemeMode[] = ['system', 'light', 'dark'];
    const current = this.currentTheme();
    const currentIndex = modes.indexOf(current);
    const nextIndex = (currentIndex + 1) % modes.length;
    this.themeService.setThemeMode(modes[nextIndex]);
  }

  get currentThemeLabel(): string {
    const option = this.themeOptions.find(o => o.mode === this.currentTheme());
    return option ? `${option.icon} ${option.label}` : '';
  }
}
