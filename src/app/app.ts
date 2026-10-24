import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthStore } from './auth/auth.store';
import { Loading } from './core/services/loading';
import { TranslatePipe } from './core/i18n/t.pipe';
import { UpdateService } from './core/services/update.service';
import { UiToasts } from './core/ui';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, TranslatePipe, UiToasts],
  templateUrl: './app.html',
})
export class App {
  protected readonly auth = inject(AuthStore);
  protected readonly loading = inject(Loading);

  constructor() {
    inject(UpdateService); // (checking for a new version from the start)
  }
}
