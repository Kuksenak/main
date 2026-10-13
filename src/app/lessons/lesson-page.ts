import { FormsModule } from '@angular/forms';
import { Component, inject, input, signal, viewChild } from '@angular/core';
import { BrandIcon } from '../core/ui/icon/brand-icon';
import { Icon } from '../core/ui/icon/icon';
import { Router } from '@angular/router';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { ConfirmDelete } from '../core/ui/confirm';
import { ScrollArea } from '../core/ui/scroll-area/scroll-area';
import { LessonAttempts } from './lesson-attempts';
import { LessonContent } from './lesson-content';
import { LessonForm } from './lesson-form';
import { LessonInfo } from './lesson-info';
import { LessonState } from './lesson-state';
import { LEVELS, Level } from './lesson.service';

/**
 * A lesson on desktop, on the right of the list (/lessons/:id; /lessons/new starts one): the title
 * and Edit in one row; reading: the content and, beside it, the events using it and the public
 * link; edited in place (Cancel and Save in the header, Delete below the form). Phones open
 * lessons as cards instead (LessonCard).
 */
@Component({
  selector: 'app-lesson-page',
  imports: [BrandIcon, ConfirmDelete, FormsModule, Icon, LessonAttempts, LessonContent, LessonForm, LessonInfo, ScrollArea, TranslatePipe],
  host: { class: 'flex min-h-0 w-full flex-1 flex-col' },
  template: `
    <main class="flex min-h-0 w-full flex-1 flex-col px-4 pb-4 pt-1">
      <app-scroll-area class="min-h-0 flex-1" viewportClass="!rounded-none" contentClass="gap-4 pb-10">
        <!-- One row: the title, then Edit, or Cancel and Save while editing -->
        <div class="flex flex-col">
          <div class="flex h-[var(--control-h)] items-center gap-3">
            @if (s.editing()) {
              <!-- The name, edited right in the head -->
              <input #nameInput [ngModel]="s.draft().title" (ngModelChange)="setTitle($event)" type="text" [placeholder]="'lessons.new' | t" autocomplete="off" class="min-w-0 flex-1 bg-transparent text-xl font-semibold outline-none placeholder:opacity-35" />
            } @else {
              <h1 class="flex min-w-0 flex-1 items-center gap-2 text-xl font-semibold">
                <span class="truncate">{{ s.heading() }}</span>
                @if (s.lesson()?.level; as lv) {
                  <span class="text-footnote shrink-0 rounded-md bg-[var(--fill-strong)] px-1.5 py-0.5 font-semibold">{{ lv }}</span>
                }
              </h1>
            }
            @if (s.editing()) {
              <!-- A new task, the assistant; then Cancel, Save -->
              <button type="button" (click)="form()?.addTask()" class="btn-secondary gap-1.5 pl-2.5">
                <app-icon name="plus" [strokeWidth]="2" class="size-[1.125rem]" />{{ 'lessons.slashTask' | t }}
              </button>
              <button type="button" (click)="form()?.openAssistant()" class="btn-secondary gap-1.5 pl-2.5">
                <app-brand-icon name="sparkle" class="size-[1.125rem]" />{{ 'nav.ai' | t }}
              </button>
              <span class="mx-1 h-6 w-px bg-[var(--separator)]"></span>
              <button type="button" (click)="cancel()" class="btn-secondary">{{ 'action.cancel' | t }}</button>
              <button type="button" (click)="save()" [disabled]="!s.canSave()" class="btn-primary">{{ 'action.save' | t }}</button>
            } @else if (s.lesson()) {
              <button type="button" (click)="s.edit()" class="btn-secondary">{{ 'action.edit' | t }}</button>
            }
          </div>
        </div>

        @if (s.editing()) {
          @if (s.saveError(); as e) {
            <p class="text-footnote select-text break-words rounded-xl bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] px-3 py-2 text-[var(--danger)]">{{ 'lessons.saveFailed' | t }} {{ e }}</p>
          }
          <div class="flex items-start gap-6">
            <div class="flex min-w-0 flex-1 flex-col gap-4">
              <app-lesson-form [(value)]="s.draft" [lessonId]="s.id()" [showTitle]="false" [endButtons]="false" />
              @if (s.id()) {
                <button #deleteBtn type="button" (click)="askDelete.set(deleteBtn)" class="btn-secondary self-start !text-[var(--danger)]">{{ 'action.delete' | t }}</button>
              }
            </div>
            <!-- The lesson's settings: its level; its public link (once it's saved) -->
            <div class="flex w-72 shrink-0 flex-col gap-4">
              <div class="flex flex-col gap-1.5">
                <p class="text-footnote px-1 font-semibold uppercase tracking-wide opacity-50">{{ 'lessons.level' | t }}</p>
                <div class="card flex gap-1 p-1">
                  <button
                    type="button"
                    (click)="setLevel(null)"
                    [attr.aria-pressed]="!s.draft().level"
                    class="text-subhead h-8 flex-[1.4] rounded-lg font-medium hover:bg-[var(--highlight)]"
                    [class.!bg-[var(--accent)]]="!s.draft().level"
                    [class.text-white]="!s.draft().level"
                  >{{ 'lessons.levelNone' | t }}</button>
                  @for (lv of levels; track lv) {
                    <button
                      type="button"
                      (click)="setLevel(lv)"
                      [attr.aria-pressed]="s.draft().level === lv"
                      class="text-subhead h-8 flex-1 rounded-lg font-medium hover:bg-[var(--highlight)]"
                      [class.!bg-[var(--accent)]]="s.draft().level === lv"
                      [class.text-white]="s.draft().level === lv"
                    >{{ lv }}</button>
                  }
                </div>
              </div>
              @if (s.lesson(); as l) {
                <app-lesson-info [lesson]="l" [linkOnly]="true" />
              }
            </div>
          </div>
        } @else if (s.lesson(); as l) {
          <!-- The content, and beside it its events and public link -->
          <div class="flex items-start gap-6">
            <app-lesson-content class="min-w-0 flex-1" [blocks]="l.blocks" />
            <div class="flex w-72 shrink-0 flex-col gap-4">
              <app-lesson-attempts [lesson]="l" />
              <app-lesson-info [lesson]="l" />
            </div>
          </div>
        } @else {
          <p class="text-body py-10 text-center opacity-40">{{ 'lessons.notFound' | t }}</p>
        }
      </app-scroll-area>
    </main>

    @if (askDelete(); as origin) {
      <app-confirm-delete [origin]="origin" (confirmed)="remove()" (closed)="askDelete.set(null)" />
    }
  `,
})
export class LessonPage {
  /** The lesson's id; null = a new one. */
  readonly lessonId = input<string | null>(null);

  protected readonly s = new LessonState(() => this.lessonId());
  private router = inject(Router);
  protected readonly askDelete = signal<HTMLElement | null>(null); // the Delete button, while asking

  protected readonly levels = LEVELS;
  protected readonly form = viewChild(LessonForm);

  // The level picked (null: none)
  protected setLevel(level: Level | null): void {
    this.s.draft.update((d) => ({ ...d, level }));
  }

  protected setTitle(title: string): void {
    this.s.draft.update((d) => ({ ...d, title }));
  }

  protected cancel(): void {
    if (this.s.id()) this.s.cancelEdit();
    else this.router.navigate(['/lessons']);
  }

  protected save(): void {
    this.s.save((id) => this.router.navigate(['/lessons', id], { replaceUrl: true }));
  }

  protected remove(): void {
    this.s.remove();
    this.router.navigate(['/lessons']);
  }
}
