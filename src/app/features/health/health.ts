import { Component, OnInit, inject } from '@angular/core';
import { createSheetTitleRegistrar } from 'app/core/ui/sheet/sheet-buttons.helper';
import { HealthCard } from 'app/core/ui/health-card/health-card';

@Component({
  selector: 'app-health-page',
  standalone: true,
  imports: [HealthCard],
  templateUrl: './health.html',
})
export class Health implements OnInit {
  private title = createSheetTitleRegistrar();

  protected readonly appUrl = window.location.origin;

  // ⬇️ Paste your iCloud Shortcut share link here (Shortcuts → Share → Copy iCloud Link).
  // The shared shortcut should read today's steps and Open URL:
  //   <appUrl>/?days=[Today]:[TodaySteps]
  protected readonly shortcutUrl = 'https://www.icloud.com/shortcuts/22736518fee547f6accc82e357c667a1';

  protected get shortcutReady(): boolean {
    return this.shortcutUrl.startsWith('https://www.icloud.com/shortcuts/');
  }

  ngOnInit() {
    this.title.set('Health');
  }
}
