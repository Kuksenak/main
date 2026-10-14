import { Component, DestroyRef, ElementRef, afterNextRender, inject, input, output, signal, viewChild } from '@angular/core';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { EscStack } from '../core/ui/esc-stack';
import { StudentService } from '../students/student.service';

/**
 * A new student from an add field (as Notion Calendar's Create page): their name (what was
 * typed) and email; Create adds them, and `created` gives their id (added where it was asked).
 */
@Component({
  selector: 'app-new-student-dialog',
  imports: [TranslatePipe],
  template: `
    <div class="fixed inset-0 z-[2400] flex items-start justify-center bg-[var(--backdrop)] pt-[16vh] [animation:fadeIn_150ms_ease-out]" (mousedown)="closed.emit()">
      <form class="dialog-panel flex w-[26rem] flex-col gap-4 !rounded-xl p-6" (mousedown)="$event.stopPropagation()" (submit)="$event.preventDefault(); create()">
        <div class="flex flex-col gap-1">
          <h2 class="text-[1.0625rem] font-semibold">{{ 'sidebar.newStudent' | t }}</h2>
          <p class="text-[0.8125rem] opacity-55">{{ hint() }}</p>
        </div>
        <label class="flex flex-col gap-1.5">
          <span class="text-[0.8125rem] font-medium opacity-70">{{ 'newStudent.name' | t }}</span>
          <input #nameInput [value]="name()" (input)="name.set(nameInput.value)" autocomplete="off" class="h-9 rounded-md bg-[var(--tint-strong)] px-2.5 text-[0.875rem] outline-none" />
        </label>
        <label class="flex flex-col gap-1.5">
          <span class="text-[0.8125rem] font-medium opacity-70">{{ 'students.email' | t }}</span>
          <input #emailInput type="email" [value]="email()" (input)="email.set(emailInput.value)" autocomplete="off" class="h-9 rounded-md border border-[var(--separator)] bg-transparent px-2.5 text-[0.875rem] outline-none focus:bg-[var(--tint)]" />
        </label>
        <div class="flex items-center justify-end gap-2 pt-1">
          <button type="button" (click)="closed.emit()" class="head-btn">{{ 'action.cancel' | t }}</button>
          <button type="submit" [disabled]="!name().trim() || busy()" class="head-btn font-semibold disabled:opacity-30">{{ 'action.create' | t }}</button>
        </div>
      </form>
    </div>
  `,
})
export class NewStudentDialog {
  /** What was typed in the field: the name to start from. */
  readonly initialName = input('');
  /** The line under the title (e.g. "…and add them to the event"). */
  readonly hint = input('');
  readonly created = output<string>();
  readonly closed = output<void>();

  protected readonly name = signal('');
  protected readonly email = signal('');
  protected readonly busy = signal(false);
  private readonly students = inject(StudentService);
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
    if (!name || this.busy()) return;
    this.busy.set(true);
    this.students.create(
      { name, email: this.email().trim() || null, phone: null },
      (id) => {
        this.created.emit(id);
        this.closed.emit();
      },
      () => this.busy.set(false),
    );
  }
}
