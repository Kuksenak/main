import { Injectable, computed, inject } from '@angular/core';
import { ResourceStore } from '../core/services/resource-store';
import { EventService } from '../schedule/event.service';

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
  private events = inject(EventService);

  readonly groups = computed(() => this.items());

  constructor() {
    super('groups', 'groups');
  }

  // A deleted group is uninvited from its events.
  protected override afterChange(): void {
    this.events.reload();
  }
}
