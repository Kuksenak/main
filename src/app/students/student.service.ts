import { Injectable, computed, inject } from '@angular/core';
import { ResourceStore } from '../core/services/resource-store';
import { LessonService } from '../schedule/lesson.service';
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
  private lessons = inject(LessonService);

  readonly students = computed(() => this.items());

  constructor() {
    super('students', 'students');
  }

  // Deleting a student drops them from groups; renaming changes how their lessons are named.
  protected override afterChange(): void {
    this.groups.reload();
    this.lessons.reload();
  }
}
