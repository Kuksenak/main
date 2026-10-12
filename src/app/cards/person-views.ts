import { NgTemplateOutlet } from '@angular/common';
import { Component, ElementRef, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { I18nService } from '../core/i18n/i18n.service';
import { DeviceDetectionService } from '../core/services/device-detection.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { BrandIcon } from '../core/ui/icon/brand-icon';
import { Icon } from '../core/ui/icon/icon';
import { ScrollArea } from '../core/ui/scroll-area/scroll-area';
import { LessonService } from '../lessons/lesson.service';
import { EventPeople } from '../schedule/event-people';
import { EventService, ScheduleEvent, eventEnd, occurrenceKey } from '../schedule/event.service';
import { Group, GroupService } from '../students/group.service';
import { Student } from '../students/student.service';
import { PickList, PickSection } from './pick-list';
import { GroupMembers } from './related-lists';

/**
 * A person's / group's lessons, the way the student page shows them: the next lesson as a card
 * (date tile, time, who else, what's attached), their own materials (attached lessons, Attach),
 * then every past lesson by month with what was attached to it. (Rows don't open anything for now.)
 */
@Component({
  selector: 'app-person-lessons',
  imports: [Icon, NgTemplateOutlet, PickList, TranslatePipe],
  host: { class: 'flex flex-col gap-4', '[class.!gap-0]': 'flat()' },
  template: `
    @if (showNext()) {
    <!-- Next lesson -->
    @if (next(); as e) {
      <div class="next-lesson">
        <span class="date-tile is-accent">
          <small>{{ weekday(e) }}</small>
          <b>{{ day(e) }}</b>
        </span>
        <span class="flex min-w-0 flex-1 flex-col gap-1.5 text-left">
          <span class="flex flex-wrap items-baseline gap-x-2">
            <em class="next-tag">{{ 'people.next' | t }}</em>
            <span class="font-medium tabular-nums">{{ time(e) }}</span>
            @if (context(e); as c) {
              <span class="truncate opacity-50">{{ c }}</span>
            }
          </span>
          @if (lessonTitles(e).length) {
            <span class="flex flex-wrap gap-1.5">
              @for (t of lessonTitles(e); track $index) {
                <span class="lesson-chip">{{ t }}</span>
              }
            </span>
          }
        </span>
      </div>
    }

    }

    <!-- Materials: lessons attached to the person / group -->
    @if (showMaterials() && (materials().length || editable())) {
      <div class="flex flex-col gap-1.5">
        <span class="card-label">{{ 'people.materials' | t }}</span>
        <div class="card">
          @for (l of materials(); track l.id) {
            <div class="list-row">
              <span class="min-w-0 flex-1 truncate">{{ l.title }}</span>
            </div>
          }
          @if (editable()) {
            <button #attachRow type="button" (click)="picking.set(true)" [disabled]="!allLessons().length" class="list-row add-row">
              <span>{{ 'event.attachLesson' | t }}</span>
              <span class="icon-plain -mr-2 !text-current"><app-icon name="plus" class="size-5" /></span>
            </button>
          }
        </div>
      </div>
    }

    <!-- One lesson: day, time and who; attached lessons / repeating only as the marks on the right -->
    <ng-template #lessonLine let-e>
      <div class="list-row pb-3 pt-3.5 desktop:py-2">
        <span class="date-tile desktop:size-9">
          <b>{{ day(e) }}</b>
          <small>{{ weekday(e) }}</small>
        </span>
        <span class="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2">
          <span class="tabular-nums">{{ time(e) }}</span>
          @if (context(e); as c) {
            <span class="truncate opacity-50">{{ c }}</span>
          }
        </span>
        @if (e.repeat !== 'Never' || e.lessonIds.length) {
          <span class="flex shrink-0 items-center gap-1.5 opacity-50">
            @if (e.repeat !== 'Never') {
              <app-icon name="repeat" class="size-4" />
            }
            @if (e.lessonIds.length) {
              <app-icon name="paperclip" class="size-4 rotate-45" />
            }
          </span>
        }
      </div>
    </ng-template>

    <!-- A past lesson (History): the day as in the other lists; what was studied first — the
         attached lessons, the event's title (else its groups) small under them; the time quietly
         in the right corner, start over end (as in the schedule) -->
    <ng-template #pastLine let-e>
      <div class="list-row pb-3 pt-3.5 desktop:py-2">
        <span class="date-tile desktop:size-9">
          <b>{{ day(e) }}</b>
          <small>{{ weekday(e) }}</small>
        </span>
        <span class="flex min-w-0 flex-1 flex-col gap-0.5">
          @if (lessonTitles(e).length) {
            <span class="line-clamp-2 font-medium">{{ lessonTitles(e).join(', ') }}</span>
          } @else {
            <span class="opacity-40">{{ 'people.nothingAttached' | t }}</span>
          }
          @if (context(e); as c) {
            <span class="text-footnote truncate opacity-50">{{ c }}</span>
          }
        </span>
        <span class="text-footnote shrink-0 text-right leading-tight tabular-nums opacity-50">
          <span class="block">{{ startTime(e) }}</span>
          <span class="block">{{ endTime(e) }}</span>
        </span>
      </div>
    </ng-template>

    <!-- Lessons under their months (upcoming soonest first, past most recent first). Each month
         folds: a tap on it shows / hides its lessons; all start open, rendered lazily. A card per
         month, or (flat) just rows with the months among them, to sit inside another card. -->
    <ng-template #byMonth let-months let-label="label" let-list="list">
      @if (flat()) {
        @for (m of months; track m.label; let first = $first) {
          <button type="button" (click)="toggleMonth(list, m.label, first)" class="list-row month-head !min-h-0 w-full pb-1.5 pt-3 text-left after:hidden">
            <span class="flex-1">{{ m.label }}</span>
            <app-icon name="chevron-right" class="row-chevron transition-transform duration-200" [class.rotate-90]="monthOpen(list, m.label, first)" />
          </button>
          @if (monthOpen(list, m.label, first)) {
            <!-- Rendered once scrolled into view (long histories stay light) -->
            @defer (on viewport) {
              @for (e of m.events; track key(e)) {
                <ng-container [ngTemplateOutlet]="list === 'past' ? pastLine : lessonLine" [ngTemplateOutletContext]="{ $implicit: e }" />
              }
            } @placeholder {
              <div [style.height.px]="m.events.length * 52"></div>
            }
          }
        }
      } @else {
        <div class="flex flex-col gap-1.5">
          @if (listLabels()) {
            <span class="card-label">{{ label | t }}</span>
          }
          @for (m of months; track m.label; let first = $first) {
            <button type="button" (click)="toggleMonth(list, m.label, first)" class="month-head mt-2 flex w-full items-center gap-1.5 px-0.5 text-left desktop:mt-1">
              <span class="flex-1">{{ m.label }}</span>
              <app-icon name="chevron-right" class="row-chevron !opacity-100 transition-transform duration-200" [class.rotate-90]="monthOpen(list, m.label, first)" />
            </button>
            @if (monthOpen(list, m.label, first)) {
              <!-- Rendered once scrolled into view (long histories stay light) -->
              @defer (on viewport) {
                <div class="card">
                  @for (e of m.events; track key(e)) {
                    <ng-container [ngTemplateOutlet]="list === 'past' ? pastLine : lessonLine" [ngTemplateOutletContext]="{ $implicit: e }" />
                  }
                </div>
              } @placeholder {
                <div [style.height.px]="m.events.length * 60"></div>
              }
            }
          }
        </div>
      }
    </ng-template>

    @if (showUpcoming()) {
      @if (upcomingByMonth().length) {
        <ng-container [ngTemplateOutlet]="byMonth" [ngTemplateOutletContext]="{ $implicit: upcomingByMonth(), label: 'students.upcoming', list: 'upcoming' }" />
      } @else {
        <p class="text-footnote opacity-50" [class.list-row]="flat()">{{ 'students.noEvents' | t }}</p>
      }
    }
    @if (showPast()) {
      @if (pastByMonth().length) {
        <ng-container [ngTemplateOutlet]="byMonth" [ngTemplateOutletContext]="{ $implicit: pastByMonth(), label: 'people.pastLessons', list: 'past' }" />
      } @else {
        <p class="text-footnote opacity-50" [class.list-row]="flat()">{{ 'students.noEvents' | t }}</p>
      }
    }

    <!-- Attach: the lesson library with checks (a page on phones, a dropdown on desktop) -->
    @if (picking()) {
      <app-pick-list
        [title]="'people.materials' | t"
        [sections]="lessonSections()"
        [selected]="ids()"
        (selectedChange)="lessonIdsChange.emit($event)"
        [origin]="attachRow()?.nativeElement ?? null"
        (closed)="picking.set(false)"
      />
    }
  `,
})
export class PersonLessons {
  /** Whose lessons: a student's (directly or through a group) or a group's. */
  readonly studentId = input<string | null>(null);
  readonly groupId = input<string | null>(null);
  /** Their materials (attached lessons), in order; Attach emits the new list. */
  readonly lessonIds = input<string[]>([]);
  readonly editable = input(true);
  // Which parts: the next lesson (a card), every upcoming one, the past ones, the materials.
  readonly showNext = input(true);
  readonly showUpcoming = input(false);
  readonly showPast = input(true);
  readonly showMaterials = input(true);
  // Labels over the lists ("Upcoming", "Past lessons"); off on their own page (its title says it).
  readonly listLabels = input(true);
  // The lists as bare rows (month headers among them), to sit inside another card.
  readonly flat = input(false);
  readonly lessonIdsChange = output<string[]>();

  private events = inject(EventService);
  private people = inject(EventPeople);
  private groups = inject(GroupService);
  private lessons = inject(LessonService);
  private i18n = inject(I18nService);

  protected readonly picking = signal(false);

  // Months folded / unfolded by hand ("upcoming:October" → open?); untouched, every month is
  // open (each rendered once scrolled into view).
  private readonly months = signal<ReadonlyMap<string, boolean>>(new Map());

  protected monthOpen(list: string, label: string, _first: boolean): boolean {
    return this.months().get(`${list}:${label}`) ?? true;
  }

  protected toggleMonth(list: string, label: string, first: boolean): void {
    const next = new Map(this.months());
    next.set(`${list}:${label}`, !this.monthOpen(list, label, first));
    this.months.set(next);
  }
  protected readonly attachRow = viewChild<ElementRef<HTMLElement>>('attachRow');
  protected readonly key = occurrenceKey;

  private readonly mine = computed(() => {
    const sid = this.studentId();
    const gid = this.groupId();
    return this.events.events().filter((e) => (sid && this.people.invites(e, sid)) || (gid && e.groupIds.includes(gid)));
  });
  protected readonly next = computed(
    () =>
      this.mine()
        .filter((e) => eventEnd(e).getTime() >= Date.now())
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0] ?? null,
  );
  // Upcoming lessons soonest first, past ones most recent first, under their month ("October",
  // "September 2025").
  protected readonly upcomingByMonth = computed(() =>
    this.byMonth(
      this.mine()
        .filter((e) => eventEnd(e).getTime() >= Date.now())
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
    ),
  );
  protected readonly pastByMonth = computed(() =>
    this.byMonth(
      this.mine()
        .filter((e) => eventEnd(e).getTime() < Date.now())
        .sort((a, b) => b.startsAt.localeCompare(a.startsAt)),
    ),
  );

  private byMonth(list: ScheduleEvent[]): { label: string; events: ScheduleEvent[] }[] {
    const thisYear = new Date().getFullYear();
    const out: { label: string; events: ScheduleEvent[] }[] = [];
    for (const e of list) {
      const d = new Date(e.startsAt);
      const label = this.i18n.date(d, d.getFullYear() === thisYear ? { month: 'long' } : { month: 'long', year: 'numeric' });
      const last = out.at(-1);
      if (last?.label === label) last.events.push(e);
      else out.push({ label, events: [e] });
    }
    return out;
  }

  // (An API without lessonIds yet sends none: nothing attached.)
  protected readonly ids = computed(() => this.lessonIds() ?? []);
  protected readonly materials = computed(() =>
    this.ids()
      .map((id) => this.lessons.byId(id))
      .filter((l): l is NonNullable<typeof l> => !!l),
  );
  protected readonly allLessons = computed(() => this.lessons.lessons());
  protected readonly lessonSections = computed<PickSection[]>(() => [
    { key: 'nav.lessons', items: this.allLessons().map((l) => ({ id: l.id, name: l.title })) },
  ]);

  protected lessonTitles(e: ScheduleEvent): string[] {
    return e.lessonIds.map((id) => this.lessons.byId(id)?.title).filter((t): t is string => !!t);
  }

  // Beside the time: the event's title, else its groups (for a group: just the title).
  protected context(e: ScheduleEvent): string {
    if (e.title) return e.title;
    if (this.groupId()) return '';
    return e.groupIds
      .map((id) => this.groups.byId(id)?.name)
      .filter((n): n is string => !!n)
      .join(', ');
  }

  protected day(e: ScheduleEvent): number {
    return new Date(e.startsAt).getDate();
  }

  protected weekday(e: ScheduleEvent): string {
    return this.i18n.date(new Date(e.startsAt), { weekday: 'short' });
  }

  // History: the time in the corner, start over end.
  protected startTime(e: ScheduleEvent): string {
    return this.i18n.time(new Date(e.startsAt));
  }
  protected endTime(e: ScheduleEvent): string {
    return this.i18n.time(eventEnd(e));
  }

  protected time(e: ScheduleEvent): string {
    return `${this.i18n.time(new Date(e.startsAt))}–${this.i18n.time(eventEnd(e))}`;
  }

}

/**
 * A person's / group's lessons as one card: the next lesson (always shown), then Upcoming › and
 * History › (folded). A tap on a title opens the full list — a page on phones (`upcoming` /
 * `history`: the card / page opens it), unfolded right here on desktop (scrolling on its own,
 * ≤60% of the window). The lessons themselves open nothing (for now).
 */
@Component({
  selector: 'app-lessons-card',
  imports: [BrandIcon, Icon, NgTemplateOutlet, PersonLessons, ScrollArea, TranslatePipe],
  host: { class: 'contents' },
  template: `
    <!-- A lesson: the calendar icon, its title (for a student: else its groups), the repeat /
         paperclip marks, start over end (as in the schedule) -->
    <ng-template #lessonRow let-e>
      <span class="list-row !gap-3.5 pb-3 pt-4">
        <app-brand-icon name="calendar" [date]="start(e)" class="h-14 w-[5.5rem] shrink-0" />
        <span class="flex min-w-0 flex-1 flex-col gap-1.5">
          @if (context(e); as c) {
            <span class="truncate font-medium">{{ c }}</span>
          }
        </span>
        @if (e.repeat !== 'Never' || e.lessonIds.length) {
          <span class="-mr-1.5 flex w-[1.125rem] shrink-0 flex-col items-center gap-1 opacity-50">
            @if (e.repeat !== 'Never') {
              <app-icon name="repeat" class="size-[1.125rem]" />
            }
            @if (e.lessonIds.length) {
              <app-icon name="paperclip" class="size-[1.125rem] rotate-45" />
            }
          </span>
        }
        <span class="text-callout shrink-0 text-right leading-tight tabular-nums">
          <span class="block font-medium">{{ startTime(e) }}</span>
          <span class="block opacity-50">{{ endTime(e) }}</span>
        </span>
      </span>
    </ng-template>

    @if (nextEvent() || lastEvent()) {
      <div class="flex min-h-0 flex-col gap-1.5">
      <span class="card-label">{{ 'nav.lessons' | t }}</span>
      <div class="card flex min-h-0 flex-col">
        @if (nextEvent(); as e) {
          <ng-container [ngTemplateOutlet]="lessonRow" [ngTemplateOutletContext]="{ $implicit: e }" />
          <button type="button" (click)="tapList('upcoming')" class="list-row w-full shrink-0 text-left">
            <span class="block-title">{{ 'students.upcoming' | t }}</span>
            <app-icon name="chevron-right" class="row-chevron transition-transform duration-200" [class.rotate-90]="desktop && open().has('upcoming')" />
          </button>
          @if (desktop && open().has('upcoming')) {
            <app-scroll-area class="max-h-[60vh] min-h-0" viewportClass="!rounded-none">
              <app-person-lessons [studentId]="studentId()" [groupId]="groupId()" [showNext]="false" [showUpcoming]="true" [showPast]="false" [showMaterials]="false" [flat]="true" />
            </app-scroll-area>
          }
        }
        @if (lastEvent()) {
          <button type="button" (click)="tapList('history')" class="list-row w-full shrink-0 text-left">
            <span class="block-title">{{ 'people.history' | t }}</span>
            <app-icon name="chevron-right" class="row-chevron transition-transform duration-200" [class.rotate-90]="desktop && open().has('history')" />
          </button>
          @if (desktop && open().has('history')) {
            <app-scroll-area class="max-h-[60vh] min-h-0" viewportClass="!rounded-none">
              <app-person-lessons [studentId]="studentId()" [groupId]="groupId()" [showNext]="false" [showPast]="true" [showMaterials]="false" [flat]="true" />
            </app-scroll-area>
          }
        }
      </div>
      </div>
    }
  `,
})
export class LessonsCard {
  /** Whose lessons: a student's (directly or through a group) or a group's. */
  readonly studentId = input<string | null>(null);
  readonly groupId = input<string | null>(null);
  /** Upcoming › / History › tapped on a phone (the card / page opens the full list). */
  readonly upcoming = output<void>();
  readonly history = output<void>();

  // Desktop: each list folds / unfolds on its own (phones: they open as a page).
  protected readonly desktop = !inject(DeviceDetectionService).isMobile();
  protected readonly open = signal<ReadonlySet<'upcoming' | 'history'>>(new Set());

  // A list's title: phones open it as a page, desktop folds / unfolds it in place.
  protected tapList(list: 'upcoming' | 'history'): void {
    if (!this.desktop) {
      if (list === 'upcoming') this.upcoming.emit();
      else this.history.emit();
      return;
    }
    const next = new Set(this.open());
    if (next.has(list)) next.delete(list);
    else next.add(list);
    this.open.set(next);
  }

  private groups = inject(GroupService);
  private events = inject(EventService);
  private people = inject(EventPeople);
  private i18n = inject(I18nService);

  // The next lesson and the last one.
  private readonly mine = computed(() => {
    const sid = this.studentId();
    const gid = this.groupId();
    return this.events.events().filter((e) => (sid && this.people.invites(e, sid)) || (gid && e.groupIds.includes(gid)));
  });
  protected readonly nextEvent = computed(
    () =>
      this.mine()
        .filter((e) => eventEnd(e).getTime() >= Date.now())
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0] ?? null,
  );
  protected readonly lastEvent = computed(
    () =>
      this.mine()
        .filter((e) => eventEnd(e).getTime() < Date.now())
        .sort((a, b) => b.startsAt.localeCompare(a.startsAt))[0] ?? null,
  );

  // The calendar icon and the time lines
  protected start(e: ScheduleEvent): Date {
    return new Date(e.startsAt);
  }
  protected startTime(e: ScheduleEvent): string {
    return this.i18n.time(new Date(e.startsAt));
  }
  protected endTime(e: ScheduleEvent): string {
    return this.i18n.time(eventEnd(e));
  }
  // Beside the calendar: the event's title, else its groups (for a group: just the title).
  protected context(e: ScheduleEvent): string {
    if (e.title) return e.title;
    if (this.groupId()) return '';
    return e.groupIds
      .map((id) => this.groups.byId(id)?.name)
      .filter((n): n is string => !!n)
      .join(', ');
  }
}

/**
 * A student, for reading — like an iOS contact: on desktop the name on the left with Email / Call
 * and [headerEnd] (e.g. Edit) at the top right (phones: the name is in the card's top bar); their
 * lessons (LessonsCard), then the phone and email (label over value). (No materials for now.)
 */
@Component({
  selector: 'app-student-view',
  imports: [LessonsCard, TranslatePipe],
  host: { class: 'relative flex flex-col gap-4' },
  template: `
    @let s = student();
    <!-- Desktop: Email / Call in a row with [headerEnd] (Edit), top right -->
    <div class="absolute right-0 top-0 z-[6] flex items-center gap-2">
      <a [attr.href]="s.email ? 'mailto:' + s.email : null" [attr.title]="s.email" class="btn-primary mobile:hidden" [class.is-off]="!s.email">
        {{ 'students.actionMail' | t }}
      </a>
      <a [attr.href]="s.phone ? 'tel:' + s.phone : null" [attr.title]="s.phone" class="btn-primary mobile:hidden" [class.is-off]="!s.phone">
        {{ 'students.actionCall' | t }}
      </a>
      <ng-content select="[headerEnd]" />
    </div>
    <!-- Desktop: the name on the left, in line with the Edit button beside it
         (phones: it's in the card's top bar) -->
    <div class="person-head mobile:hidden desktop:items-start desktop:pr-80 desktop:text-left">
      <div class="flex min-w-0 max-w-full desktop:h-[var(--control-h)] desktop:items-center">
        <h1 class="truncate text-xl font-semibold leading-tight">{{ s.name }}</h1>
      </div>
    </div>

    <app-lessons-card [studentId]="s.id" (upcoming)="upcoming.emit()" (history)="history.emit()" />

    <!-- At the bottom, like an iOS contact: the phone and email, a small label over the value
         (a tap calls / writes) -->
    @if (s.phone || s.email) {
      <div class="flex flex-col gap-1.5">
      <span class="card-label">{{ 'students.contact' | t }}</span>
      <div class="card">
        @if (s.phone) {
          <a [href]="'tel:' + s.phone" class="list-row py-2.5">
            <span class="contact-field">
              <span>{{ 'students.phone' | t }}</span>
              <b class="tabular-nums">{{ s.phone }}</b>
            </span>
          </a>
        }
        @if (s.email) {
          <a [href]="'mailto:' + s.email" class="list-row py-2.5">
            <span class="contact-field">
              <span>{{ 'students.email' | t }}</span>
              <b>{{ s.email }}</b>
            </span>
          </a>
        }
      </div>
      </div>
    }
  `,
})
export class StudentView {
  readonly student = input.required<Student>();
  readonly editable = input(true);
  /** Upcoming › / History › tapped on a phone (the card / page opens the full list). */
  readonly upcoming = output<void>();
  readonly history = output<void>();
}

/**
 * A group, for reading, like a student: on desktop the name and member count on the left with
 * [headerEnd] (e.g. Edit) at the top right (phones: the name is in the card's top bar); its
 * lessons (LessonsCard), then the members. (No materials for now.)
 */
@Component({
  selector: 'app-group-view',
  imports: [GroupMembers, Icon, LessonsCard],
  host: { class: 'relative flex flex-col gap-4' },
  template: `
    @let g = group();
    <div class="absolute right-0 top-0 z-[6] flex items-center gap-2"><ng-content select="[headerEnd]" /></div>
    <!-- Desktop: the name on the left, as tall as the Edit button beside it
         (phones: it's in the card's top bar) -->
    <div class="person-head mobile:hidden desktop:items-start desktop:pr-24 desktop:text-left">
      <div class="flex min-w-0 max-w-full items-center gap-3 desktop:h-[var(--control-h)]">
        <h1 class="truncate text-xl font-semibold leading-tight">{{ g.name }}</h1>
        <p class="text-footnote flex items-center gap-1 tabular-nums opacity-60">
          <app-icon name="person" class="size-3.5" />{{ g.studentIds.length }}
        </p>
      </div>
    </div>

    <app-lessons-card [groupId]="g.id" (upcoming)="upcoming.emit()" (history)="history.emit()" />

    <app-group-members [studentIds]="g.studentIds" />
  `,
})
export class GroupView {
  readonly group = input.required<Group>();
  readonly editable = input(true);
  /** Upcoming › / History › tapped on a phone (the card / page opens the full list). */
  readonly upcoming = output<void>();
  readonly history = output<void>();
}
