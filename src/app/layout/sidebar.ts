import { Component, DestroyRef, ElementRef, computed, inject, output, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter, map } from 'rxjs';
import { AuthStore } from '../auth/auth.store';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { TranslationKey } from '../core/i18n/translations';
import { NavStack } from '../core/services/nav-stack.service';
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
  host: { class: 'flex w-60 shrink-0 flex-col border-r-[0.5px] border-[var(--separator)] bg-[color-mix(in_srgb,var(--surface)_35%,var(--app-bg))]' },
  template: `
    <div class="flex shrink-0 flex-col gap-2 px-2 pb-1 pt-2">
      <!-- ✎ (as Notion's, at the top right): new — an event, a group, a student, a lesson -->
      <div class="flex h-7 items-center justify-end">
        <button #newBtn type="button" (click)="newOpen.set(!newOpen())" [appTip]="'sidebar.new' | t" tipSide="bottom" [attr.aria-label]="'sidebar.new' | t" [attr.aria-expanded]="newOpen()" class="side-icon">
          <app-icon name="compose" />
        </button>
      </div>
      <!-- Search: a field (as Notion's), its shortcut in a chip -->
      <button type="button" (click)="openSearch()" class="flex h-8 w-full items-center gap-2 rounded-lg border-[0.5px] border-[var(--separator)] bg-[var(--surface)] px-2.5 text-left text-[0.875rem] hover:bg-[var(--highlight)]">
        <span class="flex-1 opacity-50">{{ 'students.search' | t }}</span>
        <span class="rounded bg-[var(--fill-strong)] px-1.5 py-px text-[0.6875rem] font-medium opacity-60">Ctrl+K</span>
      </button>
      <!-- The pages: the open one a pill (its icon and name), the others just their icon -->
      <div class="flex items-center gap-1">
        @for (p of pages; track p.path) {
          <a [routerLink]="p.path" routerLinkActive #rla="routerLinkActive" [appTip]="rla.isActive ? null : (p.label | t)" tipSide="bottom" [attr.aria-label]="p.label | t"
             class="flex h-8 items-center gap-1.5 rounded-lg text-[0.875rem] hover:bg-[var(--highlight)]"
             [class.px-2.5]="rla.isActive" [class.w-8]="!rla.isActive" [class.justify-center]="!rla.isActive"
             [class.bg-[var(--highlight)]]="rla.isActive" [class.font-medium]="rla.isActive">
            <app-icon [name]="p.icon" class="side-glyph" />
            @if (rla.isActive) {
              <span>{{ p.label | t }}</span>
            }
          </a>
        }
      </div>
    </div>

    <app-scroll-area class="min-h-0 flex-1" viewportClass="!rounded-none" contentClass="gap-3 px-2 pb-3 pt-2">
      <!-- Upcoming: the next few events -->
      <div class="flex flex-col gap-px">
        <div class="side-head group">
          <button type="button" (click)="fold('upcoming')" class="flex flex-1 items-center gap-1 text-left">
            {{ 'sidebar.upcoming' | t }}
            <app-icon name="chevron-down" class="size-3 opacity-0 transition group-hover:opacity-60" [class.-rotate-90]="folded().includes('upcoming')" />
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
      </div>

      <!-- Students and groups -->
      <div class="flex flex-col gap-px">
        <div class="side-head group">
          <button type="button" (click)="fold('people')" class="flex flex-1 items-center gap-1 text-left">
            {{ 'nav.students' | t }}
            <app-icon name="chevron-down" class="size-3 opacity-0 transition group-hover:opacity-60" [class.-rotate-90]="folded().includes('people')" />
          </button>
        </div>
        @if (!folded().includes('people')) {
          @for (g of groups.groups(); track g.id) {
            <button type="button" (click)="stack.push({ kind: 'group', id: g.id })" class="side-row">
              <app-icon name="people" class="side-glyph" [style.color]="glyphColor(colorVar(g.color))" />
              <span class="min-w-0 flex-1 truncate">{{ g.name }}</span>
            </button>
          }
          @for (s of studentsSorted(); track s.id) {
            <button type="button" (click)="stack.push({ kind: 'student', id: s.id })" class="side-row">
              <app-icon name="person" class="side-glyph" />
              <span class="min-w-0 flex-1 truncate">{{ s.name }}</span>
            </button>
          }
        }
      </div>

      <!-- Lessons -->
      <div class="flex flex-col gap-px">
        <div class="side-head group">
          <button type="button" (click)="fold('lessons')" class="flex flex-1 items-center gap-1 text-left">
            {{ 'nav.lessons' | t }}
            <app-icon name="chevron-down" class="size-3 opacity-0 transition group-hover:opacity-60" [class.-rotate-90]="folded().includes('lessons')" />
          </button>
        </div>
        @if (!folded().includes('lessons')) {
          @for (l of lessonsSorted(); track l.id) {
            <a [routerLink]="['/lessons', l.id]" [appTip]="useHint(l.id)" tipSide="right" class="side-row" [class.is-on]="openLesson() === l.id">
              <app-icon name="page" class="side-glyph" [style.color]="glyphColor(levelColor(l.level))" />
              <span class="min-w-0 flex-1 truncate">{{ l.title }}</span>
            </a>
          }
        }
      </div>
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
  protected readonly lessonsSorted = computed(() => [...this.lessons.lessons()].sort((a, b) => a.title.localeCompare(b.title, this.i18n.locale())));

  // The next three events not over yet
  protected readonly upcoming = computed(() => {
    const now = Date.now();
    return this.events
      .events()
      .filter((e) => new Date(e.startsAt).getTime() + e.durationMinutes * 60000 > now)
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
      .slice(0, 3);
  });

  // "Mon 14:00"; today: "14:00"
  protected when(e: ScheduleEvent): string {
    const d = new Date(e.startsAt);
    const time = this.i18n.time(d);
    return new Date().toDateString() === d.toDateString() ? time : `${this.i18n.date(d, { weekday: 'short' })} ${time}`;
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
    else this.stack.push({ kind: f.kind, id: f.id });
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
    // Ctrl+K / ⌘K: the search window
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyK') {
        e.preventDefault();
        this.openSearch();
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
