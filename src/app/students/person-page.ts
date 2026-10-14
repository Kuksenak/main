import { Component, DestroyRef, ElementRef, afterNextRender, computed, effect, inject, input, output, signal, untracked, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LessonsCard } from '../cards/person-views';
import { StudentLink } from '../cards/student-link';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { ConfirmDelete } from '../core/ui/confirm';
import { Icon } from '../core/ui/icon/icon';
import { ScrollArea } from '../core/ui/scroll-area/scroll-area';
import { Sheet } from '../core/ui/sheet/sheet';
import { Tip } from '../core/ui/tip';
import { GROUP_COLORS, GroupColor, GroupService, colorVar } from './group.service';
import { StudentService } from './student.service';

/** How long after the last change it's saved; typed on without a pause: at least this often. */
const SAVE_AFTER_MS = 1500;
const SAVE_AT_LEAST_MS = 5000;

interface Draft {
  name: string;
  email: string | null;
  phone: string | null;
  color: GroupColor;
  studentIds: string[];
}

/**
 * A student or a group on desktop, as a lesson's page: always edited in place, saved a moment
 * after each change (and on leaving). The head: the name; a student's Email / Call; a group's
 * color; ⋯ (Delete). Then a student's contact (email, phone) and their own page's link, or a
 * group's members; their lessons and events under it.
 */
import { AddField, AddItem } from '../core/ui/add-field';
import { RowMenu } from '../core/ui/row-menu';
import { CreateDialog } from '../cards/create-dialog';
import { ToastService } from '../core/ui/toast';
import { TrashService } from '../core/services/trash.service';
@Component({
  selector: 'app-person-page',
  imports: [AddField, CreateDialog, RowMenu, ConfirmDelete, FormsModule, Icon, LessonsCard, ScrollArea, Sheet, StudentLink, Tip, TranslatePipe],
  host: { class: 'flex min-h-0 w-full flex-1 flex-col' },
  template: `
    <main class="flex min-h-0 w-full flex-1 flex-col px-4 pb-4">
      <app-scroll-area class="min-h-0 flex-1" viewportClass="!rounded-none" contentClass="gap-1 pb-10">
        @if (!exists()) {
          <p class="py-10 text-center text-[0.875rem] opacity-40">{{ 'students.notFound' | t }}</p>
        } @else {
          @let d = draft();
          <!-- The head, always at the top -->
          <div class="sticky top-0 z-20 -mx-1 flex h-12 shrink-0 items-center gap-1 bg-[var(--app-bg)] px-1">
            <input #nameInput [ngModel]="d.name" (ngModelChange)="patch({ name: $event })" type="text" [placeholder]="(kind() === 'group' ? 'groups.name' : 'students.name') | t" autocomplete="off" style="margin-left: 14px" class="mr-2 min-w-0 flex-1 rounded-md bg-transparent px-1.5 py-1 text-[1.25rem] font-semibold outline-none placeholder:opacity-30" />
            @if (kind() === 'student') {
              <!-- (Copy link — their page's) -->
              @if (link(); as k) {
                <button type="button" (click)="k.copy()" [disabled]="!k.token()" [appTip]="(k.copied() ? 'lessons.copied' : 'students.copyLink') | t" tipSide="bottom" [attr.aria-label]="'students.copyLink' | t" class="head-btn !px-1.5 disabled:opacity-30"><app-icon [name]="k.copied() ? 'check' : 'link'" /></button>
              }
            } @else {
              <!-- Its color -->
              <button #colorBtn type="button" (click)="colorOpen.set(!colorOpen())" [attr.aria-expanded]="colorOpen()" [appTip]="'groups.color' | t" tipSide="bottom" class="head-btn">
                <span class="size-2.5 rounded-full" [style.background]="colorVar(d.color)"></span>
                <app-icon name="chevron-down" class="!size-3.5 !opacity-50" />
              </button>
            }
            <!-- (in a popup: Open in full page, put here by it) -->
            <ng-content select="[pageHeadExtra]" />
            <button #menuBtn type="button" (click)="menuOpen.set(!menuOpen())" [attr.aria-expanded]="menuOpen()" [appTip]="'lessons.more' | t" tipSide="bottom" class="head-btn !px-1.5">
              <app-icon name="dots" class="!size-5" />
            </button>
          </div>

          <div class="flex flex-col gap-4 px-5 pt-2">
            @if (kind() === 'student') {
              @if (realId(); as sid) {
                <app-student-link [studentId]="sid" />
                <app-lessons-card [studentId]="sid" />
              }
            } @else {
              <!-- Members: a row each (× on hover takes them out); + adds -->
              <div class="flex flex-col gap-px">
                <div class="side-head !pl-0">
                  <span class="flex-1">{{ 'groups.members' | t }} <span class="opacity-60">{{ d.studentIds.length }}</span></span>
                </div>
                @for (s of members(); track s.id) {
                  <div class="side-row group/m !px-0">
                    <app-icon name="person" class="side-glyph" />
                    <button type="button" (click)="router.navigate(['/students', 'student', s.id])" class="min-w-0 flex-1 truncate text-left">{{ s.name }}</button>
                    <app-row-menu [link]="['/students', 'student', s.id]" (removed)="toggleMember(s.id)" />
                  </div>
                }
                <!-- (adding: as the event's participants) -->
                <app-add-field class="-ml-2" [class.pl-[1.6875rem]]="members().length" [icon]="members().length ? null : 'person'" [placeholder]="'groups.addMembers' | t" [items]="memberItems()" [exclude]="d.studentIds" (picked)="toggleMember($event)" [openOnFocus]="true" [action]="{ label: 'sidebar.newStudent' | t, icon: 'compose' }" (acted)="newStudent.set($event)" itemIcon="person" />
              </div>
              @if (realId(); as gid) {
                <app-lessons-card [groupId]="gid" />
              }
            }
          </div>
        }
      </app-scroll-area>
    </main>

    @if (newStudent() !== null) {
      <app-create-dialog [initialName]="newStudent()!" [hint]="'newStudent.toGroup' | t" (created)="toggleMember($event)" (closed)="newStudent.set(null)" />
    }

    @if (colorOpen()) {
      <app-sheet [origin]="colorAnchor()?.nativeElement ?? null" [fit]="true" (closed)="colorOpen.set(false)">
        <div class="flex gap-1">
          @for (c of colors; track c) {
            <button type="button" (click)="patch({ color: c }); colorOpen.set(false)" [attr.aria-label]="c" class="flex size-8 items-center justify-center rounded-md hover:bg-[var(--tint)]" [class.bg-[var(--tint-strong)]]="draft().color === c">
              <span class="size-3.5 rounded-full" [style.background]="colorVar(c)"></span>
            </button>
          }
        </div>
      </app-sheet>
    }

    @if (menuOpen()) {
      <app-sheet [origin]="menuAnchor()?.nativeElement ?? null" [fit]="true" (closed)="menuOpen.set(false)">
        <div class="menu-list">
          @if (link(); as k) {
            <button type="button" (click)="menuOpen.set(false); k.copy()" [disabled]="!k.token()" class="menu-item"><app-icon name="link" /><span class="flex-1">{{ 'students.copyLink' | t }}</span></button>
            <button type="button" (click)="menuOpen.set(false); k.askNewLink(menuAnchor()!.nativeElement)" [disabled]="!k.token()" class="menu-item"><app-icon name="repeat" /><span class="flex-1">{{ 'students.newLink' | t }}</span></button>
            <!-- (no PIN yet: nothing to reset) -->
            <button type="button" (click)="menuOpen.set(false); k.resetPin()" [disabled]="!k.hasPin()" class="menu-item"><app-icon name="lock" /><span class="flex-1">{{ 'students.resetPin' | t }}</span></button>
            <div class="menu-sep"></div>
          }
          <!-- (to the trash: restorable there, so not asked first) -->
          <button type="button" (click)="menuOpen.set(false); remove()" class="menu-item is-danger"><app-icon name="trash" /><span class="flex-1">{{ 'trash.move' | t }}</span></button>
        </div>
      </app-sheet>
    }

    @if (deleting(); as origin) {
      <app-confirm-delete [origin]="origin" (confirmed)="remove()" (closed)="deleting.set(null)" />
    }
  `,
})
export class PersonPage {
  readonly kind = input.required<'student' | 'group'>();
  /** null: a new one (created once it has a name; its id comes by `created`). */
  readonly id = input<string | null>(null);
  readonly created = output<string>();
  // Its id: the given one, or the new one's once created
  private readonly createdId = signal<string | null>(null);
  protected readonly realId = computed(() => this.id() ?? this.createdId());
  private creating = false;
  private readonly nameInput = viewChild<ElementRef<HTMLInputElement>>('nameInput');

  protected readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly trash = inject(TrashService);
  private readonly students = inject(StudentService);
  private readonly groups = inject(GroupService);
  private readonly i18n = inject(I18nService);
  protected readonly colorVar = colorVar;
  protected readonly colors = GROUP_COLORS;

  protected readonly menuOpen = signal(false);
  // The student's link (its Copy link / New link are in the head)
  protected readonly link = viewChild(StudentLink);
  protected readonly colorOpen = signal(false);
  protected readonly deleting = signal<HTMLElement | null>(null);
  protected readonly menuAnchor = viewChild<ElementRef<HTMLElement>>('menuBtn');
  protected readonly colorAnchor = viewChild<ElementRef<HTMLElement>>('colorBtn');

  private readonly student = computed(() => (this.kind() === 'student' ? this.students.byId(this.realId()) : null));
  private readonly group = computed(() => (this.kind() === 'group' ? this.groups.byId(this.realId()) : null));
  protected readonly exists = computed(() => !this.realId() || !!(this.student() || this.group()));

  // The draft edited here, and what it was when last saved
  protected readonly draft = signal<Draft>({ name: '', email: null, phone: null, color: 'teal', studentIds: [] });
  private saved = '';
  private openedId: string | null = null;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private pendingSince: number | null = null;
  private deleted = false;

  protected readonly members = computed(() => {
    const ids = new Set(this.draft().studentIds);
    return this.students
      .students()
      .filter((s) => ids.has(s.id))
      .sort((a, b) => a.name.localeCompare(b.name, this.i18n.locale()));
  });
  // New student (from the members' field): asked in a small dialog, then added
  protected readonly newStudent = signal<string | null>(null);
  protected readonly memberItems = computed<AddItem[]>(() => this.students.students().map((s) => ({ id: s.id, name: s.name, })));

  constructor() {
    // A new one: typing its name straight away
    afterNextRender(() => {
      if (!this.id()) this.nameInput()?.nativeElement.focus();
    });
    // Its data into the draft, once per student / group (later reloads after saves leave it)
    effect(() => {
      const s = this.student();
      const g = this.group();
      untracked(() => {
        const id = s?.id ?? g?.id ?? null;
        if (!id || id === this.openedId) return;
        this.openedId = id;
        this.draft.set({
          name: s?.name ?? g?.name ?? '',
          email: s?.email ?? null,
          phone: s?.phone ?? null,
          color: g?.color ?? 'teal',
          studentIds: [...(g?.studentIds ?? [])],
        });
        this.saved = JSON.stringify(this.draft());
      });
    });
    // Each change: saved a moment after the last one (typed on without a pause: every few seconds)
    effect(() => {
      const d = this.draft();
      untracked(() => {
        clearTimeout(this.timer);
        if (JSON.stringify(d) === this.saved) {
          this.pendingSince = null;
          return;
        }
        this.pendingSince ??= Date.now();
        const left = this.pendingSince + SAVE_AT_LEAST_MS - Date.now();
        this.timer = setTimeout(() => this.saveNow(), Math.max(0, Math.min(SAVE_AFTER_MS, left)));
      });
    });
    // Leaving (another page, the tab hidden): what's not saved goes now
    const hide = () => {
      if (document.visibilityState === 'hidden') this.saveNow();
    };
    document.addEventListener('visibilitychange', hide);
    inject(DestroyRef).onDestroy(() => {
      this.saveNow();
      document.removeEventListener('visibilitychange', hide);
    });
  }

  protected patch(p: Partial<Draft>): void {
    this.draft.update((d) => ({ ...d, ...p }));
  }

  protected toggleMember(id: string): void {
    this.draft.update((d) => ({ ...d, studentIds: d.studentIds.includes(id) ? d.studentIds.filter((x) => x !== id) : [...d.studentIds, id] }));
  }

  private saveNow(): void {
    clearTimeout(this.timer);
    this.pendingSince = null;
    const d = this.draft();
    const now = JSON.stringify(d);
    if (this.deleted || now === this.saved || !d.name.trim()) return;
    if (!this.openedId) {
      // A new one: created (once); what changed meanwhile is saved after
      if (this.id() || this.creating) return;
      this.creating = true;
      this.saved = now;
      const done = (id: string) => {
        this.creating = false;
        this.openedId = id;
        this.createdId.set(id);
        this.created.emit(id);
        this.saveNow();
      };
      const failed = () => {
        this.creating = false;
        this.saved = '';
      };
      if (this.kind() === 'student') this.students.create({ name: d.name.trim(), email: d.email?.trim() || null, phone: d.phone?.trim() || null }, done, failed);
      else this.groups.create({ name: d.name.trim(), color: d.color, studentIds: d.studentIds }, done, failed);
      return;
    }
    this.saved = now;
    if (this.kind() === 'student') {
      this.students.update(this.openedId, { name: d.name.trim(), email: d.email?.trim() || null, phone: d.phone?.trim() || null });
    } else {
      this.groups.update(this.openedId, { name: d.name.trim(), color: d.color, studentIds: d.studentIds });
    }
  }

  /** Saves now (Open in full page); whether a new one's being created (its id comes by `created`). */
  flush(): boolean {
    this.saveNow();
    return this.creating;
  }

  protected askDelete(): void {
    this.menuOpen.set(false);
    this.deleting.set(this.menuAnchor()?.nativeElement ?? null);
  }

  protected remove(): void {
    this.deleted = true;
    clearTimeout(this.timer);
    const id = this.realId();
    if (id && this.kind() === 'student') {
      this.students.remove(id);
      this.toast.show('toast.trashed', { icon: 'trash', action: { label: 'toast.undo', run: () => this.trash.restore({ kind: 'student', id, name: '', deletedAt: '' }) } });
    } else if (id) this.groups.remove(id);
    this.router.navigate(['/students']);
  }
}
