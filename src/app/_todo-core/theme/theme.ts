import { inject, Injectable, signal, effect } from '@angular/core';
import { DOCUMENT } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class Theme {
  private document = inject(DOCUMENT);

  isDark = signal<boolean>(false);
  accentColor = signal<string>(localStorage.getItem('app-accent') || '#3b82f6');

  constructor() {
    // Применяем тему при старте
    this.applySystemTheme();

    // Следим за изменением акцента
    effect(() => {
      const currentAccent = this.accentColor();
      this.document.documentElement.style.setProperty('--app-accent', currentAccent);
      localStorage.setItem('app-accent', currentAccent);
    });

    // Слушаем системные изменения темы
    window.matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', () => this.applySystemTheme());
  }

  setAccentColor(color: string) {
    this.accentColor.set(color);
  }

  private applySystemTheme() {
    const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
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
