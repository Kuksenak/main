import { Component, OnInit, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { NavStack, StackEntry } from '../core/services/nav-stack.service';
import { Icon } from '../core/ui/icon/icon';
import { PageSheet } from '../core/ui/page-sheet/page-sheet';
import { ScrollArea } from '../core/ui/scroll-area/scroll-area';
import { SearchField } from '../core/ui/search-field';
import { Section } from '../core/ui/section/section';
import { Sheet } from '../core/ui/sheet/sheet';
import { initial } from '../core/utils/text';
import { GROUP_COLORS, GroupColor, GroupService, colorVar } from '../students/group.service';
import { Student, StudentService } from '../students/student.service';
import { LessonList } from './lesson-list';

interface Model {
  name: string;
  color: GroupColor;
  studentIds: string[];
}

/** Group card (new or existing), opened on the NavStack: name, color, members, lessons. */
@Component({
  selector: 'app-group-editor',
  imports: [FormsModule, Icon, LessonList, PageSheet, ScrollArea, SearchField, Section, Sheet, TranslatePipe],
  template: `
    @let m = model();
    <app-page-sheet
      #page
      [title]="(entry().id ? 'groups.edit' : 'groups.new') | t"
      [dirty]="dirty()"
      [canSave]="canSave()"
      [deletable]="!!entry().id"
      (save)="save()"
      (delete)="remove()"
      (closed)="closed.emit()"
    >
      <div class="flex flex-col gap-6">
        <div class="card">
          <div class="list-row">
            <input name="groupName" [ngModel]="m.name" (ngModelChange)="patch({ name: $event })" type="text" [placeholder]="'groups.name' | t" autocomplete="off" class="row-input" />
          </div>
          <div class="list-row py-3 desktop:py-2">
            <span>{{ 'groups.color' | t }}</span>
            <div class="flex flex-wrap justify-end gap-2.5">
              @for (c of colors; track c) {
                <button
                  type="button"
                  (click)="patch({ color: c })"
                  class="swatch"
                  [class.is-on]="m.color === c"
                  [style.background]="colorVar(c)"
                  [style.color]="colorVar(c)"
                  [attr.aria-label]="c"
                  [attr.aria-pressed]="m.color === c"
                ></button>
              }
            </div>
          </div>
        </div>

        <!-- Members: tap opens the student card on top, × removes from the group -->
        <app-section [title]="'groups.members' | t" [count]="members().length" key="members">
          <div class="card">
            @for (s of members(); track s.id) {
              <div class="list-row py-2">
                <button type="button" (click)="stack.push({ kind: 'student', id: s.id })" class="flex min-w-0 flex-1 items-center gap-3 text-left">
                  <span class="avatar">{{ initial(s.name) }}</span>
                  <p class="min-w-0 flex-1 truncate">{{ s.name }}</p>
                </button>
                <button type="button" (click)="toggle(s.id)" [attr.aria-label]="'action.delete' | t" class="icon-plain -mr-2">
                  <app-icon name="close" class="size-4" />
                </button>
              </div>
            }
            <button type="button" (click)="pickingMembers.set(true)" class="list-row w-full text-left text-[var(--accent)]">
              <span class="flex items-center gap-2 font-medium">
                <app-icon name="plus" class="size-5" />
                {{ 'groups.addMembers' | t }}
              </span>
            </button>
          </div>
        </app-section>

        @if (saved(); as g) {
          <app-lesson-list [who]="g.name" />
        }
      </div>
    </app-page-sheet>

    <!-- Member picker: every student with a check -->
    @if (pickingMembers()) {
      <app-sheet #memberSheet (closed)="pickingMembers.set(false)">
        <div class="flex min-h-0 flex-1 flex-col gap-3">
          <app-search-field [(value)]="memberQuery" />
          <app-scroll-area class="min-h-0 shrink" viewportClass="card">
            @for (s of pickerStudents(); track s.id) {
              <button type="button" (click)="toggle(s.id)" class="list-row w-full py-2 text-left">
                <span class="check" [class.is-on]="m.studentIds.includes(s.id)">
                  @if (m.studentIds.includes(s.id)) {
                    <app-icon name="check" [strokeWidth]="3" class="size-3.5" />
                  }
                </span>
                <span class="avatar">{{ initial(s.name) }}</span>
                <p class="min-w-0 flex-1 truncate">{{ s.name }}</p>
              </button>
            }
          </app-scroll-area>
          <button type="button" (click)="memberSheet.close()" class="btn-primary mt-auto w-full shrink-0">{{ 'action.done' | t }}</button>
        </div>
      </app-sheet>
    }
  `,
})
export class GroupEditor implements OnInit {
  readonly entry = input.required<StackEntry>();
  readonly closed = output<void>();

  private groups = inject(GroupService);
  private students = inject(StudentService);
  private i18n = inject(I18nService);
  protected stack = inject(NavStack);
  private readonly page = viewChild.required<PageSheet>('page');

  protected readonly colors = GROUP_COLORS;
  protected readonly colorVar = colorVar;
  protected readonly pickingMembers = signal(false);
  protected readonly memberQuery = signal('');

  protected readonly model = signal<Model>({ name: '', color: GROUP_COLORS[0], studentIds: [] });
  private readonly snapshot = signal(''); // contents when opened, to tell whether anything changed

  protected readonly saved = computed(() => this.groups.groups().find((g) => g.id === this.entry().id) ?? null);
  protected readonly dirty = computed(() => JSON.stringify(this.model()) !== this.snapshot());
  protected readonly canSave = computed(() => !!this.model().name.trim() && this.dirty());

  private readonly byName = (a: Student, b: Student) => a.name.localeCompare(b.name, this.i18n.locale());
  protected readonly allStudents = computed(() => [...this.students.students()].sort(this.byName));
  protected readonly pickerStudents = computed(() => {
    const q = this.memberQuery().trim().toLocaleLowerCase();
    return this.allStudents().filter((s) => !q || s.name.toLocaleLowerCase().includes(q));
  });
  protected readonly members = computed(() =>
    this.allStudents().filter((s) => this.model().studentIds.includes(s.id)),
  );

  ngOnInit(): void {
    const g = this.saved();
    if (g) {
      this.model.set({ name: g.name, color: g.color, studentIds: [...g.studentIds] });
      this.snapshot.set(JSON.stringify(this.model()));
    } else {
      // New: first color not used yet; members pre-selected from the students list. Counts as
      // unsaved, so a group made from a selection can be saved right after naming it.
      const used = new Set(this.groups.groups().map((x) => x.color));
      const color = GROUP_COLORS.find((c) => !used.has(c)) ?? GROUP_COLORS[0];
      const studentIds = this.entry().studentIds ?? [];
      this.model.set({ name: '', color, studentIds });
      // A brand-new empty group starts by picking its members.
      if (!studentIds.length) this.pickingMembers.set(true);
    }
  }

  protected initial(name: string): string {
    return initial(name, this.i18n.locale());
  }

  protected patch(p: Partial<Model>): void {
    this.model.update((m) => ({ ...m, ...p }));
  }

  protected toggle(studentId: string): void {
    const ids = this.model().studentIds;
    this.patch({ studentIds: ids.includes(studentId) ? ids.filter((id) => id !== studentId) : [...ids, studentId] });
  }

  protected save(): void {
    if (!this.canSave()) return;
    const m = this.model();
    const input = { name: m.name.trim(), color: m.color, studentIds: m.studentIds };
    const id = this.entry().id;
    if (id) this.groups.update(id, input);
    else this.groups.create(input);
    this.page().close();
  }

  protected remove(): void {
    const id = this.entry().id;
    if (!id) return;
    this.groups.remove(id);
    this.page().close();
  }
}
