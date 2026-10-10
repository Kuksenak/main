import { NgTemplateOutlet } from '@angular/common';
import { Component, ElementRef, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { BrandIcon } from '../core/ui/icon/brand-icon';
import { Icon } from '../core/ui/icon/icon';
import { LessonService } from '../lessons/lesson.service';
import { EventPeople } from '../schedule/event-people';
import { EventService, ScheduleEvent, eventEnd, occurrenceKey } from '../schedule/event.service';
import { Group, GroupService } from '../students/group.service';
import { Student, StudentService } from '../students/student.service';
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
  host: { class: 'flex flex-col gap-4' },
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
              <span class="truncate opacity-50">· {{ c }}</span>
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

    <!-- Lessons under their months (upcoming soonest first, past most recent first) -->
    <ng-template #byMonth let-months let-label="label">
      <div class="flex flex-col gap-1.5">
        @if (listLabels()) {
          <span class="card-label">{{ label | t }}</span>
        }
        @for (m of months; track m.label) {
          <span class="text-footnote mt-1 px-0.5 capitalize opacity-50">{{ m.label }}</span>
          <div class="card">
            @for (e of m.events; track key(e)) {
              <div class="list-row !items-start">
                <span class="date-tile">
                  <b>{{ day(e) }}</b>
                  <small>{{ weekday(e) }}</small>
                </span>
                <span class="flex min-w-0 flex-1 flex-col gap-1.5">
                  <span class="flex flex-wrap items-baseline gap-x-2">
                    <span class="tabular-nums">{{ time(e) }}</span>
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
                  } @else {
                    <span class="text-footnote opacity-35">{{ 'people.nothingAttached' | t }}</span>
                  }
                </span>
              </div>
            }
          </div>
        }
      </div>
    </ng-template>

    @if (showUpcoming()) {
      @if (upcomingByMonth().length) {
        <ng-container [ngTemplateOutlet]="byMonth" [ngTemplateOutletContext]="{ $implicit: upcomingByMonth(), label: 'students.upcoming' }" />
      } @else {
        <p class="text-footnote opacity-50">{{ 'students.noEvents' | t }}</p>
      }
    }
    @if (showPast()) {
      @if (pastByMonth().length) {
        <ng-container [ngTemplateOutlet]="byMonth" [ngTemplateOutletContext]="{ $implicit: pastByMonth(), label: 'people.pastLessons' }" />
      } @else {
        <p class="text-footnote opacity-50">{{ 'students.noEvents' | t }}</p>
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
  readonly lessonIdsChange = output<string[]>();

  private events = inject(EventService);
  private people = inject(EventPeople);
  private groups = inject(GroupService);
  private lessons = inject(LessonService);
  private i18n = inject(I18nService);

  protected readonly picking = signal(false);
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

  protected time(e: ScheduleEvent): string {
    return `${this.i18n.time(new Date(e.startsAt))}–${this.i18n.time(eventEnd(e))}`;
  }

}

/**
 * A student, for reading — like an iOS contact, on phones and desktop alike: the name centered, Email / Call tiles, the phone and email (label
 * over value), History › with the last lesson under it (`history` opens the full list), then
 * their materials. [headerEnd] (e.g. Edit on desktop) sits at the top right.
 */
@Component({
  selector: 'app-student-view',
  imports: [BrandIcon, Icon, PersonLessons, TranslatePipe],
  host: { class: 'relative flex flex-col gap-4' },
  template: `
    @let s = student();
    <div class="absolute right-0 top-0 z-[6] flex items-center gap-2"><ng-content select="[headerEnd]" /></div>
    <div class="person-head">
      <div class="min-w-0 max-w-full">
        <h1 class="truncate text-[1.75rem] font-semibold leading-tight">{{ s.name }}</h1>
      </div>
    </div>

    <!-- Email / Call tiles -->
    <div class="grid grid-cols-2 gap-2">
      <a [attr.href]="s.email ? 'mailto:' + s.email : null" class="contact-action" [class.is-off]="!s.email">
        <app-icon name="mail" [strokeWidth]="1.75" class="size-6" />
        {{ 'students.actionMail' | t }}
      </a>
      <a [attr.href]="s.phone ? 'tel:' + s.phone : null" class="contact-action" [class.is-off]="!s.phone">
        <app-icon name="call" [strokeWidth]="1.75" class="size-6" />
        {{ 'students.actionCall' | t }}
      </a>
    </div>

    <!-- The phone and email: a small label over the value (iOS) -->
    @if (s.phone || s.email) {
      <div class="card">
        @if (s.phone) {
          <a [href]="'tel:' + s.phone" class="list-row contact-field">
            <span>{{ 'students.phone' | t }}</span>
            <b class="tabular-nums">{{ s.phone }}</b>
          </a>
        }
        @if (s.email) {
          <a [href]="'mailto:' + s.email" class="list-row contact-field">
            <span>{{ 'students.email' | t }}</span>
            <b>{{ s.email }}</b>
          </a>
        }
      </div>
    }

    <!-- Two blocks: Upcoming › with the next lesson under it, Past lessons › with the last one (a
         tap opens the full list); each only when there's something in it -->
    @if (nextEvent(); as e) {
    <button type="button" (click)="upcoming.emit()" class="card flex w-full flex-col text-left">
      <span class="list-row">
        <span class="min-w-0 flex-1 font-medium">{{ 'students.upcoming' | t }}</span>
        <app-icon name="chevron-right" class="row-chevron" />
      </span>
      <!-- The next lesson: the calendar icon, its title and lessons (plain text), marks, start over end -->
      <span class="list-row !gap-3.5 py-3">
        <app-brand-icon name="calendar" [date]="start(e)" class="size-14 shrink-0" />
        <!-- The event's title (else its groups) and the attached lessons' names -->
        <span class="flex min-w-0 flex-1 flex-col gap-1.5">
          @if (context(e); as c) {
            <span class="truncate font-medium">{{ c }}</span>
          }
          @if (lessonTitles(e).length) {
            <span class="text-footnote truncate opacity-50">{{ lessonTitles(e).join(', ') }}</span>
          }
        </span>
        <!-- ⟲ repeating over 📎 lessons attached, just left of the time (as in the schedule) -->
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
        <!-- Start over end (the end lighter), as in the schedule -->
        <span class="text-callout shrink-0 text-right leading-tight tabular-nums">
          <span class="block font-medium">{{ startTime(e) }}</span>
          <span class="block opacity-50">{{ endTime(e) }}</span>
        </span>
      </span>
    </button>
    }
    @if (lastLabel()) {
    <button type="button" (click)="history.emit()" class="card flex w-full flex-col text-left">
      <span class="list-row">
        <span class="min-w-0 flex-1 font-medium">{{ 'people.history' | t }}</span>
        <app-icon name="chevron-right" class="row-chevron" />
      </span>
      <span class="list-row text-[var(--text-secondary)] tabular-nums">{{ lastLabel() }}</span>
    </button>
    }

    <app-person-lessons
      [studentId]="s.id"
      [lessonIds]="s.lessonIds"
      [editable]="editable()"
      [showNext]="false"
      [showPast]="false"
      (lessonIdsChange)="students.setLessons(s.id, $event)"
    />
  `,
})
export class StudentView {
  readonly student = input.required<Student>();
  readonly editable = input(true);
  /** Upcoming › / History › tapped (the card / page opens the full list). */
  readonly upcoming = output<void>();
  readonly history = output<void>();

  protected students = inject(StudentService);
  private groups = inject(GroupService);
  private lessons = inject(LessonService);
  private events = inject(EventService);
  private people = inject(EventPeople);
  private i18n = inject(I18nService);

  // Under Upcoming: the next lesson; under Past lessons: the last one ("Mon, 13 Oct · 18:00–19:00").
  private readonly mine = computed(() => {
    const id = this.student().id;
    return this.events.events().filter((e) => this.people.invites(e, id));
  });
  protected readonly nextEvent = computed(
    () =>
      this.mine()
        .filter((e) => eventEnd(e).getTime() >= Date.now())
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0] ?? null,
  );
  protected readonly lastLabel = computed(() =>
    this.when(
      this.mine()
        .filter((e) => eventEnd(e).getTime() < Date.now())
        .sort((a, b) => b.startsAt.localeCompare(a.startsAt))[0],
    ),
  );

  // The next lesson's calendar icon and lines
  protected start(e: ScheduleEvent): Date {
    return new Date(e.startsAt);
  }
  protected startTime(e: ScheduleEvent): string {
    return this.i18n.time(new Date(e.startsAt));
  }
  protected endTime(e: ScheduleEvent): string {
    return this.i18n.time(eventEnd(e));
  }
  // Beside the calendar: the event's title, else its groups.
  protected context(e: ScheduleEvent): string {
    return (
      e.title ||
      e.groupIds
        .map((id) => this.groups.byId(id)?.name)
        .filter((n): n is string => !!n)
        .join(', ')
    );
  }
  protected lessonTitles(e: ScheduleEvent): string[] {
    return e.lessonIds.map((id) => this.lessons.byId(id)?.title).filter((t): t is string => !!t);
  }

  private when(e: ScheduleEvent | undefined): string {
    if (!e) return '';
    const start = new Date(e.startsAt);
    const day = this.i18n.date(start, { weekday: 'short', day: 'numeric', month: 'short' });
    return `${day} · ${this.i18n.time(start)}–${this.i18n.time(eventEnd(e))}`;
  }
}

/** A group, for reading: its color avatar, the name and member count; its lessons; members. */
@Component({
  selector: 'app-group-view',
  imports: [GroupMembers, Icon, PersonLessons],
  host: { class: 'relative flex flex-col gap-4' },
  template: `
    @let g = group();
    <div class="absolute right-0 top-0 z-[6] flex items-center gap-2"><ng-content select="[headerEnd]" /></div>
    <div class="person-head">
      <div class="min-w-0 max-w-full">
        <h1 class="truncate text-[1.75rem] font-semibold leading-tight">{{ g.name }}</h1>
        <p class="text-footnote mt-1 flex items-center justify-center gap-1 tabular-nums opacity-60">
          <app-icon name="person" class="size-3.5" />{{ g.studentIds.length }}
        </p>
      </div>
    </div>

    <app-person-lessons [groupId]="g.id" [lessonIds]="g.lessonIds" [editable]="editable()" (lessonIdsChange)="groups.setLessons(g.id, $event)" />
    <app-group-members [studentIds]="g.studentIds" />
  `,
})
export class GroupView {
  readonly group = input.required<Group>();
  readonly editable = input(true);

  protected groups = inject(GroupService);
}
