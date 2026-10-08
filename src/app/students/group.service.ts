import { Injectable, signal } from '@angular/core';

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

// Fake data until the backend has a groups API.
const FAKE_GROUPS: Group[] = [
  { id: 'g1', name: 'B1 Evening', color: 'teal', studentIds: ['s1', 's4', 's6'] },
  { id: 'g2', name: 'Conversation Club', color: 'purple', studentIds: ['s2', 's3', 's7'] },
];

export function colorVar(color: GroupColor): string {
  return `var(--palette-${color})`;
}

/** Student groups. In-memory fake data for now; same shape the API will use. */
@Injectable({ providedIn: 'root' })
export class GroupService {
  private _groups = signal<Group[]>(FAKE_GROUPS);
  readonly groups = this._groups.asReadonly();

  byName(name: string): Group | null {
    return this._groups().find((g) => g.name === name) ?? null;
  }

  /**
   * Calendar color of a lesson. Lessons store who they're for by name (student or group);
   * group lessons take the group's color, everything else the default calendar color.
   */
  lessonColor(who: string): string {
    const group = this.byName(who);
    return group ? colorVar(group.color) : 'var(--calendar-default)';
  }

  create(input: GroupInput): string {
    const id = crypto.randomUUID();
    this._groups.update((list) => [...list, { ...input, id }]);
    return id;
  }

  update(id: string, input: GroupInput): void {
    this._groups.update((list) => list.map((g) => (g.id === id ? { ...input, id } : g)));
  }

  remove(id: string): void {
    this._groups.update((list) => list.filter((g) => g.id !== id));
  }

  /** A deleted student leaves every group. */
  removeMember(studentId: string): void {
    this._groups.update((list) =>
      list.map((g) => ({ ...g, studentIds: g.studentIds.filter((id) => id !== studentId) })),
    );
  }
}
