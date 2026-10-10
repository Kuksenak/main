import { Component, ElementRef, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { DeviceDetectionService } from '../core/services/device-detection.service';
import { NavStack } from '../core/services/nav-stack.service';
import { Icon } from '../core/ui/icon/icon';
import { initial } from '../core/utils/text';
import { LessonService } from '../lessons/lesson.service';
import { EventPeople } from '../schedule/event-people';
import { EventService, ScheduleEvent, eventEnd, occurrenceKey } from '../schedule/event.service';
import { Group, GroupService, colorVar } from '../students/group.service';
import { Student, StudentService } from '../students/student.service';
import { PickList, PickSection } from './pick-list';
import { GroupMembers } from './related-lists';

/**
 * A person's / group's lessons, the way the student page shows them: the next lesson as a card
 * (date tile, time, who else, what's attached), their own materials (attached lessons, Attach),
 * then every past lesson by month with what was attached to it. A tap on a lesson opens its
 * event card; on a material, the lesson.
 */
@Component({
  selector: 'app-person-lessons',
  imports: [Icon, PickList, TranslatePipe],
  host: { class: 'flex flex-col gap-4' },
  template: `
    <!-- Next lesson -->
    @if (next(); as e) {
      <button type="button" (click)="open(e)" class="next-lesson">
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
                <span class="lesson-chip"><app-icon name="book" [strokeWidth]="1.75" class="size-3.5 opacity-60" />{{ t }}</span>
              }
            </span>
          }
        </span>
      </button>
    }

    <!-- Materials: lessons attached to the person / group -->
    @if (materials().length || editable()) {
      <div class="flex flex-col gap-1.5">
        <span class="card-label">{{ 'people.materials' | t }}</span>
        <div class="card">
          @for (l of materials(); track l.id) {
            <button type="button" (click)="openLesson(l.id)" class="list-row w-full text-left">
              <app-icon name="book" [strokeWidth]="1.75" class="size-[1.125rem] opacity-50" />
              <span class="min-w-0 flex-1 truncate">{{ l.title }}</span>
              <app-icon name="chevron-right" class="row-chevron" />
            </button>
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

    <!-- Past lessons by month -->
    @if (pastByMonth().length) {
      <div class="flex flex-col gap-1.5">
        <span class="card-label">{{ 'people.pastLessons' | t }}</span>
        @for (m of pastByMonth(); track m.label) {
          <span class="text-footnote mt-1 px-0.5 capitalize opacity-50">{{ m.label }}</span>
          <div class="card">
            @for (e of m.events; track key(e)) {
              <button type="button" (click)="open(e)" class="list-row w-full !items-start text-left">
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
                        <span class="lesson-chip"><app-icon name="book" [strokeWidth]="1.75" class="size-3.5 opacity-60" />{{ t }}</span>
                      }
                    </span>
                  } @else {
                    <span class="text-footnote opacity-35">{{ 'people.nothingAttached' | t }}</span>
                  }
                </span>
              </button>
            }
          </div>
        }
      </div>
    }

    @if (!next() && !pastByMonth().length) {
      <p class="text-footnote opacity-50">{{ 'students.noEvents' | t }}</p>
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
  readonly lessonIdsChange = output<string[]>();

  private events = inject(EventService);
  private people = inject(EventPeople);
  private groups = inject(GroupService);
  private lessons = inject(LessonService);
  private i18n = inject(I18nService);
  private stack = inject(NavStack);
  private router = inject(Router);
  private device = inject(DeviceDetectionService);

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
  // Past lessons, most recent first, under their month ("October", "September 2025").
  protected readonly pastByMonth = computed(() => {
    const thisYear = new Date().getFullYear();
    const out: { label: string; events: ScheduleEvent[] }[] = [];
    const past = this.mine()
      .filter((e) => eventEnd(e).getTime() < Date.now())
      .sort((a, b) => b.startsAt.localeCompare(a.startsAt));
    for (const e of past) {
      const d = new Date(e.startsAt);
      const label = this.i18n.date(d, d.getFullYear() === thisYear ? { month: 'long' } : { month: 'long', year: 'numeric' });
      const last = out.at(-1);
      if (last?.label === label) last.events.push(e);
      else out.push({ label, events: [e] });
    }
    return out;
  });

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

  protected open(e: ScheduleEvent): void {
    this.stack.push({ kind: 'event', id: e.id, at: e.startsAt });
  }

  // A material: a card on top on phones, the lesson's page on desktop.
  protected openLesson(id: string): void {
    if (this.device.isMobile()) {
      this.stack.push({ kind: 'lesson', id });
    } else {
      this.stack.clear();
      this.router.navigate(['/lessons', id]);
    }
  }
}

/**
 * A student, for reading — the same on phones and desktop (a card on top). Header: avatar, name,
 * their groups as colored dots; desktop: Email / Call (and [headerEnd], e.g. Edit) on its right,
 * phones: Email / Call tiles under it. Then their lessons (PersonLessons).
 */
@Component({
  selector: 'app-student-view',
  imports: [Icon, PersonLessons, TranslatePipe],
  host: { class: 'flex flex-col gap-4' },
  template: `
    @let s = student();
    <div class="person-head">
      <span class="avatar size-14 text-xl">{{ initial(s.name) }}</span>
      <div class="min-w-0 desktop:flex-1">
        <h1 class="truncate text-xl font-semibold leading-tight">{{ s.name }}</h1>
        @if (groups().length) {
          <p class="text-footnote mt-1 flex flex-wrap gap-x-2.5 gap-y-0.5 opacity-60 mobile:justify-center">
            @for (g of groups(); track g.id) {
              <span class="inline-flex items-center gap-1.5"><span class="dot size-2" [style.background]="colorVar(g.color)"></span>{{ g.name }}</span>
            }
          </p>
        }
      </div>
      <!-- Desktop: Email / Call beside the name -->
      <div class="flex shrink-0 items-center gap-2 mobile:hidden">
        <a [attr.href]="s.email ? 'mailto:' + s.email : null" [attr.title]="s.email" class="btn-secondary gap-1.5 !text-[var(--accent)]" [class.is-off]="!s.email">
          <app-icon name="mail" [strokeWidth]="1.75" class="size-4" />{{ 'students.actionMail' | t }}
        </a>
        <a [attr.href]="s.phone ? 'tel:' + s.phone : null" [attr.title]="s.phone" class="btn-secondary gap-1.5 !text-[var(--accent)]" [class.is-off]="!s.phone">
          <app-icon name="call" [strokeWidth]="1.75" class="size-4" />{{ 'students.actionCall' | t }}
        </a>
        <ng-content select="[headerEnd]" />
      </div>
    </div>

    <!-- Phones: Email / Call tiles -->
    <div class="grid grid-cols-2 gap-2 desktop:hidden">
      <a [attr.href]="s.email ? 'mailto:' + s.email : null" class="contact-action" [class.is-off]="!s.email">
        <app-icon name="mail" [strokeWidth]="1.75" class="size-6" />
        {{ 'students.actionMail' | t }}
      </a>
      <a [attr.href]="s.phone ? 'tel:' + s.phone : null" class="contact-action" [class.is-off]="!s.phone">
        <app-icon name="call" [strokeWidth]="1.75" class="size-6" />
        {{ 'students.actionCall' | t }}
      </a>
    </div>

    <app-person-lessons [studentId]="s.id" [lessonIds]="s.lessonIds" [editable]="editable()" (lessonIdsChange)="students.setLessons(s.id, $event)" />
  `,
})
export class StudentView {
  readonly student = input.required<Student>();
  readonly editable = input(true);

  protected students = inject(StudentService);
  private groupService = inject(GroupService);
  private i18n = inject(I18nService);
  protected readonly colorVar = colorVar;

  protected readonly groups = computed(() =>
    this.groupService.groups().filter((g) => g.studentIds.includes(this.student().id)),
  );

  protected initial(name: string): string {
    return initial(name, this.i18n.locale());
  }
}

/** A group, for reading: its color avatar, the name and member count; its lessons; members. */
@Component({
  selector: 'app-group-view',
  imports: [GroupMembers, Icon, PersonLessons],
  host: { class: 'flex flex-col gap-4' },
  template: `
    @let g = group();
    <div class="person-head">
      <span class="avatar size-14 text-xl text-[var(--accent-fg)]" [style.background]="colorVar(g.color)">{{ initial(g.name) }}</span>
      <div class="min-w-0 desktop:flex-1">
        <h1 class="truncate text-xl font-semibold leading-tight">{{ g.name }}</h1>
        <p class="text-footnote mt-1 flex items-center gap-1 tabular-nums opacity-60 mobile:justify-center">
          <app-icon name="person" class="size-3.5" />{{ g.studentIds.length }}
        </p>
      </div>
      <div class="flex shrink-0 items-center gap-2 mobile:hidden"><ng-content select="[headerEnd]" /></div>
    </div>

    <app-person-lessons [groupId]="g.id" [lessonIds]="g.lessonIds" [editable]="editable()" (lessonIdsChange)="groups.setLessons(g.id, $event)" />
    <app-group-members [studentIds]="g.studentIds" />
  `,
})
export class GroupView {
  readonly group = input.required<Group>();
  readonly editable = input(true);

  protected groups = inject(GroupService);
  private i18n = inject(I18nService);
  protected readonly colorVar = colorVar;

  protected initial(name: string): string {
    return initial(name, this.i18n.locale());
  }
}
