import { Component, computed, inject } from '@angular/core';
import { AuthStore } from 'app/_todo-core/auth/auth-store';
import { Sheet } from '../sheet/sheet';
import { Settings } from 'app/features/settings/settings';
import { Events } from 'app/features/events/events';
import { Elements } from 'app/features/elements/elements';
import { ButtonDirective } from '../button/button.directive';
import { AppUpdateService } from '../../services/app-update.service';

/** @deprecated Не отрефакторено (legacy). Мигрировать на Tailwind + signals. */
@Component({
  selector: 'app-navbar',
  imports: [ButtonDirective],
  templateUrl: './navbar.html',
  host: { class: 'block w-full' }
})
export class Navbar {
  protected readonly auth = inject(AuthStore);
  private readonly sheet = inject(Sheet);
  protected readonly appUpdate = inject(AppUpdateService);

  protected readonly userEmail = computed(() => this.auth.user()?.email ?? '');

  openSettings() { this.sheet.open(Settings); }
  openEvents()   { this.sheet.open(Events); }
  openElements() { this.sheet.open(Elements); }
}
