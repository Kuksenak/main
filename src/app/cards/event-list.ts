import { Component, computed, inject, input } from '@angular/core';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { TranslationKey } from '../core/i18n/translations';
import { NavStack } from '../core/services/nav-stack.service';
import { Icon } from '../core/ui/icon/icon';
import { Section } from '../core/ui/section/section';
import { EventPeople } from '../schedule/event-people';
import { EventService, ScheduleEvent, eventEnd, occurrenceKey, statusKey } from '../schedule/event.service';

/**
 * Events a student is invited to (directly or through a group), a group is invited to, or a
 * lesson is attached to:
 * Upcoming soonest first, then Past most recent first, each a collapsible section (Past folded
 * by default). A tap opens the event card on top.
 */
@Component({
  selector: 'app-event-list',
  imports: [Icon, Section, TranslatePipe],
  host: { class: 'flex flex-col gap-6' },
  template: `
    @if (!upcoming().length && !past().length) {
      <p class="text-footnote opacity-50">{{ 'students.noEvents' | t }}</p>
    }
    @for (g of sections(); track g.key) {
      @if (g.items.length) {
        <app-section [title]="g.key | t" [count]="g.items.length" [key]="g.key" [initiallyOpen]="g.open">
          <div class="card">
            @for (e of g.items; track key(e)) {
              <button type="button" (click)="open(e)" class="list-row w-full py-2 text-left">
                <span class="color-bar" [style.background]="people.color(e)"></span>
                <div class="min-w-0 flex-1 leading-tight">
                  <p class="truncate font-medium" [class.line-through]="e.status === 'Cancelled'">@if (e.lessonIds.length) {<app-icon name="paperclip" class="mr-1 inline size-4 rotate-45 align-[-2px] opacity-50" />}{{ date(e) }}</p>
                  <p class="text-footnote truncate opacity-50">
                    {{ time(e) }}@if (lessonId() ? people.label(e) : e.title; as name) { · {{ name }} }
                  </p>
                </div>
                @if (e.status !== 'Scheduled') {
                  <span class="badge">{{ statusKey(e.status) | t }}</span>
                }
                <app-icon name="chevron-right" class="row-chevron" />
              </button>
            }
          </div>
        </app-section>
      }
    }
  `,
})
export class EventList {
  /** Whose events: a student's, a group's or a lesson's. */
  readonly studentId = input<string | null>(null);
  readonly groupId = input<string | null>(null);
  readonly lessonId = input<string | null>(null);

  private events = inject(EventService);
  protected people = inject(EventPeople);
  private i18n = inject(I18nService);
  private stack = inject(NavStack);

  private readonly mine = computed(() => {
    const sid = this.studentId();
    const gid = this.groupId();
    const lid = this.lessonId();
    return this.events
      .events()
      .filter(
        (e) =>
          (sid && this.people.invites(e, sid)) || (gid && e.groupIds.includes(gid)) || (lid && e.lessonIds.includes(lid)),
      );
  });
  private end = (e: ScheduleEvent) => eventEnd(e).getTime();
  protected readonly statusKey = statusKey;
  protected readonly key = occurrenceKey;
  protected readonly upcoming = computed(() =>
    this.mine()
      .filter((e) => this.end(e) >= Date.now())
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
  );
  protected readonly past = computed(() =>
    this.mine()
      .filter((e) => this.end(e) < Date.now())
      .sort((a, b) => b.startsAt.localeCompare(a.startsAt)),
  );
  protected readonly sections = computed(() => [
    { key: 'students.upcoming' as TranslationKey, items: this.upcoming(), open: true },
    { key: 'students.past' as TranslationKey, items: this.past(), open: false },
  ]);

  protected open(e: ScheduleEvent): void {
    this.stack.push({ kind: 'event', id: e.id, at: e.startsAt });
  }

  protected date(e: ScheduleEvent): string {
    return this.i18n.date(new Date(e.startsAt), { weekday: 'short', day: 'numeric', month: 'short' });
  }

  protected time(e: ScheduleEvent): string {
    return `${this.i18n.time(new Date(e.startsAt))}–${this.i18n.time(eventEnd(e))}`;
  }
}
