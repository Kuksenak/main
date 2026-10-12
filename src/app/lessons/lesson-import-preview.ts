import { Component, effect, inject, signal, viewChild } from '@angular/core';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { PageSheet } from '../core/ui/page-sheet/page-sheet';
import { AiResponse } from './ai-response';
import { LessonForm } from './lesson-form';
import { LessonImport, LessonImportsService } from './lesson-imports.service';
import { LessonInput } from './lesson.service';

/**
 * A lesson read from photos, before it goes in: what the model made of it (AiResponse) and the
 * draft in the lesson editor — fix what's off, then Add to lesson (into its lesson, or a new
 * one) or Discard. Opened from the editor's "Ready" chip or the "ready" notification; placed once
 * in the layout.
 */
@Component({
  selector: 'app-lesson-import-preview',
  imports: [AiResponse, LessonForm, PageSheet, TranslatePipe],
  template: `
    @if (imports.previewing()) {
      <app-page-sheet #page [title]="'lessons.preview' | t" [wide]="true" [actions]="false" (closed)="imports.previewing.set(null)">
        <div class="flex flex-col gap-4">
          <h1 class="px-1 text-xl font-semibold mobile:hidden">{{ 'lessons.preview' | t }}</h1>
          @if (imp(); as x) {
            @if (x.status === 'failed') {
              <p class="text-body text-[var(--danger)]">{{ 'lessons.photoFailed' | t }}</p>
              <p class="text-footnote select-text break-words opacity-60">{{ x.error }}</p>
            } @else if (x.draft; as d) {
              <app-ai-response [model]="d.model" [seconds]="d.seconds" [raw]="d.raw" [blocks]="d.blocks" (closed)="0" />
              <app-lesson-form [(value)]="draft" [photos]="false" />
            } @else {
              <p class="text-body py-10 text-center opacity-40">{{ 'lessons.reading' | t }}</p>
            }
            <div class="flex flex-wrap justify-end gap-2 pt-2">
              <button type="button" (click)="discard(x)" class="btn-secondary !text-[var(--danger)]">{{ 'lessons.discard' | t }}</button>
              @if (x.draft) {
                <button type="button" (click)="add(x)" class="btn-primary">{{ (x.lessonId ? 'lessons.addToLesson' : 'lessons.addAsNew') | t }}</button>
              }
            </div>
          } @else {
            <p class="text-body py-10 text-center opacity-40">{{ 'app.loading' | t }}</p>
          }
        </div>
      </app-page-sheet>
    }
  `,
})
export class LessonImportPreview {
  protected readonly imports = inject(LessonImportsService);
  private readonly page = viewChild<PageSheet>('page');
  protected readonly imp = signal<LessonImport | null>(null);
  protected draft: LessonInput = { title: '', blocks: [] };

  constructor() {
    // The one asked for, with its draft
    effect(() => {
      const id = this.imports.previewing();
      this.imp.set(null);
      if (!id) return;
      this.imports.get(id).then(
        (x) => {
          if (this.imports.previewing() !== id) return;
          this.draft = { title: x.draft?.title ?? '', blocks: x.draft?.blocks ?? [] };
          this.imp.set(x);
        },
        () => this.imports.previewing.set(null),
      );
    });
  }

  protected add(x: LessonImport): void {
    this.imports.add(x, this.draft.title, this.draft.blocks);
    this.page()?.close();
  }

  protected discard(x: LessonImport): void {
    this.imports.drop(x.id);
    this.page()?.close();
  }
}
