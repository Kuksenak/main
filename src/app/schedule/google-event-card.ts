import { Component, computed, inject, input, output } from '@angular/core';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { Icon } from '../core/ui/icon/icon';
import { PageSheet } from '../core/ui/page-sheet/page-sheet';
import { ScheduleEvent, eventEnd } from './event.service';

// Google descriptions are often HTML: as plain text (line breaks kept, tags dropped, entities read).
function plainText(html: string): string {
  const withBreaks = html.replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|li)>/gi, '\n');
  const text = new DOMParser().parseFromString(withBreaks, 'text/html').body.textContent ?? '';
  return text.replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * A Google Calendar event, for reading (it's edited in Google): the title and its calendar,
 * when (or "All day"), where (opens in Google Maps) and the description. A page on phones, a
 * dialog on desktop.
 */
@Component({
  selector: 'app-google-event-card',
  imports: [Icon, PageSheet, TranslatePipe],
  template: `
    @let e = event();
    <app-page-sheet [actions]="false" (closed)="closed.emit()">
      <div class="flex flex-col gap-4">
        <div class="card">
          <div class="list-row py-3">
            <span class="color-bar" style="background: var(--text-secondary)"></span>
            <div class="min-w-0 flex-1 leading-tight">
              <p class="text-body font-semibold [overflow-wrap:anywhere]">{{ e.title }}</p>
              @if (e.calendarName) {
                <p class="text-footnote mt-0.5 flex items-center gap-1.5 opacity-50">
                  <app-icon name="google" class="size-3.5" />{{ e.calendarName }}
                </p>
              }
            </div>
          </div>
        </div>

        <div class="card">
          @if (e.allDay) {
            <div class="list-row">
              <span>{{ 'schedule.allDay' | t }}</span>
              <span class="ml-auto text-right opacity-60">{{ allDayLabel() }}</span>
            </div>
          } @else {
            <div class="list-row">
              <span>{{ 'event.starts' | t }}</span>
              <span class="ml-auto text-right tabular-nums opacity-60">{{ startLabel() }}</span>
            </div>
            <div class="list-row">
              <span>{{ 'event.ends' | t }}</span>
              <span class="ml-auto text-right tabular-nums opacity-60">{{ endLabel() }}</span>
            </div>
          }
        </div>

        @if (e.location) {
          <div class="card">
            <a [href]="mapsUrl()" target="_blank" rel="noopener" class="list-row py-2.5">
              <span class="contact-field">
                <span>{{ 'event.location' | t }}</span>
                <b class="!whitespace-normal [overflow-wrap:anywhere]">{{ e.location }}</b>
              </span>
            </a>
          </div>
        }

        @if (description(); as d) {
          <div class="flex flex-col gap-1.5">
            <span class="card-label">{{ 'event.notes' | t }}</span>
            <div class="card">
              <p class="text-body whitespace-pre-wrap px-[var(--row-px)] py-3 [overflow-wrap:anywhere]">{{ d }}</p>
            </div>
          </div>
        }
      </div>
    </app-page-sheet>
  `,
})
export class GoogleEventCard {
  readonly event = input.required<ScheduleEvent>();
  readonly closed = output<void>();

  private i18n = inject(I18nService);

  private day(d: Date): string {
    return this.i18n.date(d, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  }
  // "Sat, 11 Oct 2026 18:00"; the end without the day when it's the same day
  protected readonly startLabel = computed(() => {
    const start = new Date(this.event().startsAt);
    return `${this.day(start)} ${this.i18n.time(start)}`;
  });
  protected readonly endLabel = computed(() => {
    const start = new Date(this.event().startsAt);
    const end = eventEnd(this.event());
    const sameDay = start.toDateString() === end.toDateString();
    return sameDay ? this.i18n.time(end) : `${this.day(end)} ${this.i18n.time(end)}`;
  });
  // All day: the day, or first – last day (Google's end is the day after)
  protected readonly allDayLabel = computed(() => {
    const start = new Date(this.event().startsAt);
    const last = new Date(eventEnd(this.event()).getTime() - 1);
    return start.toDateString() === last.toDateString() ? this.day(start) : `${this.day(start)} – ${this.day(last)}`;
  });

  protected readonly mapsUrl = computed(
    () => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(this.event().location ?? '')}`,
  );
  protected readonly description = computed(() => plainText(this.event().description ?? ''));
}
