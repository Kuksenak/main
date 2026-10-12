import { Component, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { ConfirmDelete } from '../core/ui/confirm';
import { ScrollArea } from '../core/ui/scroll-area/scroll-area';
import { LessonAttempts } from './lesson-attempts';
import { LessonContent } from './lesson-content';
import { LessonForm } from './lesson-form';
import { LessonInfo } from './lesson-info';
import { LessonState } from './lesson-state';

/**
 * A lesson on desktop, on the right of the list (/lessons/:id; /lessons/new starts one): the title
 * and Edit in one row; reading: the content and, beside it, the events using it and the public
 * link; edited in place (Cancel and Save in the header, Delete below the form). Phones open
 * lessons as cards instead (LessonCard).
 */
@Component({
  selector: 'app-lesson-page',
  imports: [ConfirmDelete, LessonAttempts, LessonContent, LessonForm, LessonInfo, ScrollArea, TranslatePipe],
  host: { class: 'flex min-h-0 w-full flex-1 flex-col' },
  template: `
    <main class="flex min-h-0 w-full flex-1 flex-col px-4 pb-4 pt-1">
      <app-scroll-area class="min-h-0 flex-1" viewportClass="!rounded-none" contentClass="gap-4 pb-10">
        <!-- One row: the title, then Edit, or Cancel and Save while editing -->
        <div class="flex flex-col">
          <div class="flex h-[var(--control-h)] items-center gap-3">
            <h1 class="min-w-0 flex-1 truncate text-xl font-semibold">{{ s.heading() }}</h1>
            @if (s.editing()) {
              <button type="button" (click)="cancel()" class="btn-secondary">{{ 'action.cancel' | t }}</button>
              <button type="button" (click)="save()" [disabled]="!s.canSave()" class="btn-primary">{{ 'action.save' | t }}</button>
            } @else if (s.lesson()) {
              <button type="button" (click)="s.edit()" class="btn-secondary">{{ 'action.edit' | t }}</button>
            }
          </div>
        </div>

        @if (s.editing()) {
          <app-lesson-form [(value)]="s.draft" [lessonId]="s.id()" />
          @if (s.id()) {
            <button #deleteBtn type="button" (click)="askDelete.set(deleteBtn)" class="btn-secondary self-start !text-[var(--danger)]">{{ 'action.delete' | t }}</button>
          }
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
