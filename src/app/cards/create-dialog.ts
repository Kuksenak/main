import { Component, DestroyRef, ElementRef, Injectable, afterNextRender, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { EscStack } from '../core/ui/esc-stack';
import { LessonService } from '../lessons/lesson.service';
import { StudentService } from '../students/student.service';

/**
 * Making a student or a page from an add field (as Notion Calendar's Create page): a small dialog —
 * a student's name or a page's title (what was typed); Create makes it, and `created`
 * gives its id (added where it was asked).
 */
@Component({
  selector: 'app-create-dialog',
  imports: [TranslatePipe],
  template: `
    <div class="fixed inset-0 z-[2400] flex items-start justify-center bg-[var(--backdrop)] pt-[16vh] [animation:fadeIn_150ms_ease-out]" (mousedown)="closed.emit()">
      <form class="dialog-panel flex w-[26rem] flex-col gap-4 !rounded-xl p-5" (mousedown)="$event.stopPropagation()" (submit)="$event.preventDefault(); create()">
        <!-- (the name / title big and plain, as the event's title; what it's for under it) -->
        <div class="flex flex-col gap-1">
          <input #nameInput [value]="name()" (input)="name.set(nameInput.value)" [placeholder]="(kind() === 'page' ? 'event.newLesson' : 'sidebar.newStudent') | t" autocomplete="off" class="w-full bg-transparent text-[1.25rem] font-semibold outline-none placeholder:opacity-30" />
          @if (hint()) {
            <p class="text-[0.8125rem] opacity-55">{{ hint() }}</p>
          }
        </div>
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
  protected readonly busy = signal(false);
  protected readonly canCreate = computed(() => !!this.name().trim() && !this.busy());
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
    else this.students.create({ name, email: null, phone: null }, done, failed);
  }
}

/** Opens the create dialog from anywhere (the layout shows it): a new student / page, then `onCreated`. */
@Injectable({ providedIn: 'root' })
export class CreateService {
  readonly current = signal<{ kind: 'student' | 'page'; hint: string; onCreated?: (id: string) => void } | null>(null);

  open(kind: 'student' | 'page', hint = '', onCreated?: (id: string) => void): void {
    this.current.set({ kind, hint, onCreated });
  }

  close(): void {
    this.current.set(null);
  }
}
