import { Component, computed, inject, input } from '@angular/core';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { Icon } from '../core/ui/icon/icon';
import { initial } from '../core/utils/text';
import { Group, GroupService, colorVar } from '../students/group.service';
import { Student } from '../students/student.service';
import { EventList } from './event-list';
import { GroupMembers, StudentGroups } from './related-lists';

/**
 * A student, for reading (iOS Contacts-like) — the same on the desktop students page and in the
 * phone card: a big avatar, the name and their groups; Email / Call; the contacts; groups;
 * events.
 */
@Component({
  selector: 'app-student-view',
  imports: [EventList, Icon, StudentGroups, TranslatePipe],
  host: { class: 'flex flex-col gap-6' },
  template: `
    @let s = student();
    <div class="flex flex-col items-center gap-2 pt-2 text-center">
      <span class="avatar size-20 text-3xl">{{ initial(s.name) }}</span>
      <h1 class="text-2xl font-semibold leading-tight">{{ s.name }}</h1>
      @if (groupNames()) {
        <p class="text-footnote -mt-1 opacity-50">{{ groupNames() }}</p>
      }
    </div>

    <!-- Email / Call (grayed out without an address / number) -->
    <div class="grid grid-cols-2 gap-2">
      <a [attr.href]="s.email ? 'mailto:' + s.email : null" class="contact-action" [class.is-off]="!s.email">
        <app-icon name="mail" [strokeWidth]="1.75" class="size-6" />
        {{ 'students.actionMail' | t }}
      </a>
      <a [attr.href]="s.phone ? 'tel:' + s.phone : null" class="contact-action" [class.is-off]="!s.phone">
        <app-icon name="call" [strokeWidth]="1.75" class="size-6" />
        {{ 'students.actionCall' | t }}
      </a>
    </div>

    @if (s.email || s.phone) {
      <div class="card">
        @if (s.email) {
          <div class="list-row">
            <span class="opacity-50">{{ 'students.email' | t }}</span>
            <a [href]="'mailto:' + s.email" class="ml-auto truncate text-[var(--accent)]">{{ s.email }}</a>
          </div>
        }
        @if (s.phone) {
          <div class="list-row">
            <span class="opacity-50">{{ 'students.phone' | t }}</span>
            <a [href]="'tel:' + s.phone" class="ml-auto truncate tabular-nums text-[var(--accent)]">{{ s.phone }}</a>
          </div>
        }
      </div>
    }

    <app-student-groups [studentId]="s.id" />
    <app-event-list [studentId]="s.id" />
  `,
})
export class StudentView {
  readonly student = input.required<Student>();

  private groups = inject(GroupService);
  private i18n = inject(I18nService);

  protected readonly groupNames = computed(() =>
    this.groups
      .groups()
      .filter((g) => g.studentIds.includes(this.student().id))
      .map((g) => g.name)
      .join(', '),
  );

  protected initial(name: string): string {
    return initial(name, this.i18n.locale());
  }
}

/** A group, for reading: its color avatar, the name and how many students; members; events. */
@Component({
  selector: 'app-group-view',
  imports: [EventList, GroupMembers, Icon],
  host: { class: 'flex flex-col gap-6' },
  template: `
    @let g = group();
    <div class="flex flex-col items-center gap-2 pt-2 text-center">
      <span class="avatar size-20 text-3xl text-[var(--accent-fg)]" [style.background]="colorVar(g.color)">{{ initial(g.name) }}</span>
      <h1 class="text-2xl font-semibold leading-tight">{{ g.name }}</h1>
      <p class="text-footnote -mt-1 flex items-center gap-1 tabular-nums opacity-50">
        <app-icon name="person" class="size-3.5" />{{ g.studentIds.length }}
      </p>
    </div>
    <app-group-members [studentIds]="g.studentIds" />
    <app-event-list [groupId]="g.id" />
  `,
})
export class GroupView {
  readonly group = input.required<Group>();

  private i18n = inject(I18nService);
  protected readonly colorVar = colorVar;

  protected initial(name: string): string {
    return initial(name, this.i18n.locale());
  }
}
