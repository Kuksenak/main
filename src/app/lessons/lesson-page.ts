import { FormsModule } from '@angular/forms';
import { Component, DestroyRef, ElementRef, computed, effect, inject, input, output, signal, untracked, viewChild } from '@angular/core';
import { I18nService } from '../core/i18n/i18n.service';
import { SelectField, SelectOption } from '../core/ui/select/select';
import { BrandIcon } from '../core/ui/icon/brand-icon';
import { Icon } from '../core/ui/icon/icon';
import { Router } from '@angular/router';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { ConfirmDelete } from '../core/ui/confirm';
import { ScrollArea } from '../core/ui/scroll-area/scroll-area';
import { Sheet } from '../core/ui/sheet/sheet';
import { LessonAttempts } from './lesson-attempts';
import { LessonForm } from './lesson-form';
import { LessonInfo } from './lesson-info';
import { LessonState } from './lesson-state';
import { LEVELS, Level } from './lesson.service';

/** How long after the last change the lesson is saved; typed on without a pause: at least this often. */
const SAVE_AFTER_MS = 1500;
const SAVE_AT_LEAST_MS = 5000;

/**
 * A lesson on desktop, on the right of the list (/lessons/:id; /lessons/new starts one): always
 * edited in place, saved a moment after each change (and on leaving): the name, whether it's saved,
 * Task, Assistant and ☰ in one row; the tasks the whole width under it; ☰ opens the rest (its level,
 * events, public link, the students' answers, Delete) in a panel under it. Phones open lessons as cards instead (LessonCard), read only.
 */
@Component({
  selector: 'app-lesson-page',
  imports: [SelectField, BrandIcon, ConfirmDelete, FormsModule, Icon, LessonAttempts, LessonForm, LessonInfo, ScrollArea, Sheet, TranslatePipe],
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
            <span class="text-footnote shrink-0 opacity-45">
              @if (s.saving() || s.dirty()) {
                {{ 'lessons.saving' | t }}
              } @else if (s.id()) {
                {{ 'lessons.saved' | t }}
              }
            </span>
            <button type="button" (click)="form()?.addTask()" class="btn-secondary gap-1.5 pl-2.5">
              <app-icon name="plus" [strokeWidth]="2" class="size-[1.125rem]" />{{ 'lessons.slashTask' | t }}
            </button>
            <button type="button" (click)="form()?.openAssistant()" class="btn-secondary gap-1.5 pl-2.5">
              <app-brand-icon name="sparkle" class="size-[1.125rem]" />{{ 'nav.ai' | t }}
            </button>
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
          <div class="card">
            <div class="list-row">
              <span class="flex-1">{{ 'lessons.level' | t }}</span>
              <app-select [options]="levelOptions()" [ngModel]="s.draft().level ?? ''" (ngModelChange)="setLevel($event || null)" [ngModelOptions]="{ standalone: true }" />
            </div>
          </div>
          @if (s.lesson(); as l) {
            <app-lesson-info [lesson]="l" />
            <app-lesson-attempts [lesson]="l" />
            <div class="card">
              <button type="button" (click)="askDeleteFromMenu()" class="list-row w-full text-left text-[var(--danger)]">{{ 'action.delete' | t }}</button>
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
