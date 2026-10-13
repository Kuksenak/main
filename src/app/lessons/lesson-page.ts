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
import { LEVELS, Level, LessonService, shareUrl } from './lesson.service';
import { EventList } from '../cards/event-list';
import { Toggle } from '../core/ui/toggle';

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
  imports: [ConfirmDelete, FormsModule, Icon, LessonAttempts, LessonForm, ScrollArea, Sheet, TranslatePipe, EventList, Toggle],
  host: { class: 'flex min-h-0 w-full flex-1 flex-col' },
  template: `
    <main class="flex min-h-0 w-full flex-1 flex-col px-4 pb-4 pt-1">
      <app-scroll-area class="min-h-0 flex-1" viewportClass="!rounded-none" contentClass="gap-4 pb-10">
        @if (s.id() && !s.lesson()) {
          <p class="text-body py-10 text-center opacity-40">{{ 'lessons.notFound' | t }}</p>
        } @else {
          <!-- One row: the name, Task, Assistant; whether it's saved -->
          <div class="flex h-[var(--control-h)] items-center gap-3">
            <input [ngModel]="s.draft().title" (ngModelChange)="setTitle($event)" type="text" [placeholder]="'lessons.new' | t" autocomplete="off" class="min-w-0 flex-1 bg-transparent text-xl font-semibold outline-none placeholder:opacity-35" />
            <!-- Just saved: a cloud with a check, for a moment -->
            @if (justSaved()) {
              <span class="flex shrink-0 items-center [animation:fadeIn_200ms_ease-out]" [attr.title]="'lessons.saved' | t" [attr.aria-label]="'lessons.saved' | t">
                <app-icon name="cloud-check" class="size-7 opacity-45" />
              </span>
            }
            <!-- ☰: the lesson's settings and the rest (level, public link, events, answers, Delete) -->
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

    <!-- ☰'s panel, under it (like the account's settings) -->
    @if (menuOpen()) {
      <app-sheet [origin]="menuBtn()?.nativeElement ?? null" [wide]="true" [tall]="true" (closed)="menuOpen.set(false)">
        <div class="flex flex-col gap-4 desktop:gap-3">
          <!-- Rows as in the account's menu: each unfolds its choices under it (› turns down) -->
          <div class="card">
            <button type="button" (click)="unfold('level')" class="list-row w-full text-left" [attr.aria-expanded]="unfolded() === 'level'">
              <app-icon name="book" class="row-icon" />
              <span class="flex-1">{{ 'lessons.level' | t }}</span>
              <span class="opacity-50">{{ s.draft().level ?? ('lessons.levelNone' | t) }}</span>
              <app-icon name="chevron-right" class="row-chevron -ml-1 transition-transform duration-200" [class.rotate-90]="unfolded() === 'level'" />
            </button>
            @if (unfolded() === 'level') {
              <div class="sub-rows">
                @for (o of levelOptions(); track o.value) {
                  <button type="button" (click)="setLevel($any(o.value) || null)" class="list-row w-full text-left">
                    <span class="flex-1">{{ o.label }}</span>
                    @if ((s.draft().level ?? '') === o.value) {
                      <app-icon name="check" class="size-5 text-[var(--accent)]" />
                    }
                  </button>
                }
              </div>
            }
            @if (s.lesson(); as l) {
              <!-- The public link: its switch right in the row; on, Copy link under it -->
              <label class="list-row cursor-pointer">
                <app-icon name="link" class="row-icon" />
                <span class="flex-1">{{ 'lessons.public' | t }}</span>
                <app-toggle [checked]="!!l.shareToken" (checkedChange)="lessons.share(l.id, $event)" [attr.aria-label]="'lessons.public' | t" />
              </label>
              @if (l.shareToken; as token) {
                <button type="button" (click)="copy(token)" class="list-row w-full text-left">
                  <app-icon [name]="copied() ? 'check' : 'copy'" class="row-icon" />
                  <span class="flex-1">{{ (copied() ? 'lessons.copied' : 'lessons.copy') | t }}</span>
                </button>
              }
            }
          </div>
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
  // ☰'s row unfolded
  protected readonly unfolded = signal<'level' | null>(null);
  protected unfold(row: 'level'): void {
    this.unfolded.set(this.unfolded() === row ? null : row);
  }
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
