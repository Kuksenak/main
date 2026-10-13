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
import { LEVELS, Level, LessonService, levelColor, shareUrl } from './lesson.service';
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
  imports: [ConfirmDelete, FormsModule, Icon, LessonAttempts, LessonForm, ScrollArea, Sheet, TranslatePipe, EventList, LessonContent, PageSheet, Tip],
  host: { class: 'flex min-h-0 w-full flex-1 flex-col' },
  template: `
    <main class="flex min-h-0 w-full flex-1 flex-col px-4 pb-4 pt-1">
      <app-scroll-area class="min-h-0 flex-1" viewportClass="!rounded-none" contentClass="gap-4 pb-10">
        @if (s.id() && !s.lesson()) {
          <p class="text-body py-10 text-center opacity-40">{{ 'lessons.notFound' | t }}</p>
        } @else {
          <!-- One row, always at the top: the name; saved; the level; Preview; Publish (Copy link); ☰ -->
          <div class="sticky top-0 z-20 -mx-1 flex h-[var(--control-h)] shrink-0 items-center gap-3 bg-[var(--app-bg)] px-1">
            <input [ngModel]="s.draft().title" (ngModelChange)="setTitle($event)" type="text" [placeholder]="'lessons.new' | t" autocomplete="off" class="min-w-0 flex-1 bg-transparent text-xl font-semibold outline-none placeholder:opacity-35" />
            <!-- Just saved: a cloud with a check, for a moment -->
            @if (justSaved()) {
              <span class="flex shrink-0 items-center [animation:fadeIn_200ms_ease-out]" [attr.title]="'lessons.saved' | t" [attr.aria-label]="'lessons.saved' | t">
                <app-icon name="cloud-check" class="size-7 opacity-45" />
              </span>
            }
            <!-- Its level: a chip in its color; a list under it (each level with its color) -->
            <button #levelBtn type="button" (click)="levelOpen.set(!levelOpen())" [appTip]="'lessons.level' | t" tipSide="bottom" [attr.aria-label]="'lessons.level' | t" [attr.aria-expanded]="levelOpen()" class="btn-secondary gap-2 !px-3 font-semibold" [style.background]="levelColor(s.draft().level)">
              {{ s.draft().level ?? ('lessons.level' | t) }}
              <app-icon name="chevron-down" class="-mr-0.5 size-4 opacity-50" />
            </button>
            <!-- The whole lesson as the student sees it -->
            <button type="button" (click)="previewAll.set(true)" class="btn-secondary gap-1.5 pl-2.5">
              <app-icon name="popout" class="size-[1.125rem]" />{{ 'lessons.studentSees' | t }}
            </button>
            <!-- Publish: the public link on (then Copy link beside it, and Unpublish) -->
            @if (s.lesson(); as l) {
              @if (l.shareToken; as token) {
                <button type="button" (click)="copy(token)" class="btn-secondary gap-1.5 pl-2.5">
                  <app-icon [name]="copied() ? 'check' : 'link'" class="size-[1.125rem]" />{{ (copied() ? 'lessons.copied' : 'lessons.copy') | t }}
                </button>
                <button type="button" (click)="lessons.share(l.id, false)" [appTip]="'lessons.publicShort' | t" tipSide="bottom" class="btn-secondary">{{ 'lessons.unpublish' | t }}</button>
              } @else {
                <button type="button" (click)="lessons.share(l.id, true)" [appTip]="'lessons.publicShort' | t" tipSide="bottom" class="btn-primary">{{ 'lessons.publish' | t }}</button>
              }
            }
            <!-- ☰: the rest (events, answers, Delete) -->
            <button #menuBtn type="button" (click)="menuOpen.set(!menuOpen())" [attr.aria-label]="'nav.settings' | t" [attr.aria-expanded]="menuOpen()" class="btn-secondary !px-2.5" [class.!bg-[var(--highlight)]]="menuOpen()">
              <app-icon name="menu" [strokeWidth]="2" class="size-5" />
            </button>
          </div>

          @if (s.saveError(); as e) {
            <p class="text-footnote select-text break-words rounded-xl bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] px-3 py-2 text-[var(--danger)]">{{ 'lessons.saveFailed' | t }} {{ e }}</p>
          }
          <app-lesson-form [(value)]="s.draft" [lessonId]="s.id()" [showTitle]="false" [endButtons]="false" />
        }
      </app-scroll-area>
    </main>

    @if (levelOpen()) {
      <app-sheet [origin]="levelBtn()?.nativeElement ?? null" (closed)="levelOpen.set(false)">
        <div class="flex min-w-40 flex-col">
          @for (o of levelOptions(); track o.value) {
            <button type="button" (click)="setLevel($any(o.value) || null); levelOpen.set(false)" class="text-body flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left hover:bg-[var(--highlight)]">
              <span class="size-3.5 shrink-0 rounded-full" [style.background]="levelColor($any(o.value) || null) ?? 'transparent'" [class.border]="!o.value" [class.border-[var(--separator)]]="!o.value"></span>
              <span class="flex-1">{{ o.label }}</span>
              @if ((s.draft().level ?? '') === o.value) {
                <app-icon name="check" class="size-[1.125rem] text-[var(--accent)]" />
              }
            </button>
          }
        </div>
      </app-sheet>
    }

    <!-- ☰'s panel, under it (like the account's settings) -->
    @if (menuOpen()) {
      <app-sheet [origin]="menuBtn()?.nativeElement ?? null" [wide]="true" [tall]="true" (closed)="menuOpen.set(false)">
        <div class="flex flex-col gap-4 desktop:gap-3">
          @if (s.lesson(); as l) {
            <app-event-list [lessonId]="l.id" />
            <app-lesson-attempts [lesson]="l" />
            <div class="card">
              <button type="button" (click)="askDeleteFromMenu()" class="list-row w-full justify-center text-[var(--danger)]">{{ 'action.delete' | t }}</button>
            </div>
          }
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
  protected readonly levelOpen = signal(false);
  protected readonly levelBtn = viewChild<ElementRef<HTMLButtonElement>>('levelBtn');
  protected readonly levelColor = levelColor;
  protected readonly previewAll = signal(false);
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
