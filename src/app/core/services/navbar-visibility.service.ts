import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class NavbarVisibility {
  /** When true — navbar slides away when a sheet opens. Default: false (stays fixed). */
  readonly hideOnSheet = signal(localStorage.getItem('navbar-hides-on-sheet') === 'true');

  constructor() {
    document.documentElement.classList.toggle(
      'navbar-hides-on-sheet',
      this.hideOnSheet(),
    );
  }

  set(value: boolean) {
    this.hideOnSheet.set(value);
    document.documentElement.classList.toggle('navbar-hides-on-sheet', value);
    localStorage.setItem('navbar-hides-on-sheet', String(value));
  }
}
