import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthStore } from './auth/auth.store';
import { TranslatePipe } from './core/i18n/t.pipe';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, TranslatePipe],
  templateUrl: './app.html',
})
export class App {
  protected readonly auth = inject(AuthStore);
}
