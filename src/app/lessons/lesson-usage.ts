import { Injectable, computed, inject } from '@angular/core';
import { I18nService } from '../core/i18n/i18n.service';
import { EventPeople } from '../schedule/event-people';
import { EventService, ScheduleEvent, eventEnd } from '../schedule/event.service';

export interface LessonUse {
  next: ScheduleEvent | null; // the soonest one not over yet
  last: ScheduleEvent | null; // the latest one over
}

/** Where lessons are in the schedule: each one's next and last event (over the loaded window). */
@Injectable({ providedIn: 'root' })
export class LessonUsage {
  private events = inject(EventService);
  private people = inject(EventPeople);
  private i18n = inject(I18nService);

  private readonly byLesson = computed(() => {
    const now = Date.now();
    const map = new Map<string, LessonUse>();
    for (const e of this.events.events()) {
      for (const id of e.lessonIds) {
        const use = map.get(id) ?? { next: null, last: null };
        if (eventEnd(e).getTime() >= now) {
          if (!use.next || e.startsAt < use.next.startsAt) use.next = e;
        } else if (!use.last || e.startsAt > use.last.startsAt) use.last = e;
        map.set(id, use);
      }
    }
    return map;
  });

  of(lessonId: string): LessonUse {
    return this.byLesson().get(lessonId) ?? { next: null, last: null };
  }

  /** "Thu 16 Oct" */
  day(e: ScheduleEvent): string {
    return this.i18n.date(new Date(e.startsAt), { weekday: 'short', day: 'numeric', month: 'short' });
  }

  /** Who it's for: the event's title, else its groups / students. */
  who(e: ScheduleEvent): string {
    return this.people.label(e);
  }
}
