import { Injectable, computed, inject } from '@angular/core';
import { ResourceStore } from '../core/services/resource-store';
import { EventService } from '../schedule/event.service';
import { GroupService } from './group.service';

export interface Student {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
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

  // A deleted student leaves their groups and is uninvited from events.
  protected override afterChange(): void {
    this.groups.reload();
    this.events.reload();
  }
}
