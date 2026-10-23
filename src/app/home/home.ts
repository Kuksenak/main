import { Component, inject } from '@angular/core';
import { AuthStore } from '../auth/auth.store';

/** The start page: who's signed in — a placeholder until the app's own pages (Log out: the shell's account menu). */
@Component({
  selector: 'app-home',
  template: `
    <div class="flex h-full flex-col items-center justify-center px-6 text-center">
      <p class="text-body text-[var(--text-secondary)]">{{ auth.name() ?? auth.email() }}</p>
    </div>
  `,
})
export class Home {
  protected readonly auth = inject(AuthStore);
}
