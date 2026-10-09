import { Component, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { ConfirmDelete } from '../core/ui/confirm';
import { Icon } from '../core/ui/icon/icon';
import { ScrollArea } from '../core/ui/scroll-area/scroll-area';
import { DemoQuiz } from './demo-quiz';
import { LessonContent } from './lesson-content';
import { LessonForm } from './lesson-form';
import { LessonInfo } from './lesson-info';
import { LessonState } from './lesson-state';

/**
 * A lesson as a desktop page (/lessons/:id; /lessons/new starts one), full width: a round back
 * button, the title and Edit in one row; edited in place (Cancel · Save in the header; the public link
 * switch, the events using it and Delete below the form). Mobile opens lessons as cards instead (LessonCard).
 */
@Component({
  selector: 'app-lesson-page',
  imports: [ConfirmDelete, DemoQuiz, Icon, LessonContent, LessonForm, LessonInfo, RouterLink, ScrollArea, TranslatePipe],
  host: { class: 'flex min-h-0 w-full flex-1 flex-col' },
  template: `
    <main class="flex min-h-0 w-full flex-1 flex-col px-4 pb-4 pt-1">
      <app-scroll-area class="min-h-0 flex-1" contentClass="gap-6 pb-10">
        <!-- One row: ‹ (back to the library) · title · Edit, or Cancel · Save while editing -->
        <div class="flex flex-col">
          <div class="flex items-center gap-3">
            <a routerLink="/lessons" [attr.aria-label]="'action.back' | t" class="icon-btn">
              <app-icon name="chevron-left" class="-ml-0.5 size-6" />
            </a>
            <h1 class="min-w-0 flex-1 truncate text-2xl font-semibold">{{ s.heading() }}</h1>
            @if (s.editing()) {
              <button type="button" (click)="cancel()" class="btn-secondary">{{ 'action.cancel' | t }}</button>
              <button type="button" (click)="save()" [disabled]="!s.canSave()" class="btn-primary">{{ 'action.save' | t }}</button>
            } @else if (s.lesson()) {
              <button type="button" (click)="s.edit()" class="btn-white">{{ 'action.edit' | t }}</button>
            }
          </div>
        </div>

        @if (s.editing()) {
          <app-lesson-form [(value)]="s.draft" />
          <!-- Public link and the events using the lesson -->
          @if (s.lesson(); as l) {
            <app-lesson-info [lesson]="l" />
          }
          @if (s.id()) {
            <button type="button" (click)="askDelete.set(true)" class="btn-secondary self-start !text-[var(--danger)]">{{ 'action.delete' | t }}</button>
          }
        } @else if (s.lesson(); as l) {
          <app-lesson-content [blocks]="l.blocks" />
          <app-demo-quiz />
        } @else {
          <p class="text-body py-10 text-center opacity-40">{{ 'lessons.notFound' | t }}</p>
        }
      </app-scroll-area>
    </main>

    @if (askDelete()) {
      <app-confirm-delete (confirmed)="remove()" (closed)="askDelete.set(false)" />
    }
  `,
})
export class LessonPage {
  /** The lesson's id; null = a new one. */
  readonly lessonId = input<string | null>(null);

  protected readonly s = new LessonState(() => this.lessonId());
  private router = inject(Router);
  protected readonly askDelete = signal(false);

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
