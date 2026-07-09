import { Component, OnInit, inject } from '@angular/core';
import { createSheetTitleRegistrar } from 'app/core/ui/sheet/sheet-buttons.helper';
import { HealthCard } from 'app/core/ui/health-card/health-card';
import { WorkoutsCard } from 'app/core/ui/health-card/workouts-card';
import { HealthService } from 'app/core/services/health.service';

@Component({
  selector: 'app-health-page',
  standalone: true,
  imports: [HealthCard, WorkoutsCard],
  templateUrl: './health.html',
})
export class Health implements OnInit {
  private title = createSheetTitleRegistrar();

  protected readonly health = inject(HealthService);

  // The Shortcut POSTs here (uses the app's /api proxy → Core backend).
  protected readonly postUrl = `${window.location.origin}/api/health-sync`;

  ngOnInit() {
    this.title.set('Health');
  }

  protected copyToken() {
    const t = this.health.token();
    if (t) navigator.clipboard?.writeText(t);
  }
}
