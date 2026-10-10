import { Injectable, inject } from '@angular/core';
import { I18nService } from '../core/i18n/i18n.service';
import { GroupService, colorVar } from '../students/group.service';
import { StudentService } from '../students/student.service';
import { ScheduleEvent } from './event.service';

/** Who an event is for, as shown: invitee names, the event's label and calendar color. */
@Injectable({ providedIn: 'root' })
export class EventPeople {
  private students = inject(StudentService);
  private groups = inject(GroupService);
  private i18n = inject(I18nService);

  /** Invited groups first, then students. */
  names(e: ScheduleEvent): string[] {
    return [
      ...e.groupIds.map((id) => this.groups.byId(id)?.name),
      ...e.studentIds.map((id) => this.students.byId(id)?.name),
    ].filter((n): n is string => !!n);
  }

  /** The title, else who it's for, else "New Event" (the title isn't required). */
  label(e: ScheduleEvent): string {
    return e.title || this.names(e).join(', ') || this.i18n.t('event.untitled');
  }

  /** Under the label: who it's for, when there's a title above it. */
  subtitle(e: ScheduleEvent): string {
    return (e.title && this.names(e).join(', ')) || '';
  }

  /** Calendar color: the first invited group's color, else the default calendar color. */
  color(e: ScheduleEvent): string {
    const group = this.groups.byId(e.groupIds[0] ?? null);
    return group ? colorVar(group.color) : 'var(--calendar-default)';
  }

  /** Whether a student is invited: directly or through one of the invited groups. */
  invites(e: ScheduleEvent, studentId: string): boolean {
    return (
      e.studentIds.includes(studentId) ||
      e.groupIds.some((id) => this.groups.byId(id)?.studentIds.includes(studentId))
    );
  }
}
