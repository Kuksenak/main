import { Injectable, computed, inject } from '@angular/core';
import { ResourceStore } from '../core/services/resource-store';
import { EventService } from '../schedule/event.service';
import { GroupService } from './group.service';

export interface Student {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  lessonIds: string[]; // attached lessons (their materials), in order
}

export interface StudentInput {
  name: string;
  email: string | null;
  phone: string | null;
}

/** The account's students (API: /students). */
@Injectable({ providedIn: 'root' })
export class StudentService extends ResourceStore<Student, StudentInput> {
  private groups = inject(GroupService);
  private events = inject(EventService);

  readonly students = computed(() => this.items());

  constructor() {
    super('students', 'students');
  }

  /** The lessons attached to a student, in this order. */
  setLessons(id: string, lessonIds: string[]): void {
    this.putSub(id, 'lessons', { lessonIds }, { lessonIds });
  }

  // A deleted student leaves their groups and is uninvited from events.
  protected override afterChange(): void {
    this.groups.reload();
    this.events.reload();
  }
}
