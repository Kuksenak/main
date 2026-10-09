import { Component, OnInit, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { DeviceDetectionService } from '../core/services/device-detection.service';
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
import { EVENT_STATUSES, EVENT_TYPES, EventService, EventStatus, EventType, statusKey } from '../schedule/event.service';
import { LessonService } from '../lessons/lesson.service';
import { GroupService, colorVar } from '../students/group.service';
import { StudentService } from '../students/student.service';
import { PickList, PickSection } from './pick-list';

/** Who an event is for: any number of groups and students. */
interface Invitees {
  studentIds: string[];
  groupIds: string[];
}

interface Model {
  type: EventType;
  title: string;
  invitees: Invitees;
  lessonIds: string[];
  date: string; // yyyy-MM-dd
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  note: string;
  status: EventStatus;
}

/** Event card (new or existing), opened on the NavStack. */
@Component({
  selector: 'app-event-editor',
  imports: [FormsModule, DateField, Icon, PageSheet, PickList, SelectField, TimeField, TranslatePipe],
  template: `
    @let m = model();
    <app-page-sheet
      #page
      [actions]="!readOnly()"
      [title]="(entry().id ? 'event.edit' : 'event.new') | t"
      [dirty]="dirty()"
      [canSave]="canSave()"
      [deletable]="!!entry().id"
      (save)="save()"
      (delete)="remove()"
      (closed)="closed.emit()"
    >
      <div class="contents" [class.read-only]="readOnly()">
      <div class="flex flex-col gap-6">
        <!-- Class | Event: only a class has participants and materials -->
        <div class="segmented">
          @for (t of types; track t) {
            <button type="button" (click)="patch({ type: t })" [attr.aria-pressed]="m.type === t">{{ typeKey(t) | t }}</button>
          }
        </div>

        <div class="card">
          <div class="list-row">
            <input name="title" [ngModel]="m.title" (ngModelChange)="patch({ title: $event })" type="text" [placeholder]="'event.title' | t" autocomplete="off" class="row-input" />
          </div>
        </div>

        @if (m.type === 'Class') {
        <!-- Participants: groups and students (a tap opens their card on top), then Invite -->
        <div class="flex flex-col gap-1.5">
        <span class="text-footnote px-4 uppercase opacity-50">{{ 'event.participants' | t }}</span>
        <div class="card">
          <!-- A row opens the card; × takes them out of the event -->
          @for (p of invited(); track p.id) {
            <div class="list-row !gap-1 py-2">
              <button type="button" (click)="stack.push({ kind: p.kind, id: p.id })" class="flex min-w-0 flex-1 items-center gap-3 self-stretch text-left">
                <span class="avatar" [class.text-[var(--accent-fg)]]="!!p.color" [style.background]="p.color">{{ initial(p.name) }}</span>
                <p class="min-w-0 flex-1 truncate">{{ p.name }}</p>
              </button>
              <button type="button" (click)="uninvite(p.id)" [attr.aria-label]="'action.remove' | t" class="edit-only icon-plain -mr-2">
                <app-icon name="close" class="size-5" />
              </button>
            </div>
          }
          <button #inviteRow type="button" (click)="openPicker('invite', inviteRow)" class="edit-only list-row w-full text-left text-[var(--accent)]">
            <span>{{ 'event.invite' | t }}</span>
            <!-- In the same box as the rows' ×, so they line up -->
            <span class="icon-plain -mr-2 !text-current"><app-icon name="plus" class="size-5" /></span>
          </button>
        </div>
        </div>

        <!-- Materials: attached lessons (a tap opens the lesson: a card on top on mobile, its
             page on desktop), then Attach -->
        <div class="flex flex-col gap-1.5">
        <span class="text-footnote px-4 uppercase opacity-50">{{ 'event.materials' | t }}</span>
        <div class="card">
          @for (l of attached(); track l.id) {
            <div class="list-row !gap-1">
              <button type="button" (click)="openLesson(l.id)" class="flex min-w-0 flex-1 items-center self-stretch text-left">
                <p class="min-w-0 flex-1 truncate">{{ l.title }}</p>
              </button>
              <button type="button" (click)="detach(l.id)" [attr.aria-label]="'action.remove' | t" class="edit-only icon-plain -mr-2">
                <app-icon name="close" class="size-5" />
              </button>
            </div>
          }
          <button #lessonRow type="button" (click)="openPicker('lessons', lessonRow)" class="edit-only list-row w-full text-left text-[var(--accent)]">
            <span>{{ 'event.attachLesson' | t }}</span>
            <!-- In the same box as the rows' ×, so they line up -->
            <span class="icon-plain -mr-2 !text-current"><app-icon name="plus" class="size-5" /></span>
          </button>
        </div>
        </div>
        }

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
              <app-select class="ml-auto" stretch [options]="statusOptions()" [ngModel]="m.status" (ngModelChange)="patch({ status: $event })" [ngModelOptions]="{ standalone: true }" />
            </div>
          }
        </div>

        <div class="card">
          <div class="list-row py-3 desktop:py-2">
            <textarea name="note" [ngModel]="m.note" (ngModelChange)="patch({ note: $event })" rows="2" [placeholder]="'event.note' | t" autocomplete="off" class="row-input resize-y leading-snug"></textarea>
          </div>
        </div>
      </div>
      </div>
    </app-page-sheet>

    @switch (picking()) {
      @case ('invite') {
        <app-pick-list
          [title]="'event.invite' | t"
          [sections]="inviteSections()"
          [selected]="inviteIds()"
          (selectedChange)="setInvitees($event)"
          [origin]="pickOrigin()"
          (closed)="picking.set(null)"
        />
      }
      @case ('lessons') {
        <app-pick-list
          [title]="'event.lessons' | t"
          [sections]="lessonSections()"
          [selected]="m.lessonIds"
          (selectedChange)="patch({ lessonIds: $event })"
          [origin]="pickOrigin()"
          (closed)="picking.set(null)"
        />
      }
    }
  `,
})
export class EventEditor implements OnInit {
  readonly entry = input.required<StackEntry>();
  // Opened from another card: just for reading (see NavStack).
  protected readonly readOnly = computed(() => !!this.entry().readOnly);
  readonly closed = output<void>();

  private events = inject(EventService);
  private groups = inject(GroupService);
  private students = inject(StudentService);
  private lessons = inject(LessonService);
  private router = inject(Router);
  private device = inject(DeviceDetectionService);
  private i18n = inject(I18nService);
  protected stack = inject(NavStack);

  private readonly page = viewChild.required<PageSheet>('page');

  protected readonly picking = signal<'invite' | 'lessons' | null>(null);
  protected readonly pickOrigin = signal<HTMLElement | null>(null); // the row it opened from

  protected openPicker(kind: 'invite' | 'lessons', origin: HTMLElement): void {
    this.pickOrigin.set(origin);
    this.picking.set(kind);
  }
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

  // Picker contents: groups and students (one list of ids, split back on change); lessons.
  protected readonly inviteSections = computed<PickSection[]>(() => [
    { key: 'groups.title', items: this.groups.groups().map((g) => ({ id: g.id, name: g.name, color: colorVar(g.color) })) },
    { key: 'nav.students', items: this.students.students().map((s) => ({ id: s.id, name: s.name })) },
  ]);
  protected readonly inviteIds = computed(() => {
    const { groupIds, studentIds } = this.model().invitees;
    return [...groupIds, ...studentIds];
  });
  protected readonly lessonSections = computed<PickSection[]>(() => [
    { key: 'nav.lessons', items: this.lessons.lessons().map((l) => ({ id: l.id, name: l.title })) },
  ]);

  // Attached lessons, in order.
  protected readonly attached = computed(() =>
    this.model()
      .lessonIds.map((id) => this.lessons.byId(id))
      .filter((l) => !!l),
  );

  protected readonly date = computed(() => fromDateInput(this.model().date));
  protected readonly dateLabel = computed(() =>
    this.i18n.date(this.date(), { weekday: 'short', month: 'short', day: 'numeric' }),
  );
  protected readonly invalid = computed(
    () => timeToMin(this.model().endTime) <= timeToMin(this.model().startTime),
  );
  protected readonly dirty = computed(() => JSON.stringify(this.model()) !== this.snapshot());
  // Save a valid event with a title or someone invited, that differs from what was opened.
  protected readonly types = EVENT_TYPES;
  protected typeKey(t: EventType) {
    return `event.type.${t}` as const;
  }

  // An event needs a title; a class, a title or someone invited.
  protected readonly canSave = computed(() => {
    const m = this.model();
    const invited = m.type === 'Class' && (!!m.invitees.studentIds.length || !!m.invitees.groupIds.length);
    const named = !!m.title.trim() || invited;
    return named && !this.invalid() && this.dirty();
  });

  ngOnInit(): void {
    const e = this.entry();
    const event = e.id ? this.events.events().find((x) => x.id === e.id) : undefined;
    if (event) {
      const start = new Date(event.startsAt);
      this.model.set({
        type: event.type,
        title: event.title ?? '',
        invitees: { studentIds: event.studentIds, groupIds: event.groupIds },
        lessonIds: event.lessonIds,
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
      type: 'Class',
      title: '',
      invitees: { studentIds: [], groupIds: [] },
      lessonIds: [],
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

  protected openLesson(id: string): void {
    if (this.device.isMobile()) {
      this.stack.push({ kind: 'lesson', id });
    } else {
      this.stack.clear();
      this.router.navigate(['/lessons', id]);
    }
  }

  protected uninvite(id: string): void {
    const { groupIds, studentIds } = this.model().invitees;
    this.patch({ invitees: { groupIds: groupIds.filter((x) => x !== id), studentIds: studentIds.filter((x) => x !== id) } });
  }

  protected detach(id: string): void {
    this.patch({ lessonIds: this.model().lessonIds.filter((x) => x !== id) });
  }

  protected setInvitees(ids: string[]): void {
    const isGroup = (id: string) => !!this.groups.byId(id);
    this.patch({ invitees: { groupIds: ids.filter(isGroup), studentIds: ids.filter((id) => !isGroup(id)) } });
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
    const isClass = m.type === 'Class';
    const input = {
      type: m.type,
      title: m.title.trim() || null,
      studentIds: isClass ? m.invitees.studentIds : [],
      groupIds: isClass ? m.invitees.groupIds : [],
      lessonIds: isClass ? m.lessonIds : [],
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
