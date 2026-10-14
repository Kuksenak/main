import { Component, DestroyRef, ElementRef, afterNextRender, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { EscStack } from '../core/ui/esc-stack';
import { emailOk } from '../core/utils/text';
import { LessonService } from '../lessons/lesson.service';
import { StudentService } from '../students/student.service';

/**
 * Making a student or a page from an add field (as Notion Calendar's Create page): a small dialog —
 * a student's name (what was typed) and email, a page's title; Create makes it, and `created`
 * gives its id (added where it was asked).
 */
@Component({
  selector: 'app-create-dialog',
  imports: [TranslatePipe],
  template: `
    <div class="fixed inset-0 z-[2400] flex items-start justify-center bg-[var(--backdrop)] pt-[16vh] [animation:fadeIn_150ms_ease-out]" (mousedown)="closed.emit()">
      <form class="dialog-panel flex w-[26rem] flex-col gap-4 !rounded-xl p-6" (mousedown)="$event.stopPropagation()" (submit)="$event.preventDefault(); create()">
        <div class="flex flex-col gap-1">
          <h2 class="text-[1.0625rem] font-semibold">{{ (kind() === 'page' ? 'event.newLesson' : 'sidebar.newStudent') | t }}</h2>
          <p class="text-[0.8125rem] opacity-55">{{ hint() }}</p>
        </div>
        <label class="flex flex-col gap-1.5">
          <span class="text-[0.8125rem] font-medium opacity-70">{{ (kind() === 'page' ? 'create.title' : 'newStudent.name') | t }}</span>
          <input #nameInput [value]="name()" (input)="name.set(nameInput.value)" autocomplete="off" class="h-9 rounded-md bg-[var(--tint)] px-2.5 text-[0.875rem] outline-none" />
        </label>
        @if (kind() === 'student') {
          <label class="flex flex-col gap-1.5">
            <span class="text-[0.8125rem] font-medium opacity-70">{{ 'students.email' | t }}</span>
            <input #emailInput type="email" [value]="email()" (input)="email.set(emailInput.value)" autocomplete="off" class="h-9 rounded-md bg-[var(--tint)] px-2.5 text-[0.875rem] outline-none" [class.text-[var(--danger)]]="!emailValid()" />
            @if (!emailValid()) {
              <span class="text-[0.75rem] text-[var(--danger)] opacity-80">{{ 'students.badEmail' | t }}</span>
            }
          </label>
        }
        <div class="flex items-center justify-end gap-2 pt-1">
          <button type="button" (click)="closed.emit()" class="head-btn">{{ 'action.cancel' | t }}</button>
          <button type="submit" [disabled]="!canCreate()" class="head-btn font-semibold disabled:opacity-30">{{ 'action.create' | t }}</button>
        </div>
      </form>
    </div>
  `,
})
export class CreateDialog {
  readonly kind = input<'student' | 'page'>('student');
  /** What was typed in the field: the name / title to start from. */
  readonly initialName = input('');
  /** The line under the title (e.g. "…added to this event"). */
  readonly hint = input('');
  readonly created = output<string>();
  readonly closed = output<void>();

  protected readonly name = signal('');
  protected readonly email = signal('');
  protected readonly busy = signal(false);
  protected readonly emailValid = computed(() => emailOk(this.email()));
  protected readonly canCreate = computed(() => !!this.name().trim() && this.emailValid() && !this.busy());
  private readonly students = inject(StudentService);
  private readonly lessons = inject(LessonService);
  private readonly nameInput = viewChild.required<ElementRef<HTMLInputElement>>('nameInput');

  constructor() {
    const off = inject(EscStack).push(() => this.closed.emit());
    inject(DestroyRef).onDestroy(off);
    afterNextRender(() => {
      this.name.set(this.initialName());
      this.nameInput().nativeElement.value = this.initialName();
      this.nameInput().nativeElement.focus();
    });
  }

  protected create(): void {
    const name = this.name().trim();
    if (!this.canCreate()) return;
    this.busy.set(true);
    const done = (id: string) => {
      this.created.emit(id);
      this.closed.emit();
    };
    const failed = () => this.busy.set(false);
    if (this.kind() === 'page') this.lessons.create({ title: name, blocks: [] }, done, failed);
    else this.students.create({ name, email: this.email().trim() || null, phone: null }, done, failed);
  }
}
