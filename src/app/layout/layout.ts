import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthStore } from '../auth/auth.store';
import { LoadingService } from '../core/services/loading.service';
import { UpdateService } from '../core/services/update.service';
import { Sheet } from '../core/ui/sheet/sheet';

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Sheet],
  templateUrl: './layout.html',
})
export class Layout {
  protected readonly auth = inject(AuthStore);
  protected readonly loading = inject(LoadingService);
  protected readonly updates = inject(UpdateService);

  protected readonly accountOpen = signal(false);
  protected readonly initial = computed(() => (this.auth.email() ?? '?').charAt(0));

  protected logout(sheet: Sheet): void {
    sheet.close();
    this.auth.logout();
  }
}
