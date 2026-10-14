import { DeviceDetectionService } from '../core/services/device-detection.service';
import { Component, OnInit, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { TranslationKey } from '../core/i18n/translations';
import { StackEntry } from '../core/services/nav-stack.service';
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
import { EventInput, EventRepeat, EventService, eventEnd } from '../schedule/event.service';
import { LessonService } from '../lessons/lesson.service';
import { GroupService, colorVar } from '../students/group.service';
import { StudentService } from '../students/student.service';
import { PreferencesService } from '../settings/preferences.service';
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
}

/** Event card (new or existing), opened on the NavStack. */
import { AddField, AddItem } from '../core/ui/add-field';
import { RowMenu } from '../core/ui/row-menu';
import { Router } from '@angular/router';
import { Tip } from '../core/ui/tip';
import { CreateDialog } from './create-dialog';
@Component({
  selector: 'app-event-editor',
  host: { '(document:keydown.control.enter)': 'openFull()', '(document:keydown.meta.enter)': 'openFull()' },
  imports: [AddField, CreateDialog, RowMenu, Tip, ActionSheet, FormsModule, DateField, Icon, PageSheet, PickList, SelectField, TimeField, TranslatePipe],
  template: `
    @let m = model();
    <app-page-sheet
      #page
      [inline]="inline()"
      [actions]="!readOnly()"
      [dirty]="dirty()"
      [canSave]="canSave()"
      [deletable]="!!entry().id"
      [confirmDelete]="!series()"
      (save)="save()"
      (delete)="remove()"
      (closed)="closed.emit()"
    >
      @if (desktop) {
      <!-- Desktop, in the new style (as a Notion page): the title big, then properties — a gray label
           with its icon, the value beside it; participants and lessons as rows (⋯ on hover: Open in new tab, Remove) -->
      <div class="contents" [class.read-only]="readOnly()">
      <div class="flex flex-col gap-2.5 pt-1">
        <div class="flex items-center gap-1">
          <input name="title" [ngModel]="m.title" (ngModelChange)="patch({ title: $event })" type="text" [placeholder]="'event.title' | t" autocomplete="off" class="min-w-0 flex-1 bg-transparent px-1 text-[1.25rem] font-semibold outline-none placeholder:opacity-30" />
          <!-- (a saved one: Open in full page, Ctrl+Enter) -->
          @if (entry().id && !inline()) {
            <button type="button" (click)="openFull()" [appTip]="'**' + ('peek.openFull' | t) + '**  Ctrl+↵'" tipSide="bottom" [attr.aria-label]="'peek.openFull' | t" class="head-btn !px-1.5"><app-icon name="expand" /></button>
          }
        </div>

        <div class="flex flex-col">
          <div class="flex min-h-9 items-center gap-3">
            <span class="flex w-32 shrink-0 items-center gap-2 text-[0.875rem] opacity-50"><app-icon name="calendar" class="size-4" />{{ 'event.starts' | t }}</span>
            <div class="flex min-w-0 flex-1 items-center justify-end gap-2 text-[0.875rem]">
              <app-date [ngModel]="date()" (ngModelChange)="setDate($event)" [ngModelOptions]="{ standalone: true }" />
              <app-time [ngModel]="m.startTime" (ngModelChange)="onStartChange($event)" [ngModelOptions]="{ standalone: true }" />
            </div>
          </div>
          <div class="flex min-h-9 items-center gap-3">
            <span class="flex w-32 shrink-0 items-center gap-2 text-[0.875rem] opacity-50"><app-icon name="calendar" class="size-4" />{{ 'event.ends' | t }}</span>
            <div class="flex min-w-0 flex-1 items-center justify-end gap-2 text-[0.875rem]">
              <span class="px-1" [class.opacity-60]="!invalid()" [class.text-[var(--warning)]]="invalid()" [class.line-through]="invalid()">{{ dateLabel() }}</span>
              <app-time [ngModel]="m.endTime" (ngModelChange)="patch({ endTime: $event })" [ngModelOptions]="{ standalone: true }" />
            </div>
          </div>
          <div class="flex min-h-9 items-center gap-3">
            <span class="flex w-32 shrink-0 items-center gap-2 text-[0.875rem] opacity-50"><app-icon name="repeat" class="size-4" />{{ 'event.repeat' | t }}</span>
            <div class="flex min-w-0 flex-1 items-center justify-end gap-2 text-[0.875rem]">
              <app-select [options]="presetOptions()" [ngModel]="preset()" (ngModelChange)="setPreset($event)" [ngModelOptions]="{ standalone: true }" />
            </div>
          </div>
          @if (m.repeatCustom) {
            <div class="flex min-h-9 items-center gap-3">
            <span class="flex w-32 shrink-0 items-center gap-2 text-[0.875rem] opacity-50"><app-icon name="repeat" class="size-4" />{{ 'event.every' | t }}</span>
            <div class="flex min-w-0 flex-1 items-center justify-end gap-2 text-[0.875rem]">
              <app-select [options]="intervalOptions()" [ngModel]="m.repeatInterval" (ngModelChange)="patch({ repeatInterval: +$event })" [ngModelOptions]="{ standalone: true }" />
            </div>
          </div>
          }
          @if (m.repeat !== 'Never') {
            <div class="flex min-h-9 items-center gap-3">
            <span class="flex w-32 shrink-0 items-center gap-2 text-[0.875rem] opacity-50"><app-icon name="repeat" class="size-4" />{{ 'event.endRepeat' | t }}</span>
            <div class="flex min-w-0 flex-1 items-center justify-end gap-2 text-[0.875rem]">
              <app-select [options]="endOptions()" [ngModel]="m.repeatUntil ? 'date' : 'never'" (ngModelChange)="setEnd($event)" [ngModelOptions]="{ standalone: true }" />
            </div>
          </div>
            @if (m.repeatUntil) {
              <div class="flex min-h-9 items-center gap-3">
            <span class="flex w-32 shrink-0 items-center gap-2 text-[0.875rem] opacity-50"><app-icon name="calendar" class="size-4" />{{ 'event.endDate' | t }}</span>
            <div class="flex min-w-0 flex-1 items-center justify-end gap-2 text-[0.875rem]">
              <app-date [ngModel]="untilDate()" (ngModelChange)="setUntil($event)" [ngModelOptions]="{ standalone: true }" />
            </div>
          </div>
            }
          }
        </div>

        <!-- Participants, then lessons (as Notion Calendar's): a row each (a second line under the
             name; ⋯ on hover), then a field adding more (none yet: the field with its icon). Icons
             under the properties' icons, texts under their labels (their tint reaching out to near the card's edges) -->
        <div class="flex flex-col gap-px">
          @for (p of invited(); track p.id) {
            <div class="group/r -mx-3 flex min-h-10 items-center gap-2 rounded-md px-3 py-1 text-[0.875rem] hover:bg-[var(--tint)]">
              <span class="flex min-w-0 flex-1 flex-col pl-6">
                <span class="truncate">{{ p.name }}</span>
                @if (hintOf(p); as h) {
                  <span class="truncate text-[0.75rem] opacity-50">{{ h }}</span>
                }
              </span>
              <app-row-menu class="edit-only" [link]="['/students', p.kind, p.id]" (removed)="uninvite(p.id)" />
            </div>
          }
          <app-add-field class="edit-only -mx-3 [&_.add-field]:px-3" [class.pl-6]="invited().length" [icon]="invited().length ? null : 'people'" [placeholder]="(invited().length ? 'event.addParticipant' : 'event.participants') | t" [items]="inviteItems()" [exclude]="inviteIds()" (picked)="invite($event)" [openOnFocus]="true" [action]="{ label: 'sidebar.newStudent' | t, icon: 'compose' }" (acted)="newStudent.set($event)" [section]="'event.fromPeople' | t" />
        </div>

        <div class="flex flex-col gap-px">
          @for (l of attached(); track l.id) {
            <div class="group/r -mx-3 flex min-h-10 items-center gap-2 rounded-md px-3 py-1 text-[0.875rem] hover:bg-[var(--tint)]">
              <app-icon name="page" class="size-4 shrink-0 opacity-50" />
              <span class="flex min-w-0 flex-1 flex-col">
                <span class="truncate">{{ l.title }}</span>
                @if (l.level) {
                  <span class="truncate text-[0.75rem] opacity-50">{{ l.level }}</span>
                }
              </span>
              <app-row-menu class="edit-only" [link]="['/lessons', l.id]" (removed)="detach(l.id)" />
            </div>
          }
          <app-add-field class="edit-only -mx-3 [&_.add-field]:px-3" [class.pl-6]="attached().length" [icon]="attached().length ? null : 'page'" [placeholder]="(attached().length ? 'event.searchLibrary' : 'event.lessons') | t" [items]="lessonItems()" [exclude]="m.lessonIds" (picked)="attach($event)" [openOnFocus]="true" [action]="{ label: 'event.newLesson' | t, icon: 'compose' }" (acted)="newPage.set($event)" [section]="'event.fromLibrary' | t" itemIcon="page" />
        </div>
      </div>
      </div>
      } @else {
      <div class="contents" [class.read-only]="readOnly()">
      <div class="flex flex-col gap-4">
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
          <!-- Repeat (iOS-like), in the same card: Never / every day, week, 2 weeks, month, year /
               Custom (every N days); then when it ends -->
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


        <!-- Participants: groups and students, then Invite (rows don't open anything for now) -->
        <div class="flex flex-col gap-1.5">
        <span class="card-label">{{ 'event.participants' | t }}</span>
        <div class="card">
          <!-- × takes them out of the event -->
          @for (p of invited(); track p.id) {
            <div class="list-row !gap-1 py-2">
              <div class="flex min-w-0 flex-1 items-center gap-3 self-stretch">
                <span class="avatar" [class.text-[var(--accent-fg)]]="!!p.color" [style.background]="p.color">{{ initial(p.name) }}</span>
                <p class="min-w-0 flex-1 truncate">{{ p.name }}</p>
              </div>
              <button type="button" (click)="uninvite(p.id)" [attr.aria-label]="'action.remove' | t" class="edit-only icon-plain -mr-2">
                <app-icon name="close" class="size-5" />
              </button>
            </div>
          }
          <!-- Gray when there's no one at all to invite -->
          <button #inviteRow type="button" (click)="openPicker('invite', inviteRow)" [disabled]="isEmpty(inviteSections())" class="edit-only list-row add-row">
            <span>{{ 'event.invite' | t }}</span>
            <!-- In the same box as the rows' ×, so they line up -->
            <span class="icon-plain -mr-2 !text-current"><app-icon name="plus" class="size-5" /></span>
          </button>
        </div>
        </div>

        <!-- Lessons: the attached ones, then Attach (rows don't open anything for now) -->
        <div class="flex flex-col gap-1.5">
        <span class="card-label">{{ 'event.lessons' | t }}</span>
        <div class="card">
          @for (l of attached(); track l.id) {
            <div class="list-row !gap-1">
              <p class="min-w-0 flex-1 self-center truncate">{{ l.title }}</p>
              <button type="button" (click)="detach(l.id)" [attr.aria-label]="'action.remove' | t" class="edit-only icon-plain -mr-2">
                <app-icon name="close" class="size-5" />
              </button>
            </div>
          }
          <!-- Gray when there are no lessons yet -->
          <button #lessonRow type="button" (click)="openPicker('lessons', lessonRow)" [disabled]="isEmpty(lessonSections())" class="edit-only list-row add-row">
            <span>{{ 'event.attachLesson' | t }}</span>
            <!-- In the same box as the rows' ×, so they line up -->
            <span class="icon-plain -mr-2 !text-current"><app-icon name="plus" class="size-5" /></span>
          </button>
        </div>
        </div>
      </div>
      </div>
      }
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

    <!-- ('' is a name too: nothing typed yet) -->
    @if (newStudent() !== null) {
      <app-create-dialog [initialName]="newStudent()!" [hint]="'newStudent.toEvent' | t" (created)="invite($event)" (closed)="newStudent.set(null)" />
    }
    @if (newPage() !== null) {
      <app-create-dialog kind="page" [initialName]="newPage()!" [hint]="'create.pageToEvent' | t" (created)="attach($event)" (closed)="newPage.set(null)" />
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
  protected readonly desktop = !inject(DeviceDetectionService).isMobile();
  readonly entry = input.required<StackEntry>();
  // Just for reading: opened from another card (see NavStack), or already over — a past event
  // (for a series: this repeat) can't be changed or deleted.
  protected readonly readOnly = computed(() => {
    const e = this.opened();
    return !!this.entry().readOnly || (!!e && eventEnd(e).getTime() < Date.now());
  });
  readonly closed = output<void>();
  /** Desktop: on a page of its own (EventPage), not a card. */
  readonly inline = input(false);

  private events = inject(EventService);
  private groups = inject(GroupService);
  private students = inject(StudentService);
  private lessons = inject(LessonService);
  private i18n = inject(I18nService);
  private prefs = inject(PreferencesService);

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
  // Nothing to pick from at all (the pickers also take people / lessons out, so "all already
  // chosen" still opens them).
  protected isEmpty(sections: PickSection[]): boolean {
    return sections.every((s) => !s.items.length);
  }
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
  protected readonly dirty = computed(() => EventEditor.key(this.model()) !== this.snapshot());

  // What "changed" compares: the form, with who's invited as a set (removing someone and adding
  // them back is no change); attached lessons keep their order (it can be rearranged).
  private static key(m: Model): string {
    const sorted = (ids: string[]) => [...ids].sort();
    return JSON.stringify({ ...m, invitees: { studentIds: sorted(m.invitees.studentIds), groupIds: sorted(m.invitees.groupIds) } });
  }
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
  // Custom is hidden for now: offered only for an event that already repeats that way.
  protected readonly presetOptions = computed<SelectOption[]>(() => [
    ...EventEditor.PRESETS.map((p) => ({ label: this.i18n.t(`event.repeat.${p.key}` as TranslationKey), value: p.key })),
    ...(this.preset() === 'custom' ? [{ label: this.i18n.t('event.repeat.custom'), value: 'custom' }] : []),
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

  // An event needs a title or someone invited (students / groups).
  protected readonly canSave = computed(() => {
    const m = this.model();
    const named = !!m.title.trim() || !!m.invitees.studentIds.length || !!m.invitees.groupIds.length;
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
      });
    } else if (this.entry().date) {
      this.model.set({ ...this.blank(), date: this.entry().date!, ...this.defaultTimes(this.entry().date!) });
    }
    // A stored rule that matches no preset opens as Custom.
    if (this.preset() === 'custom') this.model.update((m) => ({ ...m, repeatCustom: true }));
    this.snapshot.set(EventEditor.key(this.model()));
    const m = this.model();
    this.repeatSnapshot = JSON.stringify([m.repeat, m.repeatInterval, m.repeatUntil]);
  }

  // A new event's hour: today from now (rounded up to 5 minutes), any other day from the
  // settings' hour (9:00); as long as the settings say (an hour). Ends by 23:55.
  private defaultTimes(date: string): { startTime: string; endTime: string } {
    const now = new Date();
    const start =
      date === toDateInput(now)
        ? Math.min(Math.ceil((now.getHours() * 60 + now.getMinutes()) / 5) * 5, 23 * 60)
        : timeToMin(this.prefs.dayStart());
    return { startTime: minToTime(start), endTime: minToTime(Math.min(start + this.prefs.eventMinutes(), 23 * 60 + 55)) };
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
      ...this.defaultTimes(toDateInput(new Date())),
    };
  }

  protected initial(name: string): string {
    return initial(name, this.i18n.locale());
  }

  // The add fields' lists: groups ("Group") and students; lessons (their level)
  protected readonly inviteItems = computed<AddItem[]>(() => [
    ...this.groups.groups().map((g) => ({ id: g.id, name: g.name, hint: this.i18n.t('sidebar.group'), icon: 'people' as const })),
    ...this.students.students().map((s) => ({ id: s.id, name: s.name, icon: 'person' as const })),
  ]);
  protected readonly lessonItems = computed<AddItem[]>(() => this.lessons.lessons().map((l) => ({ id: l.id, name: l.title, hint: l.level ?? null })));

  // A participant's second line: a group's "Group" (a student: none)
  protected hintOf(p: { kind: 'group' | 'student'; id: string }): string | null {
    return p.kind === 'group' ? this.i18n.t('sidebar.group') : null;
  }

  // New student (from the participants' field): asked in a small dialog, then invited
  protected readonly newStudent = signal<string | null>(null);

  protected invite(id: string): void {
    this.setInvitees([...this.inviteIds(), id]);
  }

  // Open in full page (a saved one): its page; changed — saved first (a series: asks there)
  private readonly router = inject(Router);
  protected openFull(): void {
    const id = this.entry().id;
    if (!id || this.inline() || !this.desktop) return;
    if (this.dirty() && this.canSave() && !this.series()) this.save();
    else this.page().close();
    const at = this.entry().at;
    this.router.navigate(['/events', id], at ? { queryParams: { at } } : {});
  }

  protected attach(id: string): void {
    this.patch({ lessonIds: [...this.model().lessonIds, id] });
  }

  // New page (from the pages' field): just its title, in a small dialog; attached once made
  protected readonly newPage = signal<string | null>(null);

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
