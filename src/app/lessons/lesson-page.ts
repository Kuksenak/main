import { FormsModule } from '@angular/forms';
import { Component, DestroyRef, ElementRef, computed, effect, inject, input, output, signal, untracked, viewChild } from '@angular/core';
import { I18nService } from '../core/i18n/i18n.service';
import { SelectOption } from '../core/ui/select/select';
import { Icon } from '../core/ui/icon/icon';
import { Router } from '@angular/router';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { ConfirmDelete } from '../core/ui/confirm';
import { ScrollArea } from '../core/ui/scroll-area/scroll-area';
import { Sheet } from '../core/ui/sheet/sheet';
import { LessonAttempts } from './lesson-attempts';
import { LessonForm } from './lesson-form';
import { LessonState } from './lesson-state';
import { LessonContent } from './lesson-content';
import { PageSheet } from '../core/ui/page-sheet/page-sheet';
import { forStudents } from './gaps';
import { cleanLesson } from './lesson-input';
import { LEVELS, Level, LessonBlock, LessonService, levelColor, shareUrl } from './lesson.service';
import { LessonClipboard } from './lesson-clipboard';
import { Toggle } from '../core/ui/toggle';
import { Tip } from '../core/ui/tip';
import { EventList } from '../cards/event-list';

/** How long after the last change the lesson is saved; typed on without a pause: at least this often. */
const SAVE_AFTER_MS = 1500;
const SAVE_AT_LEAST_MS = 5000;

/**
 * A lesson on desktop, on the right of the list (/lessons/:id; /lessons/new starts one): always
 * edited in place, saved a moment after each change (and on leaving): the name, whether it's saved (a floppy)
 * and ☰ in one row; the tasks the whole width under it; ☰ opens the rest (its level,
 * events, public link, the students' answers, Delete) in a panel under it. Phones open lessons as cards instead (LessonCard), read only.
 */
@Component({
  selector: 'app-lesson-page',
  imports: [ConfirmDelete, FormsModule, Icon, LessonAttempts, LessonForm, ScrollArea, Sheet, TranslatePipe, EventList, LessonContent, PageSheet, Tip, Toggle],
  host: { class: 'flex min-h-0 w-full flex-1 flex-col' },
  template: `
    <main class="flex min-h-0 w-full flex-1 flex-col pb-4 pl-4">
      <app-scroll-area class="min-h-0 flex-1" viewportClass="!rounded-none" contentClass="gap-2 pb-10">
        @if (s.id() && !s.lesson()) {
          <p class="text-body py-10 text-center opacity-40">{{ 'lessons.notFound' | t }}</p>
        } @else {
          <!-- One row, always at the top: the name; saved; the level; Preview; Publish (Copy link); ☰ -->
          <div class="sticky top-0 z-20 -mx-1 flex h-[var(--control-h)] shrink-0 items-center gap-1 bg-[var(--app-bg)] px-1">
            @if (s.draft().locked) {
              <!-- Locked: a lock (a square button, as the head's) before the name, the name moved along; a click unlocks -->
              <button type="button" (click)="setLocked(false)" [appTip]="'lessons.unlock' | t" tipSide="bottom" [attr.aria-label]="'lessons.unlock' | t" class="head-btn ml-3 !px-1.5">
                <app-icon name="lock" />
              </button>
            }
            <input [ngModel]="s.draft().title" (ngModelChange)="setTitle($event)" [readOnly]="!!s.draft().locked" [style.margin-left.px]="s.draft().locked ? null : 14" type="text" [placeholder]="'lessons.new' | t" autocomplete="off" class="mr-2 min-w-0 flex-1 rounded-md bg-transparent px-1.5 py-1 text-[0.9375rem] font-medium outline-none placeholder:opacity-35 hover:bg-[var(--highlight)] focus:bg-[var(--highlight)]" />
            <!-- Just saved: a cloud with a check, for a moment -->
            @if (justSaved()) {
              <span class="head-btn pointer-events-none !px-2 opacity-60 [animation:fadeIn_200ms_ease-out]" role="status" [attr.aria-label]="'lessons.saved' | t">
                <app-icon name="cloud-check" />
              </span>
            }
            <!-- Its level: a chip in its color; a list under it (each level with its color) -->
            <button #levelBtn type="button" (click)="levelOpen.set(!levelOpen())" [disabled]="!!s.draft().locked" [appTip]="'lessons.level' | t" tipSide="bottom" [attr.aria-label]="'lessons.level' | t" [attr.aria-expanded]="levelOpen()" class="head-btn" [class.font-medium]="!!s.draft().level">
              <!-- Set: a dot of its color and its name; none: just "Level", faded -->
              @if (levelColor(s.draft().level); as c) {
                <span class="size-2.5 shrink-0 rounded-full" [style.background]="c"></span>
                {{ s.draft().level }}
              } @else {
                <span class="opacity-55">{{ 'lessons.level' | t }}</span>
              }
              <app-icon name="chevron-down" class="!size-3.5 !opacity-50" />
            </button>
            <!-- The whole lesson as the student sees it -->
            <button type="button" (click)="previewAll.set(true)" class="head-btn">
              <app-icon name="popout" />{{ 'lessons.studentSees' | t }}
            </button>
            <!-- Publish (an open padlock): makes its public link; then Unpublish (a closed one) in its place -->
            @if (s.lesson(); as l) {
              @if (l.shareToken) {
                <button type="button" (click)="lessons.share(l.id, false)" [appTip]="'lessons.unpublishHint' | t" tipSide="bottom" class="head-btn">
                  <app-icon name="lock" />{{ 'lessons.unpublish' | t }}
                </button>
              } @else {
                <button type="button" (click)="lessons.share(l.id, true)" [appTip]="'lessons.publicShort' | t" tipSide="bottom" class="head-btn">
                  <app-icon name="unlock" />{{ 'lessons.publish' | t }}
                </button>
              }
            }
            <!-- ⋯: Copy link (published), Duplicate, Copy page content, Paste content, Format, Lock page, Delete -->
            <button #menuBtn type="button" (click)="menuOpen.set(!menuOpen())" [appTip]="'lessons.more' | t" tipSide="bottom" [attr.aria-label]="'lessons.more' | t" [attr.aria-expanded]="menuOpen()" class="head-btn !px-1.5">
              <app-icon name="dots" class="!size-5 !opacity-80" />
            </button>
          </div>

          @if (s.saveError(); as e) {
            <p class="text-footnote select-text break-words rounded-xl bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] px-3 py-2 text-[var(--danger)]">{{ 'lessons.saveFailed' | t }} {{ e }}</p>
          }
          @if (s.draft().locked) {
            <!-- Locked: shown as in Preview (its tasks as the student sees them) -->
            <div class="pl-5 pt-1">
              <app-lesson-content [blocks]="lockedBlocks()" mode="student" />
            </div>
          } @else {
            <app-lesson-form [(value)]="s.draft" [lessonId]="s.id()" [showTitle]="false" [endButtons]="false" />
          }
          <!-- Under the tasks: where it's used, and the students' answers -->
          @if (s.lesson(); as l) {
            <div class="flex flex-col gap-4 pl-6 pt-2">
              <app-event-list [lessonId]="l.id" />
              <app-lesson-attempts [lesson]="l" />
            </div>
          }
        }
      </app-scroll-area>
    </main>

    @if (levelOpen()) {
      <app-sheet [origin]="levelBtn()?.nativeElement ?? null" [fit]="true" (closed)="levelOpen.set(false)">
        <div class="menu-list !min-w-32">
          @for (o of levelOptions(); track o.value) {
            <button type="button" (click)="setLevel($any(o.value) || null); levelOpen.set(false)" class="menu-item">
              <span class="menu-icon rounded-full !opacity-100" [style.background]="levelColor($any(o.value) || null) ?? 'color-mix(in srgb, var(--text) 22%, transparent)'"></span>
              <span class="flex-1">{{ o.label }}</span>
              @if ((s.draft().level ?? '') === o.value) {
                <app-icon name="check" class="size-4 text-[var(--accent)]" />
              }
            </button>
          }
        </div>
      </app-sheet>
    }

    <!-- ⋯'s menu, under it -->
    @if (menuOpen()) {
      <app-sheet [origin]="menuBtn()?.nativeElement ?? null" [fit]="true" (closed)="menuOpen.set(false)">
        <div class="menu-list">
          <!-- Published: its link to copy -->
          @if (s.lesson()?.shareToken; as token) {
            <button type="button" (click)="copy(token)" class="menu-item">
              <app-icon [name]="copied() ? 'check' : 'link'" />
              <span class="flex-1">{{ (copied() ? 'lessons.copied' : 'lessons.copy') | t }}</span>
            </button>
          }
          <button type="button" (click)="duplicate()" [disabled]="!s.lesson()" class="menu-item">
            <app-icon name="duplicate" />
            <span class="flex-1">{{ 'lessons.duplicate' | t }}</span>
          </button>
          <button type="button" (click)="copyContent()" [disabled]="!s.draft().blocks.length" class="menu-item">
            <app-icon name="clipboard" />
            <span class="flex-1">{{ 'lessons.copyContent' | t }}</span>
          </button>
          <button type="button" (click)="pasteContent(clipboard.blocks() ?? [])" [disabled]="!!s.draft().locked || !clipboard.blocks()?.length" class="menu-item">
            <app-icon name="paste" />
            <span class="flex-1">{{ 'lessons.pasteContent' | t }}</span>
            @if (clipboard.blocks()?.length; as n) {
              <span class="text-footnote opacity-45">{{ n }}</span>
            }
          </button>
          <button type="button" (click)="menuOpen.set(false); form()?.formatAll()" [disabled]="!!s.draft().locked || !s.draft().blocks.length" class="menu-item">
            <app-icon name="wand" />
            <span class="flex-1">{{ 'lessons.formatAll' | t }}</span>
          </button>
          <div class="menu-sep"></div>
          <button type="button" (click)="setLocked(!s.draft().locked)" role="switch" [attr.aria-checked]="!!s.draft().locked" class="menu-item">
            <app-icon [name]="s.draft().locked ? 'lock' : 'unlock'" />
            <span class="flex-1">{{ 'lessons.lock' | t }}</span>
            <app-toggle class="pointer-events-none scale-[0.8] origin-right" [checked]="!!s.draft().locked" />
          </button>
          @if (s.lesson()) {
            <button type="button" (click)="askDeleteFromMenu()" [disabled]="!!s.draft().locked" class="menu-item is-danger">
              <app-icon name="trash" />
              <span class="flex-1">{{ 'action.delete' | t }}</span>
            </button>
          }
          <!-- (how much is in it; when it was last saved) -->
          <div class="menu-sep"></div>
          <div class="menu-foot">
            <div>{{ 'lessons.taskCount' | t }}: {{ s.draft().blocks.length }}</div>
            @if (s.lesson(); as l) {
              <div>{{ 'lessons.lastEdited' | t }} {{ edited(l.updatedAt) }}</div>
            }
          </div>
        </div>
      </app-sheet>
    }

    <!-- The whole lesson as the student sees it (their tasks only, answers taken out) -->
    @if (previewAll()) {
      <app-page-sheet [title]="'lessons.studentSees' | t" [actions]="false" [large]="true" (closed)="previewAll.set(false)">
        <div class="flex flex-col gap-3">
          <h1 class="px-1 text-xl font-semibold">{{ s.draft().title || ('lessons.new' | t) }}</h1>
          <app-lesson-content [blocks]="studentBlocks()" mode="student" />
        </div>
      </app-page-sheet>
    }

    @if (askDelete(); as origin) {
      <app-confirm-delete [origin]="origin" (confirmed)="remove()" (closed)="askDelete.set(null)" />
    }
  `,
})
export class LessonPage {
  /** The lesson's id; null = a new one. */
  readonly lessonId = input<string | null>(null);
  /** A new lesson, saved the first time: its id (the page stays as it is, its link changes). */
  readonly created = output<string>();

  protected readonly s = new LessonState(() => this.lessonId(), true);
  private router = inject(Router);
  protected readonly askDelete = signal<HTMLElement | null>(null); // the Delete button, while asking

  private i18n = inject(I18nService);
  protected readonly levelOptions = computed<SelectOption[]>(() => [
    { label: this.i18n.t('lessons.levelNone'), value: '' },
    ...LEVELS.map((l) => ({ label: l, value: l })),
  ]);
  protected readonly form = viewChild(LessonForm);
  protected readonly menuOpen = signal(false);
  protected readonly link = shareUrl;
  protected readonly clipboard = inject(LessonClipboard);

  // ⋯ → Duplicate: a copy of it, opened (saved first if it's changed)
  protected duplicate(): void {
    this.menuOpen.set(false);
    const d = this.s.draft();
    const title = this.i18n.t('lessons.copyOf').replace('{title}', d.title.trim() || this.i18n.t('lessons.new'));
    this.lessons.create(cleanLesson({ ...d, title, locked: false }), (id) => this.router.navigate(['/lessons', id]));
  }

  // ⋯ → Copy page content: its tasks kept to paste into another lesson (their text to the clipboard too)
  protected copyContent(): void {
    this.menuOpen.set(false);
    this.clipboard.copy(cleanLesson(this.s.draft()).blocks);
  }

  // ⋯ → Paste content: the tasks copied, at the end
  protected pasteContent(blocks: LessonBlock[]): void {
    this.menuOpen.set(false);
    this.s.draft.update((d) => ({ ...d, blocks: [...d.blocks, ...blocks.map((b) => ({ ...b }))] }));
  }

  // "Today at 11:29", else the day and time
  protected edited(at: string): string {
    const d = new Date(at);
    const today = new Date().toDateString() === d.toDateString();
    return today ? `${this.i18n.t('lessons.todayAt')} ${this.i18n.time(d)}` : `${this.i18n.date(d, { day: 'numeric', month: 'short' })} ${this.i18n.time(d)}`;
  }

  protected setLocked(locked: boolean): void {
    this.menuOpen.set(false);
    this.s.draft.update((d) => ({ ...d, locked }));
  }
  protected readonly levelOpen = signal(false);
  protected readonly levelBtn = viewChild<ElementRef<HTMLButtonElement>>('levelBtn');
  protected readonly levelColor = levelColor;
  protected readonly previewAll = signal(false);
  // Locked: all its tasks (the teacher's own too) as in Preview
  protected readonly lockedBlocks = computed(() => cleanLesson(this.s.draft()).blocks.map(forStudents));
  protected readonly studentBlocks = computed(() =>
    cleanLesson(this.s.draft()).blocks.filter((b) => !b.private).map(forStudents),
  );
  // ☰'s row unfolded
    protected readonly lessons = inject(LessonService);
  protected readonly copied = signal(false);
  protected copy(token: string): void {
    navigator.clipboard?.writeText(shareUrl(token)).then(
      () => {
        this.copied.set(true);
        setTimeout(() => this.copied.set(false), 2000);
      },
      () => {},
    );
  }

  // A save just done: its mark shown for a moment
  protected readonly justSaved = signal(false);
  private savedTimer: ReturnType<typeof setTimeout> | undefined;
  protected readonly menuBtn = viewChild<ElementRef<HTMLButtonElement>>('menuBtn');

  // Delete, from ☰: the menu closes, the question asked by ☰
  protected askDeleteFromMenu(): void {
    this.menuOpen.set(false);
    this.askDelete.set(this.menuBtn()?.nativeElement ?? null);
  }

  private timer: ReturnType<typeof setTimeout> | undefined;
  private deleted = false;
  private pendingSince: number | null = null;

  constructor() {
    // The lesson in the editor as soon as it's there (once: later reloads don't touch the draft)
    effect(() => {
      if (this.s.lesson()) untracked(() => this.s.open());
    });
    // A save done (and nothing refused): the mark for 2 s
    let wasSaving = false;
    effect(() => {
      const saving = this.s.saving();
      untracked(() => {
        if (wasSaving && !saving && !this.s.saveError()) {
          this.justSaved.set(true);
          clearTimeout(this.savedTimer);
          this.savedTimer = setTimeout(() => this.justSaved.set(false), 2000);
        }
        wasSaving = saving;
      });
    });
    // Each change: saved a moment after the last one — or, typed on without a pause, a few seconds
    // after the first one not saved
    effect(() => {
      this.s.draft();
      untracked(() => {
        clearTimeout(this.timer);
        if (!this.s.dirty()) {
          this.pendingSince = null;
          return;
        }
        this.pendingSince ??= Date.now();
        const left = this.pendingSince + SAVE_AT_LEAST_MS - Date.now();
        this.timer = setTimeout(() => this.saveNow(), Math.max(0, Math.min(SAVE_AFTER_MS, left)));
      });
    });
    // Leaving (another lesson, another page, the tab hidden or closed): what's not saved goes now
    const hide = () => {
      if (document.visibilityState === 'hidden') this.saveNow();
    };
    document.addEventListener('visibilitychange', hide);
    window.addEventListener('pagehide', hide);
    inject(DestroyRef).onDestroy(() => {
      this.saveNow();
      document.removeEventListener('visibilitychange', hide);
      window.removeEventListener('pagehide', hide);
    });
  }

  private saveNow(): void {
    clearTimeout(this.timer);
    this.pendingSince = null;
    if (this.deleted) return;
    this.s.autosave((id) => this.created.emit(id));
  }

  // The level picked (null: none)
  protected setLevel(level: Level | null): void {
    this.s.draft.update((d) => ({ ...d, level }));
  }

  protected setTitle(title: string): void {
    this.s.draft.update((d) => ({ ...d, title }));
  }

  protected remove(): void {
    this.deleted = true;
    clearTimeout(this.timer);
    this.s.remove();
    this.router.navigate(['/lessons']);
  }
}
