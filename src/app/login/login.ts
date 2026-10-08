import { Component, inject } from '@angular/core';
import { AuthStore } from '../auth/auth.store';
import { TranslatePipe } from '../core/i18n/t.pipe';

@Component({
  selector: 'app-login',
  imports: [TranslatePipe],
  templateUrl: './login.html',
})
export class Login {
  protected readonly auth = inject(AuthStore);
}
