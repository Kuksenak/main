import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { NotificationsService } from '../services/notifications.service';

/**
 * A notification while the app is open (e.g. "Emily finished Past Simple — 2 of 3 right"): a glass
 * banner dropping in at the top, like iOS'; a tap opens what it's about, it goes away on its own
 * after a few seconds.
 */
@Component({
  selector: 'app-notification-banner',
  template: `
    @if (notifications.showing(); as n) {
      <button
        type="button"
        (click)="open(n.url)"
        class="glass-neutral fixed inset-x-3 top-[calc(env(safe-area-inset-top)+0.5rem)] z-[2100] mx-auto flex max-w-md flex-col items-start gap-0.5 rounded-[1.25rem] px-4 py-3 text-left [animation:bannerIn_380ms_var(--ease-out-quick)] active:opacity-80"
      >
        <span class="text-body w-full truncate font-semibold">{{ n.title }}</span>
        <span class="text-footnote w-full truncate opacity-60">{{ n.body }}</span>
      </button>
    }
  `,
})
export class NotificationBanner {
  protected readonly notifications = inject(NotificationsService);
  private router = inject(Router);

  protected open(url: string): void {
    this.notifications.dismiss();
    this.router.navigateByUrl(url);
  }
}
