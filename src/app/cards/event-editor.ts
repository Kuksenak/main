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
import { initial } from '../core/utils/text';
import {
  fromDateInput,
  minToTime,
  timeToMin,
  toDateInput,
  toTimeInput,
} from '../core/utils/time';
import { EVENT_STATUSES, EventService, EventStatus, statusKey } from '../schedule/event.service';
import { GroupService, colorVar } from '../students/group.service';
import { StudentService } from '../students/student.service';
import { InvitePicker, Invitees } from './invite-picker';

interface Model {
  title: string;
  invitees: Invitees;
  date: string; // yyyy-MM-dd
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  note: string;
  status: EventStatus;
}

/** Event card (new or existing), opened on the NavStack. */
@Component({
  selector: 'app-event-editor',
  imports: [FormsModule, DateField, Icon, InvitePicker, PageSheet, SelectField, TimeField, TranslatePipe],
  template: `
    @let m = model();
    <app-page-sheet
      #page
      [title]="(entry().id ? 'event.edit' : 'event.new') | t"
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
            <input name="title" [ngModel]="m.title" (ngModelChange)="patch({ title: $event })" type="text" [placeholder]="'event.title' | t" autocomplete="off" class="row-input" />
          </div>
        </div>

        <!-- Invited groups and students (a tap opens their card on top), then Invite -->
        <div class="card">
          @for (p of invited(); track p.id) {
            <button type="button" (click)="stack.push({ kind: p.kind, id: p.id })" class="list-row w-full py-2 text-left">
              <span class="avatar" [class.text-[var(--accent-fg)]]="!!p.color" [style.background]="p.color">{{ initial(p.name) }}</span>
              <p class="min-w-0 flex-1 truncate">{{ p.name }}</p>
              <app-icon name="chevron-right" class="row-chevron" />
            </button>
          }
          <button #inviteRow type="button" (click)="picking.set(true)" class="list-row w-full text-left text-[var(--accent)]">
            <span>{{ 'event.invite' | t }}</span>
            <app-icon name="plus" class="size-5" />
          </button>
        </div>

        <div class="card">
          <div class="list-row">
            <span>{{ 'event.starts' | t }}</span>
            <div class="ml-auto flex items-center gap-2">
              <app-date [ngModel]="date()" (ngModelChange)="setDate($event)" [ngModelOptions]="{ standalone: true }" />
              <app-time [ngModel]="m.startTime" (ngModelChange)="onStartChange($event)" [ngModelOptions]="{ standalone: true }" />
            </div>
          </div>
          <div class="list-row">
            <span>{{ 'event.ends' | t }}</span>
            <div class="ml-auto flex items-center gap-2">
              <!-- End before start: warning orange -->
              <span [class.opacity-60]="!invalid()" [class.text-[var(--warning)]]="invalid()" [class.line-through]="invalid()">{{ dateLabel() }}</span>
              <app-time [ngModel]="m.endTime" (ngModelChange)="patch({ endTime: $event })" [ngModelOptions]="{ standalone: true }" />
            </div>
          </div>
          @if (entry().id) {
            <div class="list-row">
              <span>{{ 'event.status' | t }}</span>
              <app-select class="ml-auto" [options]="statusOptions()" [ngModel]="m.status" (ngModelChange)="patch({ status: $event })" [ngModelOptions]="{ standalone: true }" />
            </div>
          }
        </div>

        <div class="card">
          <div class="list-row py-3 desktop:py-2">
            <textarea name="note" [ngModel]="m.note" (ngModelChange)="patch({ note: $event })" rows="2" [placeholder]="'event.note' | t" autocomplete="off" class="row-input resize-y leading-snug"></textarea>
          </div>
        </div>
      </div>
    </app-page-sheet>

    @if (picking()) {
      <app-invite-picker [value]="m.invitees" (valueChange)="patch({ invitees: $event })" [origin]="inviteOrigin()" (closed)="picking.set(false)" />
    }
  `,
})
export class EventEditor implements OnInit {
  readonly entry = input.required<StackEntry>();
  readonly closed = output<void>();

  private events = inject(EventService);
  private groups = inject(GroupService);
  private students = inject(StudentService);
  private i18n = inject(I18nService);
  protected stack = inject(NavStack);

  private readonly page = viewChild.required<PageSheet>('page');
  private readonly inviteRow = viewChild<ElementRef<HTMLElement>>('inviteRow');
  protected readonly inviteOrigin = computed(() => this.inviteRow()?.nativeElement ?? null);

  protected readonly picking = signal(false);
  protected readonly model = signal<Model>(this.blank());
  // Contents when the card opened, to tell whether anything changed.
  private readonly snapshot = signal('');

  protected readonly statusOptions = computed<SelectOption[]>(() =>
    EVENT_STATUSES.map((s) => ({ label: this.i18n.t(statusKey(s)), value: s })),
  );

  // Invited groups, then students, each with its name and color.
  protected readonly invited = computed(() => {
    const { groupIds, studentIds } = this.model().invitees;
    return [
      ...groupIds.map((id) => {
        const g = this.groups.byId(id);
        return g && { kind: 'group' as const, id, name: g.name, color: colorVar(g.color) as string | null };
      }),
      ...studentIds.map((id) => {
        const s = this.students.byId(id);
        return s && { kind: 'student' as const, id, name: s.name, color: null };
      }),
    ].filter((p) => !!p);
  });

  protected readonly date = computed(() => fromDateInput(this.model().date));
  protected readonly dateLabel = computed(() =>
    this.i18n.date(this.date(), { weekday: 'short', month: 'short', day: 'numeric' }),
  );
  protected readonly invalid = computed(
    () => timeToMin(this.model().endTime) <= timeToMin(this.model().startTime),
  );
  protected readonly dirty = computed(() => JSON.stringify(this.model()) !== this.snapshot());
  // Save a valid event with a title or someone invited, that differs from what was opened.
  protected readonly canSave = computed(() => {
    const m = this.model();
    const named = !!m.title.trim() || !!m.invitees.studentIds.length || !!m.invitees.groupIds.length;
    return named && !this.invalid() && this.dirty();
  });

  ngOnInit(): void {
    const e = this.entry();
    const event = e.id ? this.events.events().find((x) => x.id === e.id) : undefined;
    if (event) {
      const start = new Date(event.startsAt);
      this.model.set({
        title: event.title ?? '',
        invitees: { studentIds: event.studentIds, groupIds: event.groupIds },
        date: toDateInput(start),
        startTime: toTimeInput(start),
        endTime: minToTime(timeToMin(toTimeInput(start)) + event.durationMinutes),
        note: event.note ?? '',
        status: event.status,
      });
    } else if (e.date) {
      this.model.set({ ...this.blank(), date: e.date });
    }
    this.snapshot.set(JSON.stringify(this.model()));
  }

  private blank(): Model {
    return {
      title: '',
      invitees: { studentIds: [], groupIds: [] },
      date: toDateInput(new Date()),
      startTime: '18:00',
      endTime: '19:00',
      note: '',
      status: 'Scheduled',
    };
  }

  protected initial(name: string): string {
    return initial(name, this.i18n.locale());
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
      title: m.title.trim() || null,
      studentIds: m.invitees.studentIds,
      groupIds: m.invitees.groupIds,
      startsAt: new Date(`${m.date}T${m.startTime}`).toISOString(),
      durationMinutes: timeToMin(m.endTime) - timeToMin(m.startTime),
      note: m.note.trim() || null,
      status: m.status,
    };
    if (id) this.events.update(id, input);
    else this.events.create(input);
    this.page().close();
  }

  protected remove(): void {
    const id = this.entry().id;
    if (!id) return;
    this.events.remove(id);
    this.page().close();
  }
}
