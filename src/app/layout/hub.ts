import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthStore } from '../auth/auth.store';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { UiList, UiListItem, UiListTitle } from '../core/ui';
import { LibraryStore } from '../library/library.store';
import { EventsStore, Occurrence } from '../schedule/events.store';
import { PageTitle } from './page-title';
import { visiblePlaces } from './places';

/**
 * Phones' start (as iOS's Settings): the sections this user may open, a row each — its icon, its
 * name, how many (the schedule: today's events; the library: its pages; favorites: theirs), › — a
 * tap opens it (‹ in its top bar: back here); under them today's events, a tap opens one in the
 * schedule.
 */
@Component({
  selector: 'app-hub',
  imports: [TranslatePipe, UiList, UiListItem, UiListTitle],
  template: `
    <div class="flex flex-col gap-6 px-4 pt-2 pb-10">
      <ui-list>
        @for (place of places(); track place.path) {
          <button type="button" uiListItem [icon]="place.icon" chevron (click)="router.navigateByUrl(place.path)">
            {{ place.label | t }}
            @if (count(place.path); as n) {
              <span itemValue class="text-fg-secondary">{{ n }}</span>
            }
          </button>
        }
      </ui-list>
      @if (today().length) {
        <div class="flex flex-col gap-2">
          <ui-list-title>{{ 'schedule.today' | t }}</ui-list-title>
          <ui-list>
            @for (event of today(); track event.id + event.startsAt) {
              <button type="button" uiListItem (click)="open(event)">
                {{ event.title }}
                <span itemValue class="text-fg-secondary tabular-nums">{{ i18n.time(event.startsAt) }}</span>
              </button>
            }
          </ui-list>
        </div>
      }
    </div>
  `,
})
export class Hub {
  protected readonly router = inject(Router);
  protected readonly i18n = inject(I18nService);
  private readonly auth = inject(AuthStore);
  private readonly library = inject(LibraryStore);
  private readonly events = inject(EventsStore);

  protected readonly places = computed(() => visiblePlaces((area) => this.auth.can(area)));
  protected readonly today = computed(() => this.events.ofDay(new Date()));

  constructor() {
    inject(PageTitle).show(computed(() => this.i18n.t('app.name')));
    this.events.show(new Date());
    if (this.auth.can('library')) this.library.load();
  }

  // (a section's count at its right: none — nothing)
  protected count(path: string): number | null {
    const pages = this.library.items();
    const n =
      path === '/schedule' ? this.today().length
      : path === '/library' ? (pages?.length ?? 0)
      : path === '/favorites' ? (pages?.filter((p) => p.favorite).length ?? 0)
      : 0;
    return n || null;
  }

  // An event of today's: the schedule, it open
  protected open(event: Occurrence): void {
    this.events.ask.set({ event });
    this.router.navigateByUrl('/schedule');
  }
}
