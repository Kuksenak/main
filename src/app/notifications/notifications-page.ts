import { HttpClient } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { environment } from '@environments/environment';
import { catchError, of } from 'rxjs';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { NotificationsService } from '../core/services/notifications.service';
import { ToolbarService } from '../core/services/toolbar.service';
import { Icon } from '../core/ui/icon/icon';
import { ScrollArea } from '../core/ui/scroll-area/scroll-area';
import { DeviceDetectionService } from '../core/services/device-detection.service';

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
  host: { class: 'flex min-h-0 w-full flex-1 flex-col' },
  imports: [Icon, ScrollArea, TranslatePipe],
  template: `
    @if (desktop) {
      <!-- Desktop (as Notion's inbox): the head, then a row a line — the title, what it said, when at
           the right; new ones with a blue dot (opening nothing for now) -->
      <main class="flex min-h-0 w-full flex-1 flex-col px-2 pb-4">
        <h1 class="flex h-12 shrink-0 items-center px-2 text-[1.25rem] font-semibold">{{ 'sidebar.inbox' | t }}</h1>
        <app-scroll-area class="min-h-0 flex-1" viewportClass="!rounded-none">
          @if (items(); as list) {
            <div class="flex flex-col gap-px">
              @for (n of list; track n.id) {
                <!-- (not opening anything for now) -->
                <div class="side-row relative !h-9 !gap-2.5 !pl-5 hover:!bg-transparent">
                  @if (isNew(n)) {
                    <span class="absolute left-1.5 top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-[var(--accent)]"></span>
                  }
                  <span class="min-w-0 flex-1 truncate">
                    <span [class.font-semibold]="isNew(n)" [class.font-medium]="!isNew(n)">{{ n.title }}</span>
                    @if (n.body) {
                      <span class="opacity-55"> · {{ n.body }}</span>
                    }
                  </span>
                  <span class="shrink-0 text-[0.75rem] tabular-nums opacity-45">{{ when(n.createdAt) }}</span>
                </div>
              } @empty {
                <p class="px-2 py-10 text-[0.875rem] opacity-40">{{ 'notifications.empty' | t }}</p>
              }
            </div>
          }
        </app-scroll-area>
      </main>
    } @else {
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
    }
  `,
})
export class NotificationsPage {
  private http = inject(HttpClient);
  private i18n = inject(I18nService);
  private notifications = inject(NotificationsService);
  // null: loading
  protected readonly items = signal<Item[] | null>(null);
  protected readonly desktop = !inject(DeviceDetectionService).isMobile();
  // When the inbox was last open: newer ones are new (a blue dot); now is then, from here on
  private readonly seenBefore = readSeen();

  protected isNew(n: Item): boolean {
    return !!this.seenBefore && n.createdAt > this.seenBefore;
  }

  constructor() {
    this.load();
    writeSeen(new Date().toISOString());
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

const SEEN_KEY = 'inbox.seenAt';
function readSeen(): string | null {
  try {
    return localStorage.getItem(SEEN_KEY);
  } catch {
    return null;
  }
}
function writeSeen(at: string): void {
  try {
    localStorage.setItem(SEEN_KEY, at);
  } catch {
    // (private mode: no dots then)
  }
}
