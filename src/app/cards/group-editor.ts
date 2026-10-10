import { Component, ElementRef, OnInit, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { StackEntry } from '../core/services/nav-stack.service';
import { Icon } from '../core/ui/icon/icon';
import { PageSheet } from '../core/ui/page-sheet/page-sheet';
import { Section } from '../core/ui/section/section';
import { initial } from '../core/utils/text';
import { GROUP_COLORS, GroupColor, GroupService, colorVar } from '../students/group.service';
import { Student, StudentService } from '../students/student.service';
import { GroupView } from './person-views';
import { PickList, PickSection } from './pick-list';

interface Model {
  name: string;
  color: GroupColor;
  studentIds: string[];
}

/**
 * Group card, opened on the NavStack. An existing group opens for reading (GroupView: avatar,
 * members, events) with Edit at the top; Edit → the form (name, color, members; Save, Cancel or
 * back return to reading). A new one, or one opened with `edit`, starts in the form.
 */
@Component({
  selector: 'app-group-editor',
  imports: [FormsModule, GroupView, Icon, PageSheet, PickList, Section, TranslatePipe],
  template: `
    @let m = model();
    <app-page-sheet
      #page
      [actions]="editing()"
      [dirty]="editing() && dirty()"
      [canSave]="canSave()"
      [deletable]="editing() && !!entry().id"
      [cancelCloses]="!editing() || !startedReading"
      (cancel)="cancelEdit()"
      (save)="save()"
      (delete)="remove()"
      (closed)="closed.emit()"
    >
      <!-- Top bar (reading): Edit -->
      @if (!editing() && !entry().readOnly) {
        <button barEnd type="button" (click)="editing.set(true)" class="btn-white">{{ 'action.edit' | t }}</button>
      }

      @if (!editing()) {
        @if (saved(); as g) {
          <app-group-view [group]="g" />
        }
      } @else {
      <div class="flex flex-col gap-4">
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

        <!-- Members: × removes from the group -->
        <app-section [title]="'groups.members' | t" [count]="members().length" key="members">
          <div class="card">
            @for (s of members(); track s.id) {
              <div class="list-row py-2">
                <div class="flex min-w-0 flex-1 items-center gap-3">
                  <span class="avatar">{{ initial(s.name) }}</span>
                  <p class="min-w-0 flex-1 truncate">{{ s.name }}</p>
                </div>
                <button type="button" (click)="toggle(s.id)" [attr.aria-label]="'action.delete' | t" class="icon-plain -mr-2">
                  <app-icon name="close" class="size-4" />
                </button>
              </div>
            }
            <button #addMembersRow type="button" (click)="pickingMembers.set(true)" [disabled]="!allStudents().length" class="edit-only list-row add-row">
              <span class="flex items-center gap-2 font-medium">
                <app-icon name="plus" class="size-5" />
                {{ 'groups.addMembers' | t }}
              </span>
            </button>
          </div>
        </app-section>
      </div>
      }
    </app-page-sheet>

    <!-- Member picker: every student with a check -->
    @if (pickingMembers()) {
      <!-- The same picker as an event's Invite: a page on phones (‹ and ✓ at the top), a dropdown
           under Add members on desktop -->
      <app-pick-list
        [title]="'groups.members' | t"
        [sections]="memberSections()"
        [selected]="m.studentIds"
        (selectedChange)="patch({ studentIds: $event })"
        [origin]="addMembersRow()?.nativeElement ?? null"
        (closed)="pickingMembers.set(false)"
      />
    }
  `,
})
export class GroupEditor implements OnInit {
  readonly entry = input.required<StackEntry>();
  readonly closed = output<void>();

  // Opened for reading (an existing group without `edit`): Save / Cancel return to reading.
  protected startedReading = false;
  protected readonly editing = signal(false);

  private groups = inject(GroupService);
  private students = inject(StudentService);
  private i18n = inject(I18nService);
  private readonly page = viewChild.required<PageSheet>('page');
  // Add members (inside the form's block): the member picker opens under it on desktop.
  protected readonly addMembersRow = viewChild<ElementRef<HTMLElement>>('addMembersRow');

  protected readonly colors = GROUP_COLORS;
  protected readonly colorVar = colorVar;
  protected readonly pickingMembers = signal(false);

  protected readonly model = signal<Model>({ name: '', color: GROUP_COLORS[0], studentIds: [] });
  private readonly snapshot = signal(''); // contents when opened, to tell whether anything changed

  protected readonly saved = computed(() => this.groups.groups().find((g) => g.id === this.entry().id) ?? null);
  protected readonly dirty = computed(() => GroupEditor.key(this.model()) !== this.snapshot());

  // What "changed" compares: members as a set (removing someone and adding them back is no change).
  private static key(m: Model): string {
    return JSON.stringify({ ...m, studentIds: [...m.studentIds].sort() });
  }
  protected readonly canSave = computed(() => !!this.model().name.trim() && this.dirty());

  private readonly byName = (a: Student, b: Student) => a.name.localeCompare(b.name, this.i18n.locale());
  protected readonly allStudents = computed(() => [...this.students.students()].sort(this.byName));
  protected readonly memberSections = computed<PickSection[]>(() => [
    { key: 'nav.students', items: this.allStudents().map((s) => ({ id: s.id, name: s.name })) },
  ]);
  protected readonly members = computed(() =>
    this.allStudents().filter((s) => this.model().studentIds.includes(s.id)),
  );

  ngOnInit(): void {
    this.startedReading = !!this.entry().id && !this.entry().edit;
    this.editing.set(!this.startedReading);
    if (this.saved()) {
      this.reset();
    } else {
      // New: first color not used yet; members pre-selected from the students list. Counts as
      // unsaved, so a group made from a selection can be saved right after naming it.
      const used = new Set(this.groups.groups().map((x) => x.color));
      const color = GROUP_COLORS.find((c) => !used.has(c)) ?? GROUP_COLORS[0];
      const studentIds = this.entry().studentIds ?? [];
      this.model.set({ name: '', color, studentIds });
    }
  }

  // The form back to the stored group.
  private reset(): void {
    const g = this.saved();
    if (!g) return;
    this.model.set({ name: g.name, color: g.color, studentIds: [...g.studentIds] });
    this.snapshot.set(GroupEditor.key(this.model()));
  }

  protected cancelEdit(): void {
    this.reset();
    this.editing.set(false);
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
    if (this.startedReading) {
      this.snapshot.set(GroupEditor.key(this.model()));
      this.editing.set(false);
    } else {
      this.page().close();
    }
  }

  protected remove(): void {
    const id = this.entry().id;
    if (!id) return;
    this.groups.remove(id);
    this.page().close();
  }
}
