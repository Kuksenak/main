import { Sky } from '../core/ui/sky';
import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthStore } from '../auth/auth.store';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { Icon } from '../core/ui/icon/icon';

@Component({
  selector: 'app-login',
  imports: [Sky, TranslatePipe, Icon],
  templateUrl: './login.html',
})
export class Login {
  protected readonly auth = inject(AuthStore);
  // Back from Google without a sign-in (e.g. Cancel on its screen): the API sends ?error=denied.
  protected readonly denied = inject(ActivatedRoute).snapshot.queryParamMap.get('error') === 'denied';
}
