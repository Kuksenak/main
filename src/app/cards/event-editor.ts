import { Component, OnInit, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { TranslationKey } from '../core/i18n/translations';
import { DeviceDetectionService } from '../core/services/device-detection.service';
import { NavStack, StackEntry } from '../core/services/nav-stack.service';
import { DateField } from '../core/ui/date/date';
import { Icon } from '../core/ui/icon/icon';
import { ActionChoice, ActionSheet } from '../core/ui/confirm';
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
import { EVENT_STATUSES, EventInput, EventRepeat, EventService, EventStatus, statusKey } from '../schedule/event.service';
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
  title: string;
  repeat: EventRepeat;
  repeatInterval: number;
  repeatCustom: boolean; // the Custom choice is open (frequency + every N)
  repeatUntil: string | null; // yyyy-MM-dd, the last day repeats may fall on; null = forever
  invitees: Invitees;
  lessonIds: string[];
  date: string; // yyyy-MM-dd
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  note: string; // no longer edited here; an existing note is kept as is
  status: EventStatus;
}

/** Event card (new or existing), opened on the NavStack. */
@Component({
  selector: 'app-event-editor',
  imports: [ActionSheet, FormsModule, DateField, Icon, PageSheet, PickList, SelectField, TimeField, TranslatePipe],
  template: `
    @let m = model();
    <app-page-sheet
      #page
      [actions]="!readOnly()"
      [dirty]="dirty()"
      [canSave]="canSave()"
      [deletable]="!!entry().id"
      [confirmDelete]="!series()"
      (save)="save()"
      (delete)="remove()"
      (closed)="closed.emit()"
    >
      <div class="contents" [class.read-only]="readOnly()">
      <div class="flex flex-col gap-6">
        <div class="card">
          <div class="list-row">
            <input name="title" [ngModel]="m.title" (ngModelChange)="patch({ title: $event })" type="text" [placeholder]="'event.title' | t" autocomplete="off" class="row-input" />
          </div>
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
              <app-select class="ml-auto" stretch [options]="statusOptions()" [ngModel]="m.status" (ngModelChange)="patch({ status: $event })" [ngModelOptions]="{ standalone: true }" />
            </div>
          }
        </div>

        <!-- Repeat (iOS-like): Never / every day, week, 2 weeks, month, year / Custom (every N
             days); then when it ends -->
        <div class="card">
          <div class="list-row">
            <span>{{ 'event.repeat' | t }}</span>
            <app-select class="ml-auto" stretch [options]="presetOptions()" [ngModel]="preset()" (ngModelChange)="setPreset($event)" [ngModelOptions]="{ standalone: true }" />
          </div>
          @if (m.repeatCustom) {
            <!-- Custom: every N days -->
            <div class="list-row">
              <span>{{ 'event.every' | t }}</span>
              <app-select class="ml-auto" stretch [options]="intervalOptions()" [ngModel]="m.repeatInterval" (ngModelChange)="patch({ repeatInterval: +$event })" [ngModelOptions]="{ standalone: true }" />
            </div>
          }
          <!-- End repeat: never, or on a date -->
          @if (m.repeat !== 'Never') {
            <div class="list-row">
              <span>{{ 'event.endRepeat' | t }}</span>
              <app-select class="ml-auto" stretch [options]="endOptions()" [ngModel]="m.repeatUntil ? 'date' : 'never'" (ngModelChange)="setEnd($event)" [ngModelOptions]="{ standalone: true }" />
            </div>
            @if (m.repeatUntil) {
              <div class="list-row">
                <span>{{ 'event.endDate' | t }}</span>
                <app-date class="ml-auto" [ngModel]="untilDate()" (ngModelChange)="setUntil($event)" [ngModelOptions]="{ standalone: true }" />
              </div>
            }
          }
        </div>


        <!-- Participants (no caption): groups and students (a tap opens their card on top), then Invite -->
        <div class="flex flex-col gap-1.5">
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

        <!-- Files (no caption): attached lessons (a tap opens the lesson: a card on top on mobile, its
             page on desktop), then Attach -->
        <div class="flex flex-col gap-1.5">
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
      </div>
      </div>
    </app-page-sheet>

    <!-- A repeating event: this one only, or the whole series? -->
    @if (askSeries(); as ask) {
      <app-action-sheet
        title="series.title"
        [choices]="ask === 'save' ? saveChoices : deleteChoices"
        [origin]="page.actionOrigin()"
        (chosen)="seriesChosen(ask, $event)"
        (closed)="askSeries.set(null)"
      />
    }

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
  // Repeat presets (iOS-like) over frequency + interval; anything else is Custom.
  private static readonly PRESETS: { key: string; repeat: EventRepeat; interval: number }[] = [
    { key: 'never', repeat: 'Never', interval: 1 },
    { key: 'day', repeat: 'Daily', interval: 1 },
    { key: 'week', repeat: 'Weekly', interval: 1 },
    { key: 'twoWeeks', repeat: 'Weekly', interval: 2 },
    { key: 'month', repeat: 'Monthly', interval: 1 },
    { key: 'year', repeat: 'Yearly', interval: 1 },
  ];
  // How many days "every N" offers.
  private static readonly MAX: Record<'Daily', number> = { Daily: 365 };

  protected readonly preset = computed(() => {
    const m = this.model();
    if (m.repeatCustom) return 'custom';
    return EventEditor.PRESETS.find((p) => p.repeat === m.repeat && p.interval === m.repeatInterval)?.key ?? 'custom';
  });
  protected readonly presetOptions = computed<SelectOption[]>(() => [
    ...EventEditor.PRESETS.map((p) => ({ label: this.i18n.t(`event.repeat.${p.key}` as TranslationKey), value: p.key })),
    { label: this.i18n.t('event.repeat.custom'), value: 'custom' },
  ]);
  // Custom is "every N days": "1 day", "2 days" … (plural forms per language).
  protected readonly intervalOptions = computed<SelectOption[]>(() => {
    const unit = 'Daily' as const;
    const rules = new Intl.PluralRules(this.i18n.locale());
    return Array.from({ length: EventEditor.MAX[unit] }, (_, i) => {
      const n = i + 1;
      const form = rules.select(n) as 'one' | 'few' | 'many' | 'other';
      return { label: `${n} ${this.i18n.t(`event.unit.${unit}.${form}` as TranslationKey)}`, value: n };
    });
  });

  protected setPreset(key: string): void {
    if (key === 'custom') {
      const m = this.model();
      // Every N days: keep N when it already repeats daily, else start from every 2 days.
      this.patch({ repeatCustom: true, repeat: 'Daily', repeatInterval: m.repeat === 'Daily' ? m.repeatInterval : 2 });
      return;
    }
    const p = EventEditor.PRESETS.find((x) => x.key === key)!;
    this.patch({
      repeat: p.repeat,
      repeatInterval: p.interval,
      repeatCustom: false,
      ...(p.repeat === 'Never' ? { repeatUntil: null } : {}),
    });
  }

  protected readonly endOptions = computed<SelectOption[]>(() => [
    { label: this.i18n.t('event.endRepeat.never'), value: 'never' },
    { label: this.i18n.t('event.endRepeat.onDate'), value: 'date' },
  ]);

  // On a date: a month after the event's day to start with.
  protected setEnd(value: string): void {
    if (value !== 'date') {
      this.patch({ repeatUntil: null });
      return;
    }
    const d = fromDateInput(this.model().date);
    d.setMonth(d.getMonth() + 1);
    this.patch({ repeatUntil: toDateInput(d) });
  }

  protected setUntil(date: Date | null): void {
    if (date) this.patch({ repeatUntil: toDateInput(date) });
  }

  // The end date as a Date — computed once per change (a new Date on every check would make the
  // picker see a "new" value each time and loop).
  protected readonly untilDate = computed(() => {
    const until = this.model().repeatUntil;
    return until ? fromDateInput(until) : null;
  });

  // An event needs a title or someone invited.
  protected readonly canSave = computed(() => {
    const m = this.model();
    const invited = !!m.invitees.studentIds.length || !!m.invitees.groupIds.length;
    const named = !!m.title.trim() || invited;
    return named && !this.invalid() && this.dirty();
  });

  // The opened event; for a series, the repeat that was opened (its start).
  private readonly opened = computed(() => {
    const e = this.entry();
    if (!e.id) return undefined;
    const all = this.events.events().filter((x) => x.id === e.id);
    return all.find((x) => x.startsAt === e.at) ?? all[0];
  });
  // A saved repeating event (asks "this one or all?" on save and delete).
  protected readonly series = computed(() => !!this.opened() && this.opened()!.repeat !== 'Never');
  private repeatSnapshot = '';

  protected readonly askSeries = signal<'save' | 'delete' | null>(null);
  protected readonly saveChoices: ActionChoice[] = [
    { value: 'this', label: 'series.saveThis', accent: true },
    { value: 'following', label: 'series.saveFollowing', accent: true },
  ];
  protected readonly deleteChoices: ActionChoice[] = [
    { value: 'this', label: 'series.deleteThis', danger: true },
    { value: 'following', label: 'series.deleteFollowing', danger: true },
  ];

  ngOnInit(): void {
    const event = this.opened();
    if (event) {
      const start = new Date(event.startsAt); // this repeat's own date and time
      this.model.set({
        repeat: event.repeat ?? 'Never',
        repeatInterval: event.repeatInterval ?? 1,
        repeatCustom: false,
        repeatUntil: event.repeatUntil ? toDateInput(new Date(event.repeatUntil)) : null,
        title: event.title ?? '',
        invitees: { studentIds: event.studentIds, groupIds: event.groupIds },
        lessonIds: event.lessonIds,
        date: toDateInput(start),
        startTime: toTimeInput(start),
        endTime: minToTime(timeToMin(toTimeInput(start)) + event.durationMinutes),
        note: event.note ?? '',
        status: event.status,
      });
    } else if (this.entry().date) {
      this.model.set({ ...this.blank(), date: this.entry().date! });
    }
    // A stored rule that matches no preset opens as Custom.
    if (this.preset() === 'custom') this.model.update((m) => ({ ...m, repeatCustom: true }));
    this.snapshot.set(JSON.stringify(this.model()));
    const m = this.model();
    this.repeatSnapshot = JSON.stringify([m.repeat, m.repeatInterval, m.repeatUntil]);
  }

  private blank(): Model {
    return {
      repeat: 'Never',
      repeatInterval: 1,
      repeatCustom: false,
      repeatUntil: null,
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
    const input: EventInput = {
      title: m.title.trim() || null,
      repeat: m.repeat,
      repeatInterval: m.repeat === 'Never' ? 1 : m.repeatInterval,
      // the end of that day, local time
      repeatUntil: m.repeat !== 'Never' && m.repeatUntil ? new Date(`${m.repeatUntil}T23:59:59.999`).toISOString() : null,
      studentIds: m.invitees.studentIds,
      groupIds: m.invitees.groupIds,
      lessonIds: m.lessonIds,
      startsAt: new Date(`${m.date}T${m.startTime}`).toISOString(),
      durationMinutes: timeToMin(m.endTime) - timeToMin(m.startTime),
      note: m.note.trim() || null,
      status: m.status,
    };
    if (!id) this.events.create(input);
    else if (!this.series()) this.events.update(id, input);
    else if (this.repeatChanged()) this.saveSeries(input); // a new rule is for the whole series
    else {
      this.pendingInput = input;
      this.askSeries.set('save');
      return;
    }
    this.page().close();
  }

  private pendingInput: EventInput | null = null;

  private repeatChanged(): boolean {
    const m = this.model();
    return JSON.stringify([m.repeat, m.repeatInterval, m.repeatUntil]) !== this.repeatSnapshot;
  }

  // The whole series: its first start moves by as much as this repeat was moved.
  private saveSeries(input: EventInput): void {
    const event = this.opened()!;
    const shift = new Date(input.startsAt).getTime() - new Date(event.startsAt).getTime();
    const startsAt = new Date(new Date(event.seriesStartsAt ?? event.startsAt).getTime() + shift).toISOString();
    this.events.update(event.id, { ...input, startsAt });
  }

  protected seriesChosen(ask: 'save' | 'delete', choice: string): void {
    const event = this.opened()!;
    if (ask === 'save') {
      const input = this.pendingInput!;
      if (choice === 'following') this.events.occurrence(event.id, event.startsAt, input, true); // a new series from here
      else this.events.occurrence(event.id, event.startsAt, { ...input, repeat: 'Never', repeatInterval: 1, repeatUntil: null });
    } else {
      this.events.occurrence(event.id, event.startsAt, null, choice === 'following');
    }
    this.page().close();
  }

  protected remove(): void {
    const id = this.entry().id;
    if (!id) return;
    if (this.series()) {
      this.askSeries.set('delete');
      return;
    }
    this.events.remove(id);
    this.page().close();
  }
}
