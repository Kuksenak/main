import { inject, Injectable, signal, effect } from '@angular/core';
import { DOCUMENT } from '@angular/common';

export type ThemeMode = 'system' | 'light' | 'dark';

/** @deprecated Не отрефакторено (legacy). Почистить и переписать. */
@Injectable({ providedIn: 'root' })
export class Theme {
  private document = inject(DOCUMENT);

  isDark = signal<boolean>(false);
  accentColor = signal<string>(localStorage.getItem('app-accent') || '#3b82f6');
  themeMode = signal<ThemeMode>((localStorage.getItem('app-theme') as ThemeMode) || 'system');

  constructor() {
    // Применяем тему при старте
    this.applyTheme();

    // Следим за изменением акцента
    effect(() => {
      const currentAccent = this.accentColor();
      this.document.documentElement.style.setProperty('--app-accent', currentAccent);
      localStorage.setItem('app-accent', currentAccent);
    });

    // Слушаем системные изменения темы
    window.matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', () => {
        if (this.themeMode() === 'system') {
          this.applyTheme();
        }
      });
  }

  setAccentColor(color: string) {
    this.accentColor.set(color);
  }

  setThemeMode(mode: ThemeMode) {
    this.themeMode.set(mode);
    localStorage.setItem('app-theme', mode);
    this.applyTheme();
  }

  private applyTheme() {
    const mode = this.themeMode();
    let dark: boolean;

    if (mode === 'system') {
      dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    } else {
      dark = mode === 'dark';
    }

    this.isDark.set(dark);
    this.document.documentElement.classList.toggle('dark', dark);
    this.updateEnvironmentStyles(dark);
  }

  private updateEnvironmentStyles(dark: boolean) {
    const bgColor = dark ? '#33373a' : '#f3f3f3';
    this.document.body.style.backgroundColor = bgColor;

    let themeMeta = this.document.querySelector('meta[name="theme-color"]');
    if (!themeMeta) {
      themeMeta = this.document.createElement('meta');
      themeMeta.setAttribute('name', 'theme-color');
      this.document.head.appendChild(themeMeta);
    }
    themeMeta.setAttribute('content', bgColor);

    let colorSchemeMeta = this.document.querySelector('meta[name="color-scheme"]');
    if (!colorSchemeMeta) {
      colorSchemeMeta = this.document.createElement('meta');
      colorSchemeMeta.setAttribute('name', 'color-scheme');
      this.document.head.appendChild(colorSchemeMeta);
    }
    colorSchemeMeta.setAttribute('content', dark ? 'dark' : 'light');
  }
}
