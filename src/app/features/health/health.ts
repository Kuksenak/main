import { Component, OnInit, inject } from '@angular/core';
import { createSheetTitleRegistrar } from 'app/core/ui/sheet/sheet-buttons.helper';
import { HealthCard } from 'app/core/ui/health-card/health-card';
import { WorkoutsCard } from 'app/core/ui/health-card/workouts-card';
import { HealthService } from 'app/core/services/health.service';
import { environment } from '@environments/environment';

@Component({
  selector: 'app-health-page',
  standalone: true,
  imports: [HealthCard, WorkoutsCard],
  templateUrl: './health.html',
})
export class Health implements OnInit {
  private title = createSheetTitleRegistrar();

  protected readonly health = inject(HealthService);

  // The Shortcut POSTs here. Must be an absolute URL pointing at the API host
  // (in prod that's a separate domain, e.g. https://api.inky.one).
  protected readonly postUrl = /^https?:\/\//.test(environment.apiUrl)
    ? `${environment.apiUrl}/health-sync`
    : `${window.location.origin}${environment.apiUrl}/health-sync`;

  ngOnInit() {
    this.title.set('Health');
  }

  protected copyToken() {
    const t = this.health.token();
    if (t) navigator.clipboard?.writeText(t);
  }
}
