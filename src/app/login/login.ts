import { Component, inject } from '@angular/core';
import { AuthStore } from '../auth/auth.store';

@Component({
  selector: 'app-login',
  templateUrl: './login.html',
})
export class Login {
  protected readonly auth = inject(AuthStore);
}
