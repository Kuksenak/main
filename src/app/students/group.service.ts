import { Injectable, computed, inject } from '@angular/core';
import { ResourceStore } from '../core/services/resource-store';
import { Lesson, LessonService } from '../schedule/lesson.service';

// Group colors: keys into the palette tokens (--palette-*) in tokens.css.
export const GROUP_COLORS = ['teal', 'green', 'yellow', 'pink', 'purple', 'indigo'] as const;
export type GroupColor = (typeof GROUP_COLORS)[number];

export interface Group {
  id: string;
  name: string;
  color: GroupColor;
  studentIds: string[];
}

export type GroupInput = Omit<Group, 'id'>;

export function colorVar(color: GroupColor): string {
  return `var(--palette-${color})`;
}

/** The account's student groups (API: /groups). */
@Injectable({ providedIn: 'root' })
export class GroupService extends ResourceStore<Group, GroupInput> {
  private lessons = inject(LessonService);

  readonly groups = computed(() => this.items());

  constructor() {
    super('groups', 'groups');
  }

  /** Calendar color of a lesson: its group's color, else the default calendar color. */
  lessonColor(lesson: Lesson): string {
    const group = this.byId(lesson.groupId);
    return group ? colorVar(group.color) : 'var(--calendar-default)';
  }

  // Renaming / deleting a group changes how its lessons are named.
  protected override afterChange(): void {
    this.lessons.reload();
  }
}
