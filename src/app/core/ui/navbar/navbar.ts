import { Component, computed, inject } from '@angular/core';
import { AuthStore } from 'app/_todo-core/auth/auth-store';
import { Sheet } from '../sheet/sheet';
import { Settings } from 'app/features/settings/settings';
import { Events } from 'app/features/events/events';
import { Elements } from 'app/features/elements/elements';
import { ButtonDirective } from '../button/button.directive';
import { IconButtonDirective } from '../../directives/icon-button.directive';
import { AppUpdateService } from '../../services/app-update.service';
import { ConfirmDirective } from '../confirm/confirm.directive';

/** @deprecated Не отрефакторено (legacy). Мигрировать на Tailwind + signals. */
@Component({
  selector: 'app-navbar',
  imports: [ButtonDirective, IconButtonDirective, ConfirmDirective],
  templateUrl: './navbar.html',
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
