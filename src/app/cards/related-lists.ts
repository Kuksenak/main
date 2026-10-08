import { Component, computed, inject, input } from '@angular/core';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { NavStack } from '../core/services/nav-stack.service';
import { Icon } from '../core/ui/icon/icon';
import { Section } from '../core/ui/section/section';
import { initial } from '../core/utils/text';
import { GroupService, colorVar } from '../students/group.service';
import { Student, StudentService } from '../students/student.service';

/** Groups a student is in; a tap opens the group card on top. Renders nothing when none. */
@Component({
  selector: 'app-student-groups',
  imports: [Icon, Section, TranslatePipe],
  template: `
    @if (groups().length) {
      <app-section [title]="'groups.title' | t" [count]="groups().length" key="studentGroups">
        <div class="card">
          @for (g of groups(); track g.id) {
            <button type="button" (click)="stack.push({ kind: 'group', id: g.id })" class="list-row w-full text-left">
              <span class="dot size-2.5" [style.background]="colorVar(g.color)"></span>
              <p class="min-w-0 flex-1 truncate">{{ g.name }}</p>
              <app-icon name="chevron-right" class="size-4 opacity-30" />
            </button>
          }
        </div>
      </app-section>
    }
  `,
})
export class StudentGroups {
  readonly studentId = input.required<string>();

  private groupService = inject(GroupService);
  protected stack = inject(NavStack);
  protected readonly colorVar = colorVar;
  protected readonly groups = computed(() =>
    this.groupService.groups().filter((g) => g.studentIds.includes(this.studentId())),
  );
}

/** Members of a group, alphabetical; a tap opens the student card on top. */
@Component({
  selector: 'app-group-members',
  imports: [Icon, Section, TranslatePipe],
  template: `
    <app-section [title]="'groups.members' | t" [count]="members().length" key="members">
      <div class="card">
        @for (s of members(); track s.id) {
          <button type="button" (click)="stack.push({ kind: 'student', id: s.id })" class="list-row w-full py-2 text-left">
            <span class="avatar">{{ initial(s.name) }}</span>
            <p class="min-w-0 flex-1 truncate">{{ s.name }}</p>
            <app-icon name="chevron-right" class="size-4 opacity-30" />
          </button>
        } @empty {
          <p class="list-row opacity-40">—</p>
        }
      </div>
    </app-section>
  `,
})
export class GroupMembers {
  readonly studentIds = input.required<string[]>();

  private students = inject(StudentService);
  private i18n = inject(I18nService);
  protected stack = inject(NavStack);

  protected readonly members = computed(() =>
    this.studentIds()
      .map((id) => this.students.students().find((s) => s.id === id))
      .filter((s): s is Student => !!s)
      .sort((a, b) => a.name.localeCompare(b.name, this.i18n.locale())),
  );

  protected initial(name: string): string {
    return initial(name, this.i18n.locale());
  }
}
