import { Component, inject } from '@angular/core';
import { AuthStore } from '../auth/auth.store';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { Icon } from '../core/ui/icon/icon';

/** After sign-in: who's signed in, and Log out — a placeholder until the app's own pages. */
@Component({
  selector: 'app-home',
  imports: [TranslatePipe, Icon],
  template: `
    <main class="flex h-full flex-col items-center justify-center gap-4 px-6 text-center text-[var(--text)]">
      <p class="text-body">{{ auth.name() ?? auth.email() }}</p>
      <button type="button" (click)="auth.logout()" class="btn-strong">
        <app-icon name="logout" class="size-5" />
        {{ 'account.logout' | t }}
      </button>
    </main>
  `,
})
export class Home {
  protected readonly auth = inject(AuthStore);
}
