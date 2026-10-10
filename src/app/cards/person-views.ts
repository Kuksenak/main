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
  host: { class: 'flex flex-col gap-4' },
  template: `
    @let s = student();
    <!-- Header, pinned while the rest scrolls: centered on phones, avatar beside the name on
         desktop (with [headerEnd] content — Edit — on the right) -->
    <div class="sticky top-[calc(env(safe-area-inset-top)+3.75rem)] z-[5] -mx-1 bg-[var(--app-bg)] px-1 pb-2 desktop:top-0 desktop:bg-[var(--dialog-bg)] flex flex-col items-center gap-1.5 pt-1 text-center desktop:flex-row desktop:gap-3 desktop:pt-0 desktop:text-left">
      <span class="avatar size-16 text-2xl desktop:size-12 desktop:text-lg">{{ initial(s.name) }}</span>
      <div class="min-w-0 desktop:flex-1">
        <h1 class="truncate text-xl font-semibold leading-tight">{{ s.name }}</h1>
        @if (groupNames()) {
          <p class="text-footnote truncate opacity-50">{{ groupNames() }}</p>
        }
      </div>
      <ng-content select="[headerEnd]" />
    </div>

    <!-- Desktop: two columns — the info left, the events right -->
    <div class="flex flex-col gap-4 desktop:grid desktop:grid-cols-2 desktop:items-start">
    <div class="flex flex-col gap-4">

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
    </div>
    <app-event-list [studentId]="s.id" />
    </div>
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
  host: { class: 'flex flex-col gap-4' },
  template: `
    @let g = group();
    <!-- Header, pinned while the rest scrolls (see StudentView) -->
    <div class="sticky top-[calc(env(safe-area-inset-top)+3.75rem)] z-[5] -mx-1 bg-[var(--app-bg)] px-1 pb-2 desktop:top-0 desktop:bg-[var(--dialog-bg)] flex flex-col items-center gap-1.5 pt-1 text-center desktop:flex-row desktop:gap-3 desktop:pt-0 desktop:text-left">
      <span class="avatar size-16 text-2xl text-[var(--accent-fg)] desktop:size-12 desktop:text-lg" [style.background]="colorVar(g.color)">{{ initial(g.name) }}</span>
      <div class="min-w-0 desktop:flex-1">
        <h1 class="truncate text-xl font-semibold leading-tight">{{ g.name }}</h1>
        <p class="text-footnote flex items-center gap-1 tabular-nums opacity-50 mobile:justify-center">
          <app-icon name="person" class="size-3.5" />{{ g.studentIds.length }}
        </p>
      </div>
      <ng-content select="[headerEnd]" />
    </div>

    <!-- Desktop: two columns — the members left, the events right -->
    <div class="flex flex-col gap-4 desktop:grid desktop:grid-cols-2 desktop:items-start">
      <app-group-members [studentIds]="g.studentIds" />
      <app-event-list [groupId]="g.id" />
    </div>
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
