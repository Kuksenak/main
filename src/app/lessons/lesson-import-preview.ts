import { DeviceDetectionService } from '../core/services/device-detection.service';
import { LessonContent } from './lesson-content';
import { Component, computed, effect, inject, signal, viewChild } from '@angular/core';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { PageSheet } from '../core/ui/page-sheet/page-sheet';
import { AiResponse } from './ai-response';
import { asTask } from './gaps';
import { LessonForm } from './lesson-form';
import { LessonImport, LessonImportsService } from './lesson-imports.service';
import { LessonBlock, LessonInput, LessonService } from './lesson.service';

/**
 * What was read from photos, before it goes in: what the model made of it (AiResponse) and the
 * page's pieces (each exercise one block) in the lesson editor, each with a checkbox — fix what's
 * off, pick some, then Save as a new lesson or Add to a lesson (any; the one it was read for
 * first); the rest stays for the next pick, and once all are placed (or Discard) it's done.
 * Opened from the editor's "Ready" chip or the "ready" notification; placed once in the layout.
 */
@Component({
  selector: 'app-lesson-import-preview',
  imports: [AiResponse, LessonContent, LessonForm, PageSheet, TranslatePipe],
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
              @if (desktop) {
                <p class="text-footnote px-1 opacity-60">{{ 'lessons.pickHint' | t }}</p>
                <!-- (the editor loads when first needed) -->
                @defer {
                  <app-lesson-form [(value)]="draft" [photos]="false" [selectable]="true" [(selected)]="picked" />
                }
              } @else {
                <!-- Phones: read only (lessons are made on a computer) -->
                <app-lesson-content [blocks]="draft.blocks" />
              }
            } @else {
              <p class="text-body py-10 text-center opacity-40">{{ 'lessons.reading' | t }}</p>
            }
            <!-- The picked ones: a new lesson, or into a lesson; then the rest stays here -->
            <div class="flex flex-wrap items-center justify-end gap-2 pt-2">
              <button type="button" (click)="discard(x)" class="btn-secondary mr-auto !text-[var(--danger)]">{{ 'lessons.discard' | t }}</button>
              @if (!desktop) {
                <!-- (phones: nothing saved from here) -->
              } @else if (x.draft && draft.blocks.length && x.id === 'local' && imports.localInto(); as into) {
                <!-- From the lesson's AI chat: into that lesson -->
                <button type="button" (click)="intoOpen(x, into)" [disabled]="!picked().length" class="btn-primary">{{ 'lessons.addToLesson' | t }} ({{ picked().length }})</button>
              } @else if (x.draft && draft.blocks.length) {
                <button type="button" (click)="asNew(x)" [disabled]="!picked().length" class="btn-secondary">{{ 'lessons.saveAsNew' | t }} ({{ picked().length }})</button>
                <span class="flex items-center gap-1">
                  <select [value]="target() ?? ''" (change)="target.set($any($event.target).value || null)" [attr.aria-label]="'lessons.lessonPick' | t" class="chip max-w-48 !rounded-full">
                    @for (l of lessonList(); track l.id) {
                      <option [value]="l.id" [selected]="l.id === target()">{{ l.title }}</option>
                    }
                  </select>
                  <button type="button" (click)="intoLesson(x)" [disabled]="!picked().length || !target()" class="btn-primary">{{ 'lessons.addToLesson' | t }} ({{ picked().length }})</button>
                </span>
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
  protected readonly desktop = !inject(DeviceDetectionService).isMobile();
  protected readonly imports = inject(LessonImportsService);
  private readonly page = viewChild<PageSheet>('page');
  protected readonly imp = signal<LessonImport | null>(null);
  protected draft: LessonInput = { title: '', blocks: [] };
  // The picked blocks (all at first), and the lesson to add them to
  protected readonly picked = signal<number[]>([]);
  protected readonly target = signal<string | null>(null);
  private lessons = inject(LessonService);
  private i18n = inject(I18nService);
  protected readonly lessonList = computed(() =>
    [...this.lessons.lessons()].sort((a, b) => a.title.localeCompare(b.title, this.i18n.locale())),
  );

  constructor() {
    // The one asked for, with its draft
    effect(() => {
      const id = this.imports.previewing();
      this.imp.set(null);
      if (!id) return;
      const local = id === 'local' ? this.imports.local() : null;
      (local ? Promise.resolve(local) : this.imports.get(id)).then(
        (x) => {
          if (this.imports.previewing() !== id) return;
          this.draft = { title: x.draft?.title ?? '', blocks: (x.draft?.blocks ?? []).map(asTask) };
          this.picked.set(this.draft.blocks.map((_, i) => i));
          this.target.set(x.lessonId ?? this.lessonList()[0]?.id ?? null);
          this.imp.set(x);
        },
        () => this.imports.previewing.set(null),
      );
    });
  }

  protected asNew(x: LessonImport): void {
    this.imports.addAsNew(this.draft.title, this.take(), (id) => this.target.set(id));
    this.next(x);
  }

  protected intoOpen(x: LessonImport, into: (blocks: LessonBlock[]) => void): void {
    into(this.take());
    this.next(x);
  }

  protected intoLesson(x: LessonImport): void {
    const id = this.target();
    if (!id) return;
    this.imports.addTo(id, this.take());
    this.next(x);
  }

  // The picked blocks, out of the draft
  private take() {
    const picked = new Set(this.picked());
    const taken = this.draft.blocks.filter((_, i) => picked.has(i));
    this.draft = { ...this.draft, blocks: this.draft.blocks.filter((_, i) => !picked.has(i)) };
    return taken;
  }

  // The rest stays (all picked again); nothing left: done with it
  private next(x: LessonImport): void {
    this.picked.set(this.draft.blocks.map((_, i) => i));
    if (this.draft.blocks.length) return;
    this.imports.drop(x.id);
    this.page()?.close();
  }

  protected discard(x: LessonImport): void {
    this.imports.drop(x.id);
    this.page()?.close();
  }
}
