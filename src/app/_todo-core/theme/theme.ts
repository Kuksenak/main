import { inject, Injectable, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class Theme {
  private document = inject(DOCUMENT);

  readonly isDark = signal<boolean>(false);

  constructor() {
    this.applyTheme();
    window.matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', () => this.applyTheme());
  }

  private applyTheme() {
    const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    this.isDark.set(dark);
    this.document.documentElement.classList.toggle('dark', dark);
    this.updateThemeColor(dark);
  }

  private updateThemeColor(dark: boolean) {
    const color = dark ? '#1c1917' : '#faf9f7';

    let themeMeta = this.document.querySelector('meta[name="theme-color"]');
    if (!themeMeta) {
      themeMeta = this.document.createElement('meta');
      themeMeta.setAttribute('name', 'theme-color');
      this.document.head.appendChild(themeMeta);
    }
    themeMeta.setAttribute('content', color);

    let schemeMeta = this.document.querySelector('meta[name="color-scheme"]');
    if (!schemeMeta) {
      schemeMeta = this.document.createElement('meta');
      schemeMeta.setAttribute('name', 'color-scheme');
      this.document.head.appendChild(schemeMeta);
    }
    schemeMeta.setAttribute('content', dark ? 'dark' : 'light');
  }
}
