import { Component, computed, inject, input } from '@angular/core';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { initial } from '../core/utils/text';
import { Student, StudentService } from '../students/student.service';

/** Members of a group, alphabetical, under a "Members" label (rows don't open anything for now). */
@Component({
  selector: 'app-group-members',
  imports: [TranslatePipe],
  host: { class: 'flex flex-col gap-1.5' },
  template: `
    <span class="card-label">{{ 'groups.members' | t }}</span>
    <div class="card">
      @for (s of members(); track s.id) {
        <div class="list-row py-2">
          <span class="avatar">{{ initial(s.name) }}</span>
          <p class="min-w-0 flex-1 truncate">{{ s.name }}</p>
        </div>
      } @empty {
        <p class="list-row opacity-40">—</p>
      }
    </div>
  `,
})
export class GroupMembers {
  readonly studentIds = input.required<string[]>();

  private students = inject(StudentService);
  private i18n = inject(I18nService);

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
