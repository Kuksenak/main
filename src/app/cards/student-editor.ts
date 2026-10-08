import { Component, OnInit, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { StackEntry } from '../core/services/nav-stack.service';
import { PageSheet } from '../core/ui/page-sheet/page-sheet';
import { StudentInput, StudentService } from '../students/student.service';
import { LessonList } from './lesson-list';
import { StudentGroups } from './related-lists';

/** Student card (new or existing), opened on the NavStack: contacts, groups, lessons. */
@Component({
  selector: 'app-student-editor',
  imports: [FormsModule, LessonList, PageSheet, StudentGroups, TranslatePipe],
  template: `
    @let m = model();
    <app-page-sheet
      #page
      [title]="(entry().id ? 'students.edit' : 'students.new') | t"
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
            <input name="name" [ngModel]="m.name" (ngModelChange)="patch({ name: $event })" type="text" [placeholder]="'students.name' | t" autocomplete="off" class="row-input" />
          </div>
          <div class="list-row">
            <input name="email" [ngModel]="m.email" (ngModelChange)="patch({ email: $event })" type="email" inputmode="email" [placeholder]="'students.email' | t" autocomplete="off" class="row-input" />
          </div>
          <div class="list-row">
            <input name="phone" [ngModel]="m.phone" (ngModelChange)="patch({ phone: $event })" type="tel" inputmode="tel" [placeholder]="'students.phone' | t" autocomplete="off" class="row-input" />
          </div>
        </div>

        @if (saved(); as s) {
          <app-student-groups [studentId]="s.id" />
          <app-lesson-list [studentId]="s.id" />
        }
      </div>
    </app-page-sheet>
  `,
})
export class StudentEditor implements OnInit {
  readonly entry = input.required<StackEntry>();
  readonly closed = output<void>();

  private students = inject(StudentService);
  private readonly page = viewChild.required<PageSheet>('page');

  protected readonly model = signal<StudentInput>({ name: '', email: '', phone: '' });
  private readonly snapshot = signal(''); // contents when opened, to tell whether anything changed

  // The stored student (existing cards only) — its groups and lessons are listed below.
  protected readonly saved = computed(() => this.students.students().find((s) => s.id === this.entry().id) ?? null);
  protected readonly dirty = computed(() => JSON.stringify(this.model()) !== this.snapshot());
  protected readonly canSave = computed(() => !!this.model().name.trim() && this.dirty());

  ngOnInit(): void {
    const s = this.saved();
    if (s) this.model.set({ name: s.name, email: s.email, phone: s.phone });
    this.snapshot.set(JSON.stringify(this.model()));
  }

  protected patch(p: Partial<StudentInput>): void {
    this.model.update((m) => ({ ...m, ...p }));
  }

  protected save(): void {
    if (!this.canSave()) return;
    const m = this.model();
    const input = { name: m.name.trim(), email: m.email?.trim() || null, phone: m.phone?.trim() || null };
    const id = this.entry().id;
    if (id) this.students.update(id, input);
    else this.students.create(input);
    this.page().close();
  }

  protected remove(): void {
    const id = this.entry().id;
    if (!id) return;
    this.students.remove(id); // also drops them from their groups (server side)
    this.page().close();
  }
}
