import { Component, DestroyRef, ElementRef, computed, inject, output, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter, map } from 'rxjs';
import { AuthStore } from '../auth/auth.store';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { TranslationKey } from '../core/i18n/translations';
import { NavStack } from '../core/services/nav-stack.service';
import { NotificationsService } from '../core/services/notifications.service';
import { UpdateService } from '../core/services/update.service';
import { EscStack } from '../core/ui/esc-stack';
import { Icon, IconName } from '../core/ui/icon/icon';
import { ScrollArea } from '../core/ui/scroll-area/scroll-area';
import { Sheet } from '../core/ui/sheet/sheet';
import { Tip } from '../core/ui/tip';
import { LessonUsage } from '../lessons/lesson-usage';
import { LessonService, levelColor } from '../lessons/lesson.service';
import { EventService, ScheduleEvent } from '../schedule/event.service';
import { EventPeople } from '../schedule/event-people';
import { GroupService, colorVar } from '../students/group.service';
import { StudentService } from '../students/student.service';

type Section = 'upcoming' | 'people' | 'lessons';
const FOLDED_KEY = 'sidebar.folded';

/** A search result: a lesson, a student or a group. */
interface Found {
  kind: 'lesson' | 'student' | 'group';
  id: string;
  name: string;
  dot: string | null;
  hint: string;
}

/**
 * Desktop: the app's one sidebar, as Notion's — Search (Ctrl+K: a window finding lessons,
 * students and groups), the pages (Schedule, Students, Lessons), then sections that fold: the next
 * few events, students and groups, lessons; ✎ by Search makes a new event / group / student /
 * lesson; the account (its
 * email) at the bottom, `account` opening the settings by it.
 */
@Component({
  selector: 'app-sidebar',
  imports: [Icon, RouterLink, RouterLinkActive, ScrollArea, Sheet, Tip, TranslatePipe],
  host: { class: 'flex w-60 shrink-0 flex-col bg-[var(--side-bg)]' },
  template: `
    <div class="flex shrink-0 flex-col gap-2 px-2 pb-1 pt-2">
      <!-- The top row (as Notion's): hide the sidebar; the inbox (notifications; a dot for a new one),
           ✎ — new: an event, a group, a student, a lesson -->
      <div class="flex h-7 items-center gap-0.5">
        <button type="button" (click)="hide.emit()" [appTip]="'sidebar.hide' | t" tipSide="bottom" [attr.aria-label]="'sidebar.hide' | t" class="side-icon">
          <app-icon name="sidebar" />
        </button>
        <span class="flex-1"></span>
        <a routerLink="/notifications" (click)="unseen.set(false)" [appTip]="'sidebar.inbox' | t" tipSide="bottom" [attr.aria-label]="'sidebar.inbox' | t" class="side-icon relative">
          <app-icon name="inbox" />
          @if (unseen()) {
            <span class="absolute right-1 top-1 size-1.5 rounded-full bg-[var(--accent)]"></span>
          }
        </a>
        <button #newBtn type="button" (click)="newOpen.set(!newOpen())" [appTip]="('sidebar.new' | t) + '  Ctrl+Alt+N'" tipSide="bottom" [attr.aria-label]="'sidebar.new' | t" [attr.aria-expanded]="newOpen()" class="side-icon">
          <app-icon name="compose" />
        </button>
      </div>
      <!-- Search: a field (as Notion's), its shortcut in a chip -->
      <button type="button" (click)="openSearch()" class="flex h-8 w-full items-center gap-2 rounded-lg border-[0.5px] border-[var(--separator)] bg-transparent px-2.5 text-left text-[0.875rem] hover:bg-[var(--tint)]">
        <span class="flex-1 opacity-50">{{ 'students.search' | t }}</span>
        <span class="rounded bg-[var(--fill-strong)] px-1.5 py-px text-[0.6875rem] font-medium opacity-60">Ctrl+K</span>
      </button>
    </div>

    <!-- (room at the right for its scroll thumb: inside the sidebar, not over its edge) -->
    <!-- (room at the right for its scroll thumb: inside the sidebar, not over its edge) -->
    <app-scroll-area class="min-h-0 flex-1 pr-2" viewportClass="!rounded-none" contentClass="gap-px pb-3 pl-2 pt-2">
      <!-- Calendar: the schedule -->
      <div routerLink="/schedule" routerLinkActive="is-on" role="link" tabindex="0" class="side-row cursor-pointer">
        <span class="flex-1 text-[color-mix(in_srgb,var(--text)_50%,transparent)]">{{ 'sidebar.calendar' | t }}</span>
        <a routerLink="/schedule" (click)="$event.stopPropagation()" [appTip]="'sidebar.calendar' | t" tipSide="right" [attr.aria-label]="'sidebar.calendar' | t" class="side-add"><app-icon name="arrow-up-right" class="size-4" /></a>
        <button type="button" (click)="$event.stopPropagation(); create('event')" [appTip]="'sidebar.newEvent' | t" tipSide="right" [attr.aria-label]="'sidebar.newEvent' | t" class="side-add"><app-icon name="plus" class="size-3.5" /></button>
      </div>

      <!-- Sections (as Notion's): a head folds them (+ on hover adds); the first 5, then View all -->
      <div class="side-head group mt-1.5">
        <button type="button" (click)="fold('upcoming')" [attr.aria-expanded]="!folded().includes('upcoming')" class="flex flex-1 items-center gap-1 text-left">
          <app-icon name="chevron-down" class="size-4 shrink-0 opacity-40 transition group-hover:opacity-70" [class.-rotate-90]="folded().includes('upcoming')" />
          {{ 'sidebar.upcoming' | t }}
        </button>
      </div>
      @if (!folded().includes('upcoming')) {
        @for (e of upcoming(); track e.id + e.startsAt) {
          <button type="button" (click)="openEvent(e)" class="side-row">
            <span class="w-[4.5rem] shrink-0 text-[0.8125rem] tabular-nums opacity-50">{{ when(e) }}</span>
            <span class="min-w-0 flex-1 truncate">{{ people.label(e) || e.title }}</span>
          </button>
        } @empty {
          <p class="text-footnote px-2 py-1 opacity-40">{{ 'sidebar.nothingSoon' | t }}</p>
        }
      }

      <div class="side-head group mt-1.5">
        <button type="button" (click)="fold('lessons')" [attr.aria-expanded]="!folded().includes('lessons')" class="flex flex-1 items-center gap-1 text-left">
          <app-icon name="chevron-down" class="size-4 shrink-0 opacity-40 transition group-hover:opacity-70" [class.-rotate-90]="folded().includes('lessons')" />
          {{ 'sidebar.library' | t }}
        </button>
        <a routerLink="/lessons" [appTip]="'sidebar.viewAll' | t" tipSide="right" [attr.aria-label]="'sidebar.viewAll' | t" class="side-add"><app-icon name="arrow-up-right" class="size-4" /></a>
        <button type="button" (click)="create('lesson')" [appTip]="'lessons.add' | t" tipSide="right" [attr.aria-label]="'lessons.add' | t" class="side-add"><app-icon name="plus" class="size-3.5" /></button>
      </div>
      @if (!folded().includes('lessons')) {
        @for (l of lessonsShown(); track l.id) {
          <a [routerLink]="['/lessons', l.id]" [appTip]="useHint(l.id)" tipSide="right" class="side-row !pl-7" [class.is-on]="openLesson() === l.id">
            <app-icon name="page" class="side-glyph" [style.color]="glyphColor(levelColor(l.level))" />
            <span class="min-w-0 flex-1 truncate">{{ l.title }}</span>
          </a>
        }
        <a routerLink="/lessons" class="side-row !pl-7 opacity-60"><app-icon name="dots" class="side-glyph" /><span class="flex-1">{{ 'sidebar.viewAll' | t }}</span></a>
      }

      <div class="side-head group mt-1.5">
        <button type="button" (click)="fold('people')" [attr.aria-expanded]="!folded().includes('people')" class="flex flex-1 items-center gap-1 text-left">
          <app-icon name="chevron-down" class="size-4 shrink-0 opacity-40 transition group-hover:opacity-70" [class.-rotate-90]="folded().includes('people')" />
          {{ 'sidebar.people' | t }}
        </button>
        <a routerLink="/students" [appTip]="'sidebar.viewAll' | t" tipSide="right" [attr.aria-label]="'sidebar.viewAll' | t" class="side-add"><app-icon name="arrow-up-right" class="size-4" /></a>
        <button type="button" (click)="create('student')" [appTip]="'sidebar.newStudent' | t" tipSide="right" [attr.aria-label]="'sidebar.newStudent' | t" class="side-add"><app-icon name="plus" class="size-3.5" /></button>
      </div>
      @if (!folded().includes('people')) {
        @for (r of peopleShown(); track r.kind + r.id) {
          <a [routerLink]="['/students', r.kind, r.id]" routerLinkActive="is-on" class="side-row !pl-7">
            @if (r.kind === 'group') {
              <app-icon name="people" class="side-glyph" [style.color]="glyphColor(r.color)" />
            } @else {
              <app-icon name="person" class="side-glyph" />
            }
            <span class="min-w-0 flex-1 truncate">{{ r.name }}</span>
          </a>
        }
        <a routerLink="/students" class="side-row !pl-7 opacity-60"><app-icon name="dots" class="side-glyph" /><span class="flex-1">{{ 'sidebar.viewAll' | t }}</span></a>
      }
    </app-scroll-area>

    <!-- The account: its email; the settings open by it -->
    <div class="shrink-0 border-t-[0.5px] border-[var(--separator)] px-2 py-2">
      <button #accountBtn type="button" (click)="account.emit(accountBtn)" class="side-row">
        <span class="relative flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[0.6875rem] font-semibold uppercase text-white">
          {{ (auth.email() ?? '?').charAt(0) }}
          @if (updates.updateReady()) {
            <span class="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-[var(--success)] ring-2 ring-[var(--app-bg)]"></span>
          }
        </span>
        <span class="min-w-0 flex-1 truncate">{{ auth.email() }}</span>
      </button>
    </div>

    <!-- ✎'s menu (out of the column: no room taken in it) -->
    @if (newOpen()) {
      <app-sheet [origin]="newAnchor()?.nativeElement ?? null" [fit]="true" (closed)="newOpen.set(false)">
        <div class="menu-list">
          <button type="button" (click)="create('event')" class="menu-item"><app-icon name="calendar" /><span class="flex-1">{{ 'sidebar.newEvent' | t }}</span></button>
          <button type="button" (click)="create('group')" class="menu-item"><app-icon name="people" /><span class="flex-1">{{ 'sidebar.newGroup' | t }}</span></button>
          <button type="button" (click)="create('student')" class="menu-item"><app-icon name="person" /><span class="flex-1">{{ 'sidebar.newStudent' | t }}</span></button>
          <button type="button" (click)="create('lesson')" class="menu-item"><app-icon name="page" /><span class="flex-1">{{ 'lessons.add' | t }}</span></button>
        </div>
      </app-sheet>
    }

    <!-- New (Ctrl+Alt+N): a window in the middle — Event, Group, Student, Lesson; ↑ ↓ Enter, or a
         first letter -->
    @if (newWindow()) {
      <div class="fixed inset-0 z-[2200] flex items-start justify-center bg-[var(--backdrop)] pt-[18vh] [animation:fadeIn_150ms_ease-out]" (mousedown)="closeNewWindow()">
        <div #newBox tabindex="-1" (keydown)="newKey($event)" class="dialog-panel flex w-80 max-w-[90vw] flex-col !rounded-xl p-1.5 outline-none [animation:dropdownIn_160ms_var(--ease-out-quick)]" (mousedown)="$event.stopPropagation()">
          <p class="px-2.5 pb-1 pt-1.5 text-[0.75rem] font-medium opacity-50">{{ 'sidebar.new' | t }}</p>
          @for (c of newChoices; track c.kind; let k = $index) {
            <button type="button" (click)="closeNewWindow(); create(c.kind)" (mouseenter)="newIndex.set(k)" class="flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-left text-[0.875rem]" [class.bg-[var(--highlight)]]="k === newIndex()">
              <app-icon [name]="c.icon" class="side-glyph" />
              <span class="flex-1">{{ c.label | t }}</span>
              <span class="rounded bg-[var(--fill-strong)] px-1.5 py-px text-[0.6875rem] font-medium opacity-55">{{ c.key }}</span>
            </button>
          }
        </div>
      </div>
    }

    <!-- The search window (as Notion's): in the middle, near the top -->
    @if (searchOpen()) {
      <div class="fixed inset-0 z-[2200] flex items-start justify-center bg-[var(--backdrop)] pt-[12vh] [animation:fadeIn_150ms_ease-out]" (mousedown)="closeSearch()">
        <div class="dialog-panel flex max-h-[70vh] w-[36rem] max-w-[90vw] flex-col overflow-hidden !rounded-xl [animation:dropdownIn_160ms_var(--ease-out-quick)]" (mousedown)="$event.stopPropagation()">
          <label class="flex h-12 shrink-0 items-center gap-2.5 px-4">
            <app-icon name="search" class="size-[1.125rem] shrink-0 opacity-50" />
            <input
              #searchField
              [value]="query()"
              (input)="query.set($any($event.target).value); index.set(0)"
              (keydown)="searchKey($event)"
              type="text"
              [placeholder]="'students.search' | t"
              autocomplete="off"
              class="min-w-0 flex-1 bg-transparent text-[0.9375rem] outline-none placeholder:opacity-45"
            />
          </label>
          <div class="min-h-0 overflow-y-auto p-1.5">
            @for (f of found(); track f.kind + f.id; let k = $index) {
              <button type="button" (click)="pick(f)" (mouseenter)="index.set(k)" class="flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-left text-[0.875rem]" [class.bg-[var(--highlight)]]="k === index()">
                @if (f.kind === 'student') {
                  <app-icon name="person" class="size-4 shrink-0 opacity-55" />
                } @else {
                  <span class="mx-1 size-2 shrink-0 rounded-full" [style.background]="f.dot ?? 'color-mix(in srgb, var(--text) 22%, transparent)'"></span>
                }
                <span class="min-w-0 flex-1 truncate">{{ f.name }}</span>
                @if (f.hint) {
                  <span class="text-footnote shrink-0 opacity-45">{{ f.hint }}</span>
                }
              </button>
            } @empty {
              <p class="text-footnote px-2.5 py-3 opacity-45">{{ 'students.notFound' | t }}</p>
            }
          </div>
        </div>
      </div>
    }
  `,
})
export class Sidebar {
  /** The account row clicked (the settings open by it). */
  readonly account = output<HTMLElement>();
  /** Its "hide" button. */
  readonly hide = output<void>();

  // A notification come in since the inbox was last opened
  protected readonly unseen = signal(false);

  protected readonly auth = inject(AuthStore);
  protected readonly updates = inject(UpdateService);
  protected readonly router = inject(Router);
  protected readonly stack = inject(NavStack);
  protected readonly people = inject(EventPeople);
  protected readonly groups = inject(GroupService);
  private readonly students = inject(StudentService);
  private readonly lessons = inject(LessonService);
  private readonly events = inject(EventService);
  private readonly usage = inject(LessonUsage);
  private readonly i18n = inject(I18nService);
  protected readonly levelColor = levelColor;
  protected readonly colorVar = colorVar;

  protected readonly pages: { path: string; label: TranslationKey; icon: IconName }[] = [
    { path: '/schedule', label: 'nav.schedule', icon: 'calendar' },
    { path: '/students', label: 'nav.students', icon: 'people' },
    { path: '/lessons', label: 'nav.lessons', icon: 'book' },
  ];

  // The lesson open (its link), for its row's highlight
  protected readonly openLesson = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map(() => /^\/lessons\/([^/?#]+)/.exec(this.router.url)?.[1] ?? null),
    ),
    { initialValue: /^\/lessons\/([^/?#]+)/.exec(this.router.url)?.[1] ?? null },
  );

  protected readonly studentsSorted = computed(() => [...this.students.students()].sort((a, b) => a.name.localeCompare(b.name, this.i18n.locale())));
  // A section shows its first few (the open lesson too), then View all
  protected readonly shown = 5;
  protected readonly peopleAll = computed(() => [
    ...this.groups.groups().map((g) => ({ kind: 'group' as const, id: g.id, name: g.name, color: colorVar(g.color) as string | null })),
    ...this.studentsSorted().map((s) => ({ kind: 'student' as const, id: s.id, name: s.name, color: null })),
  ]);
  protected readonly peopleShown = computed(() => this.peopleAll().slice(0, this.shown));
  protected readonly lessonsShown = computed(() => {
    const all = this.lessonsSorted();
    const first = all.slice(0, this.shown);
    const open = all.find((l) => l.id === this.openLesson());
    return open && !first.includes(open) ? [...first, open] : first;
  });
  protected readonly lessonsSorted = computed(() => [...this.lessons.lessons()].sort((a, b) => a.title.localeCompare(b.title, this.i18n.locale())));

  // The next five events not over yet
  protected readonly upcoming = computed(() => {
    const now = Date.now();
    return this.events
      .events()
      .filter((e) => new Date(e.startsAt).getTime() + e.durationMinutes * 60000 > now)
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
      .slice(0, 5);
  });

  // "Mon 14:00"; today: "14:00"
  protected when(e: ScheduleEvent): string {
    const d = new Date(e.startsAt);
    const time = this.i18n.time(d);
    return new Date().toDateString() === d.toDateString() ? time : `${this.i18n.date(d, { weekday: 'short' })} ${time}`;
  }

  // Ctrl+Alt+N: the New window
  protected readonly newChoices: { kind: 'event' | 'group' | 'student' | 'lesson'; label: TranslationKey; icon: IconName; key: string }[] = [
    { kind: 'event', label: 'sidebar.newEvent', icon: 'calendar', key: 'E' },
    { kind: 'group', label: 'sidebar.newGroup', icon: 'people', key: 'G' },
    { kind: 'student', label: 'sidebar.newStudent', icon: 'person', key: 'S' },
    { kind: 'lesson', label: 'lessons.add', icon: 'page', key: 'L' },
  ];
  protected readonly newWindow = signal(false);
  protected readonly newIndex = signal(0);
  private readonly newBox = viewChild<ElementRef<HTMLElement>>('newBox');
  private offNewEsc: (() => void) | null = null;

  protected openNewWindow(): void {
    if (this.newWindow()) return;
    this.newOpen.set(false);
    this.newIndex.set(0);
    this.newWindow.set(true);
    this.offNewEsc = this.esc.push(() => this.closeNewWindow());
    setTimeout(() => this.newBox()?.nativeElement.focus());
  }

  protected closeNewWindow(): void {
    this.newWindow.set(false);
    this.offNewEsc?.();
    this.offNewEsc = null;
  }

  protected newKey(e: KeyboardEvent): void {
    const n = this.newChoices.length;
    const byKey = this.newChoices.find((c) => e.code === `Key${c.key}`);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      this.newIndex.set((this.newIndex() + (e.key === 'ArrowDown' ? 1 : n - 1)) % n);
    } else if (e.key === 'Enter' || (byKey && !e.ctrlKey && !e.metaKey && !e.altKey)) {
      e.preventDefault();
      const c = byKey ?? this.newChoices[this.newIndex()];
      this.closeNewWindow();
      this.create(c.kind);
    }
  }

  // ✎'s menu: a new event (today), group, student, lesson
  protected readonly newOpen = signal(false);
  protected readonly newAnchor = viewChild<ElementRef<HTMLButtonElement>>('newBtn');
  protected create(kind: 'event' | 'group' | 'student' | 'lesson'): void {
    this.newOpen.set(false);
    if (kind === 'lesson') {
      this.router.navigate(['/lessons', 'new']);
      return;
    }
    const today = new Date();
    const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    this.stack.push(kind === 'event' ? { kind, id: null, date } : { kind, id: null });
  }

  // A row icon's color from a pastel: deepened (thin lines in a pastel are hard to see)
  protected glyphColor(c: string | null | undefined): string | null {
    return c ? `color-mix(in srgb, ${c} 70%, var(--text))` : null;
  }

  protected openEvent(e: ScheduleEvent): void {
    this.stack.push({ kind: 'event', id: e.id, at: e.startsAt });
  }

  // Where a lesson's used: "Next Thu 16 Oct · Anna" (else last; never: none)
  protected useHint(id: string): string {
    const use = this.usage.of(id);
    const e = use.next ?? use.last;
    if (!e) return '';
    return `${this.i18n.t(use.next ? 'lessons.next' : 'lessons.last')} ${this.usage.day(e)} · ${this.usage.who(e)}`;
  }

  // ---- Folding sections (kept in this browser)
  protected readonly folded = signal<Section[]>(readFolded());
  protected fold(s: Section): void {
    this.folded.update((f) => (f.includes(s) ? f.filter((x) => x !== s) : [...f, s]));
    try {
      localStorage.setItem(FOLDED_KEY, JSON.stringify(this.folded()));
    } catch {
      // (storage off: just for this visit)
    }
  }

  // ---- The search window
  protected readonly searchOpen = signal(false);
  protected readonly query = signal('');
  protected readonly index = signal(0);
  private readonly searchField = viewChild<ElementRef<HTMLInputElement>>('searchField');
  private readonly esc = inject(EscStack);
  private offEsc: (() => void) | null = null;

  protected readonly found = computed<Found[]>(() => {
    const q = this.query().trim().toLocaleLowerCase();
    const has = (v: string | null | undefined) => !!v && v.toLocaleLowerCase().includes(q);
    const lessons: Found[] = this.lessons
      .lessons()
      .filter((l) => !q || has(l.title) || has(l.level) || l.blocks.some((b) => has(b.text) || has(b.url)))
      .map((l) => ({ kind: 'lesson', id: l.id, name: l.title, dot: levelColor(l.level), hint: this.useHint(l.id) }));
    const groups: Found[] = this.groups
      .groups()
      .filter((g) => !q || has(g.name))
      .map((g) => ({ kind: 'group', id: g.id, name: g.name, dot: colorVar(g.color) as string, hint: this.i18n.t('sidebar.group') }));
    const students: Found[] = this.students
      .students()
      .filter((s) => !q || has(s.name) || has(s.email))
      .map((s) => ({ kind: 'student', id: s.id, name: s.name, dot: null, hint: s.email ?? '' }));
    // (names that match first)
    return [...lessons, ...groups, ...students]
      .sort((a, b) => (q ? Number(!has(a.name)) - Number(!has(b.name)) : 0) || a.name.localeCompare(b.name, this.i18n.locale()))
      .slice(0, 60);
  });

  protected openSearch(): void {
    if (this.searchOpen()) return;
    this.query.set('');
    this.index.set(0);
    this.searchOpen.set(true);
    this.offEsc = this.esc.push(() => this.closeSearch());
    setTimeout(() => this.searchField()?.nativeElement.focus());
  }

  protected closeSearch(): void {
    this.searchOpen.set(false);
    this.offEsc?.();
    this.offEsc = null;
  }

  protected pick(f: Found): void {
    this.closeSearch();
    if (f.kind === 'lesson') this.router.navigate(['/lessons', f.id]);
    else this.router.navigate(['/students', f.kind, f.id]);
  }

  protected searchKey(e: KeyboardEvent): void {
    const n = this.found().length;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (n) this.index.set((this.index() + (e.key === 'ArrowDown' ? 1 : n - 1)) % n);
    } else if (e.key === 'Enter') {
      const f = this.found()[this.index()];
      if (f) this.pick(f);
    }
  }

  constructor() {
    const sub = inject(NotificationsService).received.subscribe(() => this.unseen.set(true));
    inject(DestroyRef).onDestroy(() => sub.unsubscribe());
    // Ctrl+K / ⌘K: the search window
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyK') {
        e.preventDefault();
        this.openSearch();
      }
      // Ctrl+Alt+N / ⌘⌥N: ✎'s menu (Ctrl+N is the browser's own: a new window)
      if ((e.ctrlKey || e.metaKey) && e.altKey && e.code === 'KeyN') {
        e.preventDefault();
        this.openNewWindow();
      }
    };
    document.addEventListener('keydown', onKey);
    inject(DestroyRef).onDestroy(() => {
      document.removeEventListener('keydown', onKey);
      this.offEsc?.();
    });
  }
}

function readFolded(): Section[] {
  try {
    const v = JSON.parse(localStorage.getItem(FOLDED_KEY) ?? '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
