import { Component, OnInit, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { StackEntry } from '../core/services/nav-stack.service';
import { PageSheet } from '../core/ui/page-sheet/page-sheet';
import { StudentInput, StudentService } from '../students/student.service';
import { StudentView } from './person-views';

/**
 * Student card, opened on the NavStack. An existing student opens for reading (StudentView:
 * avatar, Email / Call, contacts, groups, events) with Edit at the top; Edit → the form (Save,
 * Cancel or back return to reading). A new one, or one opened with `edit`, starts in the form.
 */
@Component({
  selector: 'app-student-editor',
  imports: [FormsModule, PageSheet, StudentView, TranslatePipe],
  template: `
    @let m = model();
    <app-page-sheet
      #page
      [large]="!editing()"
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

      @if (editing()) {
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
      } @else if (saved(); as s) {
        <app-student-view [student]="s">
          <!-- Desktop dialogs have no top bar: Edit in the header row -->
          @if (!entry().readOnly) {
            <ng-container ngProjectAs="[headerEnd]">
              <button type="button" (click)="editing.set(true)" class="btn-secondary shrink-0 mobile:hidden">{{ 'action.edit' | t }}</button>
            </ng-container>
          }
        </app-student-view>
      }
    </app-page-sheet>
  `,
})
export class StudentEditor implements OnInit {
  readonly entry = input.required<StackEntry>();
  readonly closed = output<void>();

  private students = inject(StudentService);
  private readonly page = viewChild.required<PageSheet>('page');

  // Opened for reading (an existing student without `edit`): Save / Cancel return to reading.
  protected startedReading = false;
  protected readonly editing = signal(false);

  protected readonly model = signal<StudentInput>({ name: '', email: '', phone: '' });
  private readonly snapshot = signal(''); // contents when the form opened, to tell whether anything changed

  // The stored student (existing cards only).
  protected readonly saved = computed(() => this.students.students().find((s) => s.id === this.entry().id) ?? null);
  protected readonly dirty = computed(() => JSON.stringify(this.model()) !== this.snapshot());
  protected readonly canSave = computed(() => !!this.model().name.trim() && this.dirty());

  ngOnInit(): void {
    this.startedReading = !!this.entry().id && !this.entry().edit;
    this.editing.set(!this.startedReading);
    this.reset();
  }

  // The form back to the stored student.
  private reset(): void {
    const s = this.saved();
    this.model.set(s ? { name: s.name, email: s.email, phone: s.phone } : { name: '', email: '', phone: '' });
    this.snapshot.set(JSON.stringify(this.model()));
  }

  protected patch(p: Partial<StudentInput>): void {
    this.model.update((m) => ({ ...m, ...p }));
  }

  protected cancelEdit(): void {
    this.reset();
    this.editing.set(false);
  }

  protected save(): void {
    if (!this.canSave()) return;
    const m = this.model();
    const input = { name: m.name.trim(), email: m.email?.trim() || null, phone: m.phone?.trim() || null };
    const id = this.entry().id;
    if (id) this.students.update(id, input);
    else this.students.create(input);
    if (this.startedReading) {
      this.snapshot.set(JSON.stringify(this.model()));
      this.editing.set(false);
    } else {
      this.page().close();
    }
  }

  protected remove(): void {
    const id = this.entry().id;
    if (!id) return;
    this.students.remove(id); // also drops them from their groups (server side)
    this.page().close();
  }
}
