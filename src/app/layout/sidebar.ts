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
import { HttpClient } from '@angular/common/http';
import { environment } from '@environments/environment';
import { catchError, of } from 'rxjs';
import { ToastService } from '../core/ui/toast';
import { studentPageUrl } from '../cards/student-link';
import { cleanLesson } from '../lessons/lesson-input';
import { shareUrl } from '../lessons/lesson.service';
import { ConfirmDelete } from '../core/ui/confirm';
import { TrashItem, TrashService } from '../core/services/trash.service';
import { Tip } from '../core/ui/tip';
import { PeekService } from './peek.service';
import { LessonUsage } from '../lessons/lesson-usage';
import { LessonService, levelColor } from '../lessons/lesson.service';
import { EventService, ScheduleEvent } from '../schedule/event.service';
import { EventPeople } from '../schedule/event-people';
import { GROUPS_ON, GroupService, colorVar } from '../students/group.service';
import { StudentService } from '../students/student.service';

type Section = 'upcoming' | 'people' | 'lessons' | 'favorites';
const FOLDED_KEY = 'sidebar.folded';

/** A row's ⋯ menu: which one, where it opened. */
interface ItemMenu {
  kind: 'lesson' | 'student' | 'event';
  id: string;
  origin: HTMLElement;
  event?: ScheduleEvent;
}

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
  imports: [ConfirmDelete, Icon, RouterLink, RouterLinkActive, ScrollArea, Sheet, Tip, TranslatePipe],
  host: { class: 'flex w-[270px] shrink-0 flex-col bg-[var(--side-bg)]' },
  template: `
    <div class="flex shrink-0 flex-col gap-2 px-3 pb-1 pt-2">
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

    <!-- (246 wide, 12 at each side; the scroll thumb in the right one) -->
    <app-scroll-area class="min-h-0 flex-1 pr-3" viewportClass="!rounded-none" contentClass="gap-px pb-3 pl-3 pt-2">

      <!-- Sections (as Notion's): a head folds them (↗ and + on hover); the first few, then View all.
           Calendar: the upcoming events -->
      <div class="side-head group">
        <button type="button" (click)="fold('upcoming')" [attr.aria-expanded]="!folded().includes('upcoming')" class="flex flex-1 items-center gap-2 text-left">
          <!-- (its icon; on hover, the fold chevron in its place) -->
          <span class="relative size-5 shrink-0">
            <app-icon name="calendar-day" class="side-glyph absolute inset-0 group-hover:opacity-0" />
            <app-icon name="chevron-down" class="absolute inset-0 m-auto size-4 opacity-0 transition group-hover:opacity-70" [class.-rotate-90]="folded().includes('upcoming')" />
          </span>
          {{ 'sidebar.calendar' | t }}
        </button>
        <a routerLink="/schedule" [appTip]="'sidebar.calendar' | t" tipSide="right" [attr.aria-label]="'sidebar.calendar' | t" class="side-add"><app-icon name="arrow-up-right" class="size-4" /></a>
        <button type="button" (click)="create('event')" [appTip]="'sidebar.newEvent' | t" tipSide="right" [attr.aria-label]="'sidebar.newEvent' | t" class="side-add"><app-icon name="plus" class="size-3.5" /></button>
      </div>
      @if (!folded().includes('upcoming')) {
        <!-- No icon: the name (indented as the other rows), when at the right (today: the time;
             later: the day too) -->
        @for (e of upcoming(); track e.id + e.startsAt) {
          <div role="button" tabindex="0" (click)="openEvent(e)" (keydown.enter)="openEvent(e)" class="side-row cursor-pointer !pl-[1.125rem]">
            <span class="min-w-0 flex-1 truncate">{{ people.label(e) || e.title }}</span>
            <span class="shrink-0 text-[0.75rem] tabular-nums opacity-45">{{ when(e) }}</span>
          </div>
        } @empty {
          <p class="text-footnote px-2 py-1 opacity-40">{{ 'sidebar.nothingSoon' | t }}</p>
        }
        <!-- (View all only when not all are shown) -->
        @if (upcomingAll().length > 3) {
          <a routerLink="/schedule" class="side-row !pl-[1.125rem] opacity-60"><app-icon name="dots" class="side-glyph" /><span class="flex-1">{{ 'sidebar.viewAll' | t }}</span></a>
        }
      }

      <!-- Favorites (pages and people marked so in their ⋯): after the calendar, when there are any -->
      @if (favorites().length) {
        <div class="side-head group mt-1.5">
          <button type="button" (click)="fold('favorites')" [attr.aria-expanded]="!folded().includes('favorites')" class="flex flex-1 items-center gap-2 text-left">
            <span class="relative size-5 shrink-0">
              <app-icon name="star" class="side-glyph absolute inset-0 group-hover:opacity-0" />
              <app-icon name="chevron-down" class="absolute inset-0 m-auto size-4 opacity-0 transition group-hover:opacity-70" [class.-rotate-90]="folded().includes('favorites')" />
            </span>
            {{ 'item.favorites' | t }}
          </button>
        </div>
        @if (!folded().includes('favorites')) {
          @for (f of favorites(); track f.kind + f.id) {
            <a [routerLink]="f.kind === 'lesson' ? ['/lessons', f.id] : ['/students', 'student', f.id]" routerLinkActive="is-on" class="side-row !pl-[1.125rem]">
              @if (f.kind === 'lesson') {
                <app-icon name="page" class="side-glyph" [style.color]="glyphColor(levelColor(f.level))" />
              } @else {
                <app-icon name="person" class="side-glyph" />
              }
              <span class="min-w-0 flex-1 truncate">{{ f.name }}</span>
              <button type="button" (click)="$event.preventDefault(); $event.stopPropagation(); openItemMenu($event, f.kind, f.id)" [attr.aria-label]="'lessons.more' | t" class="side-add" [class.!opacity-70]="itemMenu()?.id === f.id"><app-icon name="dots" class="size-4" /></button>
            </a>
          }
        }
      }

      <div class="side-head group mt-1.5">
        <button type="button" (click)="fold('lessons')" [attr.aria-expanded]="!folded().includes('lessons')" class="flex flex-1 items-center gap-2 text-left">
          <!-- (its icon; on hover, the fold chevron in its place) -->
          <span class="relative size-5 shrink-0">
            <app-icon name="library" class="side-glyph absolute inset-0 group-hover:opacity-0" />
            <app-icon name="chevron-down" class="absolute inset-0 m-auto size-4 opacity-0 transition group-hover:opacity-70" [class.-rotate-90]="folded().includes('lessons')" />
          </span>
          {{ 'sidebar.library' | t }}
        </button>
        <a routerLink="/lessons" [appTip]="'sidebar.viewAll' | t" tipSide="right" [attr.aria-label]="'sidebar.viewAll' | t" class="side-add"><app-icon name="arrow-up-right" class="size-4" /></a>
        <button type="button" (click)="create('lesson')" [appTip]="'lessons.add' | t" tipSide="right" [attr.aria-label]="'lessons.add' | t" class="side-add"><app-icon name="plus" class="size-3.5" /></button>
      </div>
      @if (!folded().includes('lessons')) {
        @for (l of lessonsShown(); track l.id) {
          <a [routerLink]="['/lessons', l.id]" [appTip]="useHint(l.id)" tipSide="right" class="side-row !pl-[1.125rem]" [class.is-on]="openLesson() === l.id">
            <app-icon name="page" class="side-glyph" [style.color]="glyphColor(levelColor(l.level))" />
            <span class="min-w-0 flex-1 truncate">{{ l.title }}</span>
            <button type="button" (click)="$event.preventDefault(); $event.stopPropagation(); openItemMenu($event, 'lesson', l.id)" [attr.aria-label]="'lessons.more' | t" class="side-add" [class.!opacity-70]="itemMenu()?.id === l.id"><app-icon name="dots" class="size-4" /></button>
          </a>
        }
        <!-- (View all only when not all are shown) -->
        @if (lessonsSorted().length > shown) {
          <a routerLink="/lessons" class="side-row !pl-[1.125rem] opacity-60"><app-icon name="dots" class="side-glyph" /><span class="flex-1">{{ 'sidebar.viewAll' | t }}</span></a>
        }
      }

      <div class="side-head group mt-1.5">
        <button type="button" (click)="fold('people')" [attr.aria-expanded]="!folded().includes('people')" class="flex flex-1 items-center gap-2 text-left">
          <!-- (its icon; on hover, the fold chevron in its place) -->
          <span class="relative size-5 shrink-0">
            <app-icon name="people" class="side-glyph absolute inset-0 group-hover:opacity-0" />
            <app-icon name="chevron-down" class="absolute inset-0 m-auto size-4 opacity-0 transition group-hover:opacity-70" [class.-rotate-90]="folded().includes('people')" />
          </span>
          {{ 'sidebar.people' | t }}
        </button>
        <a routerLink="/students" [appTip]="'sidebar.viewAll' | t" tipSide="right" [attr.aria-label]="'sidebar.viewAll' | t" class="side-add"><app-icon name="arrow-up-right" class="size-4" /></a>
        <button type="button" (click)="create('student')" [appTip]="'sidebar.newStudent' | t" tipSide="right" [attr.aria-label]="'sidebar.newStudent' | t" class="side-add"><app-icon name="plus" class="size-3.5" /></button>
      </div>
      @if (!folded().includes('people')) {
        @for (r of peopleShown(); track r.kind + r.id) {
          <a [routerLink]="['/students', r.kind, r.id]" routerLinkActive="is-on" class="side-row !pl-[1.125rem]">
            @if (r.kind === 'group') {
              <app-icon name="people" class="side-glyph" [style.color]="glyphColor(r.color)" />
            } @else {
              <app-icon name="person" class="side-glyph" />
            }
            <span class="min-w-0 flex-1 truncate">{{ r.name }}</span>
            @if (r.kind === 'student') {
              <button type="button" (click)="$event.preventDefault(); $event.stopPropagation(); openItemMenu($event, 'student', r.id)" [attr.aria-label]="'lessons.more' | t" class="side-add" [class.!opacity-70]="itemMenu()?.id === r.id"><app-icon name="dots" class="size-4" /></button>
            }
          </a>
        }
        <!-- (View all only when not all are shown) -->
        @if (peopleAll().length > shown) {
          <a routerLink="/students" class="side-row !pl-[1.125rem] opacity-60"><app-icon name="dots" class="side-glyph" /><span class="flex-1">{{ 'sidebar.viewAll' | t }}</span></a>
        }
      }
    </app-scroll-area>

    <!-- The account: its email; the settings open by it -->
    <div class="shrink-0 border-t-[0.5px] border-[var(--separator)] px-3 py-2">
      <!-- The account (as Notion's): a letter in a rounded square, the email, a chevron — opens
           Settings; the trash beside it, a square button -->
      <div class="flex items-center gap-1">
        <button #accountBtn type="button" (click)="account.emit(accountBtn)" class="side-row min-w-0 flex-1 !gap-2 font-medium">
          <span class="relative flex size-5 shrink-0 items-center justify-center rounded-[5px] bg-[var(--tint-strong)] text-[0.6875rem] font-semibold uppercase">
            {{ (auth.email() ?? '?').charAt(0) }}
            @if (updates.updateReady()) {
              <span class="absolute -right-1 -top-1 size-2 rounded-full bg-[var(--success)] ring-2 ring-[var(--side-bg)]"></span>
            }
          </span>
          <span class="min-w-0 flex-1 truncate">{{ auth.email() }}</span>
          <app-icon name="chevron-down" class="size-3.5 shrink-0 opacity-50" />
        </button>
        <button #trashBtn type="button" (click)="openTrash()" [attr.aria-expanded]="trashOpen()" [appTip]="'trash.title' | t" tipSide="top" [attr.aria-label]="'trash.title' | t" class="side-icon shrink-0"><app-icon name="trash" class="size-[1.125rem]" /></button>
      </div>
    </div>

    <!-- ✎'s menu (out of the column: no room taken in it) -->
    @if (newOpen()) {
      <app-sheet [origin]="newAnchor()?.nativeElement ?? null" [fit]="true" (closed)="newOpen.set(false)">
        <div class="menu-list">
          <button type="button" (click)="create('event')" class="menu-item"><app-icon name="calendar" /><span class="flex-1">{{ 'sidebar.newEvent' | t }}</span></button>
          @if (groupsOn) {
            <button type="button" (click)="create('group')" class="menu-item"><app-icon name="people" /><span class="flex-1">{{ 'sidebar.newGroup' | t }}</span></button>
          }
          <button type="button" (click)="create('student')" class="menu-item"><app-icon name="person" /><span class="flex-1">{{ 'sidebar.newStudent' | t }}</span></button>
          <button type="button" (click)="create('lesson')" class="menu-item"><app-icon name="page" /><span class="flex-1">{{ 'lessons.add' | t }}</span></button>
        </div>
      </app-sheet>
    }

    <!-- New (Ctrl+Alt+N): a window in the middle — Event, Group, Student, Lesson; ↑ ↓ Enter, or a
         first letter -->
    @if (newWindow()) {
      <div class="fixed inset-0 z-[2200] flex items-start justify-center pt-[18vh] [animation:fadeIn_150ms_ease-out]" (mousedown)="closeNewWindow()">
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
      <div class="fixed inset-0 z-[2200] flex items-start justify-center pt-[12vh] [animation:fadeIn_150ms_ease-out]" (mousedown)="closeSearch()">
        <div class="dialog-panel flex max-h-[70vh] w-[36rem] max-w-[90vw] flex-col overflow-hidden !rounded-xl [animation:dropdownIn_160ms_var(--ease-out-quick)]" (mousedown)="$event.stopPropagation()">
          <label class="flex h-12 shrink-0 items-center gap-2.5 px-4">
            <app-icon name="search" class="size-6 shrink-0 opacity-50" />
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

    <!-- A row's ⋯ (as Notion's): its actions; a page's last edit -->
    @if (itemMenu(); as im) {
      <app-sheet [origin]="im.origin" [fit]="true" [side]="true" (closed)="itemMenu.set(null)">
        <div class="menu-list min-w-56">
          @if (im.kind !== 'event') {
            <button type="button" (click)="toggleFavorite(im)" class="menu-item"><app-icon name="star" /><span class="flex-1">{{ (isFavorite(im) ? 'item.unfavorite' : 'item.favorite') | t }}</span></button>
            <div class="menu-sep"></div>
          }
          <!-- (Copy link: a person's own page; a page's public link — only when it's published) -->
          @if (im.kind === 'student') {
            <button type="button" (click)="copyItemLink(im)" class="menu-item"><app-icon name="link" /><span class="flex-1">{{ 'students.copyLink' | t }}</span></button>
          } @else if (im.kind === 'lesson' && publicToken(im.id); as token) {
            <button type="button" (click)="copyPublicLink(token)" class="menu-item"><app-icon name="link" /><span class="flex-1">{{ 'students.copyLink' | t }}</span></button>
          }
          @if (im.kind === 'lesson') {
            <button type="button" (click)="duplicateItem(im)" class="menu-item"><app-icon name="duplicate" /><span class="flex-1">{{ 'lessons.duplicate' | t }}</span></button>
          }
          @if (im.kind !== 'event') {
            <button type="button" (click)="trashItem(im)" class="menu-item is-danger"><app-icon name="trash" /><span class="flex-1">{{ 'trash.move' | t }}</span></button>
          } @else if (im.event?.repeat === 'Never') {
            <button type="button" (click)="deleteEvent(im)" class="menu-item is-danger"><app-icon name="trash" /><span class="flex-1">{{ 'action.delete' | t }}</span></button>
          }
          @if (im.kind === 'lesson' && lessonEdited(im.id); as when) {
            <div class="menu-sep"></div>
            <p class="menu-foot">{{ 'lessons.lastEdited' | t }} {{ when }}</p>
          }
        </div>
      </app-sheet>
    }
    @if (trashOpen()) {
      <app-sheet [origin]="trashAnchor()?.nativeElement ?? null" [fit]="true" (closed)="trashOpen.set(false)">
        <div class="flex w-[22rem] flex-col">
          <input [value]="trashQuery()" (input)="trashQuery.set($any($event.target).value)" [placeholder]="'trash.search' | t" autocomplete="off" class="mx-1 mb-1 mt-0.5 h-8 rounded-md bg-[var(--tint)] px-2.5 text-[0.875rem] outline-none placeholder:opacity-45" />
          <div class="flex max-h-80 flex-col gap-px overflow-y-auto">
            @for (x of trashShown(); track x.kind + x.id) {
              <div class="menu-item">
                <app-icon [name]="x.kind === 'lesson' ? 'page' : 'person'" />
                <span class="min-w-0 flex-1 truncate">{{ x.name }}</span>
                <span class="shrink-0 text-[0.75rem] opacity-40">{{ deletedOn(x) }}</span>
                <button type="button" (click)="trash.restore(x)" [appTip]="'trash.restore' | t" tipSide="bottom" [attr.aria-label]="'trash.restore' | t" class="row-dots !opacity-60 hover:!opacity-100"><app-icon name="restore" class="size-4" /></button>
                <button #purgeBtn type="button" (click)="purging.set({ item: x, origin: purgeBtn })" [appTip]="'trash.deleteForever' | t" tipSide="bottom" [attr.aria-label]="'trash.deleteForever' | t" class="row-dots !opacity-60 hover:!opacity-100 hover:text-[var(--brand-orange,#f97316)]"><app-icon name="trash" class="size-4" /></button>
              </div>
            } @empty {
              <p class="px-2.5 py-3 text-[0.875rem] opacity-45">{{ (trash.loading() ? 'trash.loading' : trashQuery() ? 'students.notFound' : 'trash.empty') | t }}</p>
            }
          </div>
          <div class="menu-sep"></div>
          <p class="menu-foot">{{ 'trash.hint' | t }}</p>
        </div>
      </app-sheet>
    }
    @if (purging(); as p) {
      <app-confirm-delete [origin]="p.origin" (confirmed)="trash.purge(p.item)" (closed)="purging.set(null)" />
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
  protected readonly groupsOn = GROUPS_ON;
  private readonly peekPages = inject(PeekService);
  private readonly students = inject(StudentService);
  private readonly lessons = inject(LessonService);

  // ---- A row's ⋯ menu (pages, people, events)
  protected readonly itemMenu = signal<ItemMenu | null>(null);
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);

  protected openItemMenu(e: Event, kind: ItemMenu['kind'], id: string, event?: ScheduleEvent): void {
    const origin = e.currentTarget as HTMLElement;
    this.itemMenu.set(this.itemMenu()?.id === id ? null : { kind, id, origin, event });
  }

  private itemPath(im: ItemMenu): unknown[] {
    if (im.kind === 'lesson') return ['/lessons', im.id];
    if (im.kind === 'student') return ['/students', 'student', im.id];
    return ['/events', im.id];
  }

  // A page: its link in the app; a person: their own page's link (made the first time)
  protected copyItemLink(im: ItemMenu): void {
    this.itemMenu.set(null);
    const done = (url: string) => navigator.clipboard?.writeText(url).then(() => this.toast.show('toast.linkCopied', { icon: 'link' }), () => {});
    this.http
        .post<{ token: string }>(`${environment.apiUrl}/students/${im.id}/access`, {})
        .pipe(catchError(() => of(null)))
        .subscribe((res) => res?.token && done(studentPageUrl(res.token)));
  }

  // ---- Favorites: pages and people, the sidebar's first section
  protected readonly favorites = computed(() => [
    ...this.lessonsSorted().filter((l) => l.favorite).map((l) => ({ kind: 'lesson' as const, id: l.id, name: l.title, level: l.level ?? null })),
    ...this.students.students().filter((s) => s.favorite).map((s) => ({ kind: 'student' as const, id: s.id, name: s.name, level: null })),
  ]);

  protected isFavorite(im: ItemMenu): boolean {
    return !!(im.kind === 'lesson' ? this.lessons.byId(im.id)?.favorite : this.students.byId(im.id)?.favorite);
  }

  protected toggleFavorite(im: ItemMenu): void {
    this.itemMenu.set(null);
    const on = !this.isFavorite(im);
    if (im.kind === 'lesson') this.lessons.setLocal(im.id, { favorite: on });
    else this.students.setLocal(im.id, { favorite: on });
    this.http.put(`${environment.apiUrl}/favorites/${im.kind}/${im.id}`, { favorite: on }).pipe(catchError(() => of(null))).subscribe();
  }

  protected publicToken(id: string): string | null {
    return this.lessons.byId(id)?.shareToken ?? null;
  }

  protected copyPublicLink(token: string): void {
    this.itemMenu.set(null);
    navigator.clipboard?.writeText(shareUrl(token)).then(() => this.toast.show('toast.linkCopied', { icon: 'link' }), () => {});
  }

  protected duplicateItem(im: ItemMenu): void {
    this.itemMenu.set(null);
    const l = this.lessons.byId(im.id);
    if (!l) return;
    const title = this.i18n.t('lessons.copyOf').replace('{title}', l.title);
    this.lessons.create(cleanLesson({ title, blocks: l.blocks, level: l.level ?? null, locked: false }), (id) => this.router.navigate(['/lessons', id]));
  }

  protected trashItem(im: ItemMenu): void {
    this.itemMenu.set(null);
    if (im.kind === 'lesson') this.lessons.remove(im.id);
    else this.students.remove(im.id);
    // (open: left for its list)
    if (this.router.url.includes(im.id)) this.router.navigate([im.kind === 'lesson' ? '/lessons' : '/students']);
    const kind = im.kind === 'lesson' ? 'lesson' : 'student';
    this.toast.show('toast.trashed', { icon: 'trash', action: { label: 'trash.restore', run: () => this.trash.restore({ kind, id: im.id, name: '', deletedAt: '' }) } });
  }

  // An event (a single one): deleted, Undo makes it again as it was
  protected deleteEvent(im: ItemMenu): void {
    this.itemMenu.set(null);
    const e = im.event;
    if (!e) return;
    this.events.remove(e.id);
    this.toast.show('toast.deleted', {
      icon: 'trash',
      action: {
        label: 'toast.undo',
        run: () =>
          this.events.create({ title: e.title, repeat: e.repeat, repeatInterval: e.repeatInterval, repeatUntil: e.repeatUntil, studentIds: e.studentIds, groupIds: e.groupIds, lessonIds: e.lessonIds, startsAt: e.startsAt, durationMinutes: e.durationMinutes }),
      },
    });
  }

  // "14 Oct, 12:36"
  protected lessonEdited(id: string): string | null {
    const l = this.lessons.byId(id);
    if (!l?.updatedAt) return null;
    const d = new Date(l.updatedAt);
    return `${this.i18n.date(d, { day: 'numeric', month: 'short' })}, ${this.i18n.time(d)}`;
  }

  // ---- Trash (a menu at its row: search, a row each — restore, delete for good, asked first)
  protected readonly trash = inject(TrashService);
  protected readonly trashOpen = signal(false);
  protected readonly trashQuery = signal('');
  protected readonly trashAnchor = viewChild<ElementRef<HTMLElement>>('trashBtn');
  protected readonly purging = signal<{ item: TrashItem; origin: HTMLElement } | null>(null);
  protected readonly trashShown = computed(() => {
    const q = this.trashQuery().trim().toLocaleLowerCase();
    return this.trash.items().filter((x) => !q || x.name.toLocaleLowerCase().includes(q));
  });
  protected openTrash(): void {
    this.trashQuery.set('');
    this.trash.load();
    this.trashOpen.set(!this.trashOpen());
  }
  // When it was deleted: "14 Oct"
  protected deletedOn(x: TrashItem): string {
    return this.i18n.date(new Date(x.deletedAt), { day: 'numeric', month: 'short' });
  }
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

  // The events not over yet (the sidebar shows the next three)
  protected readonly upcomingAll = computed(() => {
    const now = Date.now();
    return this.events
      .events()
      .filter((e) => new Date(e.startsAt).getTime() + e.durationMinutes * 60000 > now)
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  });
  protected readonly upcoming = computed(() => this.upcomingAll().slice(0, 3));

  // "14:00" today, "Tmrw 14:00", then "Thu 14:00"
  protected when(e: ScheduleEvent): string {
    const d = new Date(e.startsAt);
    const now = new Date();
    const time = this.i18n.time(d);
    if (d.toDateString() === now.toDateString()) return time;
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const day = d.toDateString() === tomorrow.toDateString() ? this.i18n.t('sidebar.tomorrow') : this.i18n.date(d, { weekday: 'short' });
    return `${day} ${time}`;
  }

  // Ctrl+Alt+N: the New window
  protected readonly newChoices: { kind: 'event' | 'group' | 'student' | 'lesson'; label: TranslationKey; icon: IconName; key: string }[] = [
    { kind: 'event', label: 'sidebar.newEvent', icon: 'calendar', key: 'E' },
    ...(GROUPS_ON ? [{ kind: 'group' as const, label: 'sidebar.newGroup' as const, icon: 'people' as const, key: 'G' }] : []),
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
    if (kind !== 'event') {
      this.peekPages.open(kind);
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
