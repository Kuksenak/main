import { Component, ElementRef, OnInit, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { NavStack, StackEntry } from '../core/services/nav-stack.service';
import { DateField } from '../core/ui/date/date';
import { Icon } from '../core/ui/icon/icon';
import { PageSheet } from '../core/ui/page-sheet/page-sheet';
import { SelectField, SelectOption } from '../core/ui/select/select';
import { TimeField } from '../core/ui/time/time';
import {
  fromDateInput,
  minToTime,
  timeToMin,
  toDateInput,
  toTimeInput,
} from '../core/utils/time';
import { LessonTitleStore } from '../schedule/lesson-title.store';
import { LESSON_STATUSES, LessonService, LessonStatus, statusKey } from '../schedule/lesson.service';
import { GroupService } from '../students/group.service';
import { StudentService } from '../students/student.service';
import { WhoPicker } from './who-picker';

interface Model {
  title: string; // stored on this device (LessonTitleStore)
  who: string; // group or student name (lessons store who they're for by name)
  date: string; // yyyy-MM-dd
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  note: string;
  status: LessonStatus;
}

/** Lesson card (new or existing), opened on the NavStack. */
@Component({
  selector: 'app-lesson-editor',
  imports: [FormsModule, DateField, Icon, PageSheet, SelectField, TimeField, TranslatePipe, WhoPicker],
  template: `
    @let m = model();
    <app-page-sheet
      #page
      [title]="(entry().id ? 'lesson.edit' : 'lesson.new') | t"
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
            <input name="title" [ngModel]="m.title" (ngModelChange)="patch({ title: $event })" type="text" [placeholder]="'lesson.title' | t" autocomplete="off" class="row-input" />
          </div>
          <!-- Who: opens the picker; › opens that group's / student's card on top -->
          <div class="list-row !gap-1">
            <button #whoRow type="button" (click)="picking.set(true)" class="flex min-w-0 flex-1 items-center gap-3 self-stretch text-left">
              <span>{{ 'lesson.who' | t }}</span>
              <span class="ml-auto truncate" [class.opacity-40]="!m.who">{{ m.who || ('picker.select' | t) }}</span>
            </button>
            @if (whoLink(); as link) {
              <button type="button" (click)="stack.push(link)" [attr.aria-label]="'lesson.openStudent' | t" class="icon-plain -mr-2">
                <app-icon name="chevron-right" class="row-chevron !opacity-100" />
              </button>
            } @else {
              <app-icon name="chevrons-up-down" class="size-5 opacity-40" />
            }
          </div>
        </div>

        <div class="card">
          <div class="list-row">
            <span>{{ 'lesson.starts' | t }}</span>
            <div class="ml-auto flex items-center gap-2">
              <app-date [ngModel]="date()" (ngModelChange)="setDate($event)" [ngModelOptions]="{ standalone: true }" />
              <app-time [ngModel]="m.startTime" (ngModelChange)="onStartChange($event)" [ngModelOptions]="{ standalone: true }" />
            </div>
          </div>
          <div class="list-row">
            <span>{{ 'lesson.ends' | t }}</span>
            <div class="ml-auto flex items-center gap-2">
              <!-- End before start: warning orange -->
              <span [class.opacity-60]="!invalid()" [class.text-[var(--warning)]]="invalid()" [class.line-through]="invalid()">{{ dateLabel() }}</span>
              <app-time [ngModel]="m.endTime" (ngModelChange)="patch({ endTime: $event })" [ngModelOptions]="{ standalone: true }" />
            </div>
          </div>
          @if (entry().id) {
            <div class="list-row">
              <span>{{ 'lesson.status' | t }}</span>
              <app-select class="ml-auto" [options]="statusOptions()" [ngModel]="m.status" (ngModelChange)="patch({ status: $event })" [ngModelOptions]="{ standalone: true }" />
            </div>
          }
        </div>

        <div class="card">
          <div class="list-row py-3 desktop:py-2">
            <textarea name="note" [ngModel]="m.note" (ngModelChange)="patch({ note: $event })" rows="2" [placeholder]="'lesson.note' | t" autocomplete="off" class="row-input resize-y leading-snug"></textarea>
          </div>
        </div>
      </div>
    </app-page-sheet>

    @if (picking()) {
      <app-who-picker [value]="m.who" [origin]="whoOrigin()" (picked)="patch({ who: $event })" (closed)="picking.set(false)" />
    }
  `,
})
export class LessonEditor implements OnInit {
  readonly entry = input.required<StackEntry>();
  readonly closed = output<void>();

  private lessons = inject(LessonService);
  private titles = inject(LessonTitleStore);
  private groups = inject(GroupService);
  private students = inject(StudentService);
  private i18n = inject(I18nService);
  protected stack = inject(NavStack);

  private readonly page = viewChild.required<PageSheet>('page');
  private readonly whoRow = viewChild<ElementRef<HTMLElement>>('whoRow');
  protected readonly whoOrigin = computed(() => this.whoRow()?.nativeElement ?? null);

  protected readonly picking = signal(false);
  protected readonly model = signal<Model>(this.blank());
  // Contents when the card opened, to tell whether anything changed.
  private readonly snapshot = signal('');

  protected readonly statusOptions = computed<SelectOption[]>(() =>
    LESSON_STATUSES.map((s) => ({ label: this.i18n.t(statusKey(s)), value: s })),
  );

  protected readonly date = computed(() => fromDateInput(this.model().date));
  protected readonly dateLabel = computed(() =>
    this.i18n.date(this.date(), { weekday: 'short', month: 'short', day: 'numeric' }),
  );
  protected readonly invalid = computed(
    () => timeToMin(this.model().endTime) <= timeToMin(this.model().startTime),
  );
  protected readonly dirty = computed(() => JSON.stringify(this.model()) !== this.snapshot());
  // Save only a valid lesson for someone that actually differs from what was opened.
  protected readonly canSave = computed(() => !!this.model().who.trim() && !this.invalid() && this.dirty());

  // The group / student card to open from the Who row (null for names typed by hand).
  protected readonly whoLink = computed<Omit<StackEntry, 'key'> | null>(() => {
    const who = this.model().who;
    const group = this.groups.byName(who);
    if (group) return { kind: 'group', id: group.id };
    const student = this.students.students().find((s) => s.name === who);
    return student ? { kind: 'student', id: student.id } : null;
  });

  ngOnInit(): void {
    const e = this.entry();
    const lesson = e.id ? this.lessons.lessons().find((l) => l.id === e.id) : undefined;
    if (lesson) {
      const start = new Date(lesson.startsAt);
      this.model.set({
        title: this.titles.get(lesson.id),
        who: lesson.studentName,
        date: toDateInput(start),
        startTime: toTimeInput(start),
        endTime: minToTime(timeToMin(toTimeInput(start)) + lesson.durationMinutes),
        note: lesson.note ?? '',
        status: lesson.status,
      });
    } else if (e.date) {
      this.model.set({ ...this.blank(), date: e.date });
    }
    this.snapshot.set(JSON.stringify(this.model()));
  }

  private blank(): Model {
    return {
      title: '',
      who: '',
      date: toDateInput(new Date()),
      startTime: '18:00',
      endTime: '19:00',
      note: '',
      status: 'Scheduled',
    };
  }

  protected patch(p: Partial<Model>): void {
    this.model.update((m) => ({ ...m, ...p }));
  }

  protected setDate(date: Date | null): void {
    if (date) this.patch({ date: toDateInput(date) });
  }

  // Changing the start keeps the previous duration and shifts the end along.
  protected onStartChange(value: string): void {
    const m = this.model();
    const duration = Math.max(0, timeToMin(m.endTime) - timeToMin(m.startTime));
    this.patch({ startTime: value, endTime: minToTime(timeToMin(value) + duration) });
  }

  protected save(): void {
    if (!this.canSave()) return;
    const m = this.model();
    const id = this.entry().id;
    const input = {
      studentName: m.who.trim(),
      startsAt: new Date(`${m.date}T${m.startTime}`).toISOString(),
      durationMinutes: timeToMin(m.endTime) - timeToMin(m.startTime),
      note: m.note.trim() || null,
      status: m.status,
    };
    const title = m.title.trim();
    if (id) {
      this.titles.set(id, title);
      this.lessons.update(id, input);
    } else {
      this.lessons.create(input, (newId) => this.titles.set(newId, title));
    }
    this.page().close();
  }

  protected remove(): void {
    const id = this.entry().id;
    if (!id) return;
    this.lessons.remove(id);
    this.titles.remove(id);
    this.page().close();
  }
}
