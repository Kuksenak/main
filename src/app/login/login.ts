import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthStore } from '../auth/auth.store';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { Icon } from '../core/ui/icon/icon';

@Component({
  selector: 'app-login',
  imports: [TranslatePipe, Icon],
  templateUrl: './login.html',
})
export class Login {
  protected readonly auth = inject(AuthStore);
  // Back without a sign-in, the API says why: ?error=denied — cancelled on the provider's screen;
  // ?error=unverified — an email the provider hasn't checked (not let in)
  private readonly error = inject(ActivatedRoute).snapshot.queryParamMap.get('error');
  protected readonly denied = this.error === 'denied' || this.error === 'unverified';
  protected readonly deniedKey = this.error === 'unverified' ? 'login.unverified' : 'login.denied';
}
