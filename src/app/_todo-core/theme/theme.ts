import { inject, Injectable, signal, effect, untracked } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '@environments/environment';
import { catchError, of } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class Theme {
  private document = inject(DOCUMENT);
  private http = inject(HttpClient);

  // Сигналы состояния
  isDark = signal<boolean>(false);
  theme = signal<string>(localStorage.getItem('app-theme') || 'system');
  accentColor = signal<string>(localStorage.getItem('app-accent') || '#3b82f6');

  // Флаг для предотвращения лишних PATCH-запросов при загрузке профиля
  private skipSync = false;

  constructor() {
    // Единый эффект для синхронизации всего состояния темы
    effect(() => {
      const currentTheme = this.theme();
      const currentAccent = this.accentColor();

      // 1. Применяем визуально
      this.applyTheme(currentTheme);
      this.document.documentElement.style.setProperty('--app-accent', currentAccent);

      // 2. Сохраняем локально
      localStorage.setItem('app-theme', currentTheme);
      localStorage.setItem('app-accent', currentAccent);

      // 3. Синхронизируем с облаком (только если это не "тихое" обновление)
      // untracked(() => {
      //   if (!this.skipSync) {
      //     this.syncWithApi(currentTheme, currentAccent);
      //   }
      //   this.skipSync = false; // Сбрасываем флаг после любого изменения
      // });
    });

    // Слушаем системные изменения темы
    window.matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', () => {
        if (this.theme() === 'system') this.applyTheme('system');
      });
  }

  /**
   * Метод для AuthStore: обновляет тему без отправки PATCH запроса обратно
   */
  updateFromProfile(theme: string, accentColor: string) {
    this.skipSync = true;
    this.theme.set(theme);
    this.accentColor.set(accentColor);
  }

  setTheme(newTheme: string) {
    this.theme.set(newTheme);
  }

  setAccentColor(color: string) {
    this.accentColor.set(color);
  }

  private applyTheme(theme: string) {
    let dark = theme === 'dark';
    if (theme === 'system') {
      dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    this.isDark.set(dark);
    this.document.documentElement.classList.toggle('dark', dark);
    this.updateEnvironmentStyles(dark);
  }

  private updateEnvironmentStyles(dark: boolean) {
    const bgColor = dark ? '#33373a' : '#f3f3f3';
    this.document.body.style.backgroundColor = bgColor;

    let meta = this.document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = this.document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      this.document.head.appendChild(meta);
    }
    meta.setAttribute('content', bgColor);
  }

  // private syncWithApi(theme: string, accentColor: string) {
  //   console.log(1);
  //   // ВАЖНО: PATCH запрос на твой новый эндпоинт
  //   this.http.patch(`${environment.apiUrl}/auth/account`, { theme, accentColor })
  //     .pipe(catchError(() => of(null)))
  //     .subscribe();
  // }
}
