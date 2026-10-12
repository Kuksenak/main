import { HttpClient } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { environment } from '@environments/environment';
import { catchError, of } from 'rxjs';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { NotificationsService } from '../core/services/notifications.service';
import { ToolbarService } from '../core/services/toolbar.service';
import { Icon } from '../core/ui/icon/icon';

interface Item {
  id: string;
  kind: string;
  title: string;
  body: string;
  url: string;
  createdAt: string;
}

/**
 * The teacher's notifications (e.g. a student finished a lesson), latest first: what it said and
 * when; a tap opens what it's about. A page of its own like Install, the whole width, no heading
 * (phones: ✕ in the top bar); a new one arriving meanwhile comes in at the top.
 */
@Component({
  selector: 'app-notifications-page',
  imports: [Icon, TranslatePipe],
  template: `
    <main class="min-h-0 w-full flex-1 overflow-y-auto px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-1 desktop:pt-6">
      <div class="flex w-full flex-col gap-4">
        @if (items(); as list) {
          @if (list.length) {
            <div class="card">
              @for (n of list; track n.id) {
                <button type="button" (click)="open(n.url)" class="list-row w-full py-2.5 text-left">
                  <app-icon name="bell" class="row-icon self-start pt-0.5" />
                  <div class="min-w-0 flex-1 leading-tight">
                    <p class="font-medium">{{ n.title }}</p>
                    <p class="text-footnote mt-0.5 opacity-50">{{ n.body }}</p>
                  </div>
                  <span class="text-footnote shrink-0 self-start tabular-nums opacity-50">{{ when(n.createdAt) }}</span>
                </button>
              }
            </div>
          } @else {
            <p class="text-body py-10 text-center opacity-40">{{ 'notifications.empty' | t }}</p>
          }
        }
      </div>
    </main>
  `,
})
export class NotificationsPage {
  private http = inject(HttpClient);
  private i18n = inject(I18nService);
  private notifications = inject(NotificationsService);
  // null: loading
  protected readonly items = signal<Item[] | null>(null);

  constructor() {
    this.load();
    // A new one meanwhile: the list again
    const sub = this.notifications.received.subscribe(() => this.load());

    // Phones: ✕ in the top bar
    const toolbar = inject(ToolbarService);
    toolbar.back.set(true);
    toolbar.close.set(true);
    inject(DestroyRef).onDestroy(() => {
      sub.unsubscribe();
      toolbar.back.set(false);
      toolbar.close.set(false);
    });
  }

  private load(): void {
    this.http
      .get<{ notifications: Item[] }>(`${environment.apiUrl}/notifications`)
      .pipe(catchError(() => of({ notifications: [] as Item[] })))
      .subscribe((res) => this.items.set(res.notifications ?? []));
  }

  protected open(url: string): void {
    this.notifications.open(url);
  }

  // Today: the time; else the day
  protected when(iso: string): string {
    const d = new Date(iso);
    return new Date().toDateString() === d.toDateString()
      ? this.i18n.time(d)
      : this.i18n.date(d, { day: 'numeric', month: 'short' });
  }
}
