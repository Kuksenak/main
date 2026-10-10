import { Component, OnInit, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { StackEntry } from '../core/services/nav-stack.service';
import { PageSheet } from '../core/ui/page-sheet/page-sheet';
import { StudentInput, StudentService } from '../students/student.service';
import { PersonLessons, StudentView } from './person-views';

/**
 * Student card, opened on the NavStack. An existing student opens for reading (StudentView, like
 * an iOS contact) with Edit at the top; Edit and History › each open their own page on top of
 * it (the form: Save / Cancel / back return to the card; the full list of lessons). A new
 * student, or one opened with `edit` (desktop's Edit), is just the form.
 */
@Component({
  selector: 'app-student-editor',
  imports: [FormsModule, PageSheet, PersonLessons, StudentView, TranslatePipe],
  template: `
    @let m = model();
    @if (startedReading) {
      <!-- The card -->
      <app-page-sheet #page [actions]="false" (closed)="closed.emit()">
        @if (!entry().readOnly) {
          <button barEnd type="button" (click)="openForm()" class="btn-white">{{ 'action.edit' | t }}</button>
        }
        @if (saved(); as s) {
          <app-student-view [student]="s" [editable]="!entry().readOnly" (upcoming)="listOpen.set('upcoming')" (history)="listOpen.set('history')">
            <!-- Desktop dialogs have no top bar: Edit in the header row -->
            @if (!entry().readOnly) {
              <ng-container ngProjectAs="[headerEnd]">
                <button type="button" (click)="openForm()" class="btn-secondary shrink-0 mobile:hidden">{{ 'action.edit' | t }}</button>
              </ng-container>
            }
          </app-student-view>
        }
      </app-page-sheet>

      <!-- Upcoming / History: every lesson ahead / behind, its own page -->
      @if (listOpen() && saved(); as s) {
        <app-page-sheet [title]="(listOpen() === 'upcoming' ? 'students.upcoming' : 'people.history') | t" [actions]="false" (closed)="listOpen.set(null)">
          <app-person-lessons
            [studentId]="s.id"
            [showNext]="false"
            [showUpcoming]="listOpen() === 'upcoming'"
            [showPast]="listOpen() === 'history'"
            [showMaterials]="false"
            [listLabels]="false"
          />
        </app-page-sheet>
      }
    }

    <!-- The form: its own page (on top of the card, or the whole card for a new student) -->
    @if (!startedReading || editing()) {
      <app-page-sheet
        #form
        [dirty]="dirty()"
        [canSave]="canSave()"
        [deletable]="!!entry().id"
        (save)="save()"
        (delete)="remove()"
        (closed)="formClosed()"
      >
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
      </app-page-sheet>
    }
  `,
})
export class StudentEditor implements OnInit {
  readonly entry = input.required<StackEntry>();
  readonly closed = output<void>();

  private students = inject(StudentService);
  private readonly page = viewChild<PageSheet>('page');
  private readonly form = viewChild<PageSheet>('form');

  // Opened for reading (an existing student without `edit`): the form opens on top of the card.
  protected startedReading = false;
  protected readonly editing = signal(false);
  protected readonly listOpen = signal<'upcoming' | 'history' | null>(null);
  private deleted = false;

  protected readonly model = signal<StudentInput>({ name: '', email: '', phone: '' });
  private readonly snapshot = signal(''); // contents when the form opened, to tell whether anything changed

  // The stored student (existing cards only).
  protected readonly saved = computed(() => this.students.students().find((s) => s.id === this.entry().id) ?? null);
  protected readonly dirty = computed(() => JSON.stringify(this.model()) !== this.snapshot());
  protected readonly canSave = computed(() => !!this.model().name.trim() && this.dirty());

  ngOnInit(): void {
    this.startedReading = !!this.entry().id && !this.entry().edit;
    this.reset();
  }

  // The form back to the stored student.
  private reset(): void {
    const s = this.saved();
    this.model.set(s ? { name: s.name, email: s.email, phone: s.phone } : { name: '', email: '', phone: '' });
    this.snapshot.set(JSON.stringify(this.model()));
  }

  protected openForm(): void {
    this.reset();
    this.editing.set(true);
  }

  protected patch(p: Partial<StudentInput>): void {
    this.model.update((m) => ({ ...m, ...p }));
  }

  // The form's page is gone: back to the card (or, without one, the card closes too).
  protected formClosed(): void {
    this.editing.set(false);
    if (!this.startedReading) this.closed.emit();
    else if (this.deleted) this.page()?.close();
  }

  protected save(): void {
    if (!this.canSave()) return;
    const m = this.model();
    const input = { name: m.name.trim(), email: m.email?.trim() || null, phone: m.phone?.trim() || null };
    const id = this.entry().id;
    if (id) this.students.update(id, input);
    else this.students.create(input);
    this.snapshot.set(JSON.stringify(this.model())); // saved: closing doesn't ask
    this.form()?.close();
  }

  protected remove(): void {
    const id = this.entry().id;
    if (!id) return;
    this.students.remove(id); // also drops them from their groups (server side)
    this.deleted = true;
    this.form()?.close();
  }
}
