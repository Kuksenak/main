import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, input, model } from '@angular/core';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { Icon } from '../core/ui/icon/icon';
import { LessonBlock } from './lesson.service';

/** Exercise answers (block → option) and checklist ticks ("block:item"); blocks by their place in the lesson. */
export type LessonAnswers = Record<number, number>;

/**
 * A lesson's content as read, in one of three ways:
 * - `teacher`: the teacher's own blocks under "For me" (🔒), the rest under "For students" (👁) —
 *   no labels when there's only one kind; exercises with the right answer marked; checklist ticks
 *   kept while the page is open;
 * - `student` (the public link — only the students' blocks come there, `indexes` giving each one's
 *   place in the whole lesson): a tap answers — right ✓ green; wrong ✗ orange, the right one shown;
 *   ticks; both two-way bound (`answers`, `ticks`) so the page saves them;
 * - `review`: one student's answers and ticks as they left them (their pick marked with `who`).
 * Exercises are cards of rows (the question, then the answers with a circle); texts paragraphs;
 * older lessons' headings and links too.
 */
@Component({
  selector: 'app-lesson-content',
  imports: [Icon, NgTemplateOutlet, TranslatePipe],
  host: { class: 'flex flex-col gap-5' },
  template: `
    <!-- An answer's circle: empty; ✓ (green); ✗ (orange) -->
    <ng-template #dot let-state>
      @switch (state) {
        @case ('right') {
          <span class="flex size-[1.375rem] shrink-0 items-center justify-center rounded-full bg-[var(--success)] text-white"><app-icon name="check" [strokeWidth]="3" class="size-3.5" /></span>
        }
        @case ('wrong') {
          <span class="flex size-[1.375rem] shrink-0 items-center justify-center rounded-full bg-[var(--warning)] text-white"><app-icon name="close" [strokeWidth]="3" class="size-3.5" /></span>
        }
        @case ('picked') {
          <span class="flex size-[1.375rem] shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-white"><app-icon name="check" [strokeWidth]="3" class="size-3.5" /></span>
        }
        @default {
          <span class="size-[1.375rem] shrink-0 rounded-full shadow-[inset_0_0_0_1.5px_color-mix(in_srgb,var(--text)_28%,transparent)]"></span>
        }
      }
    </ng-template>

    <ng-template #block let-b let-i="i">
      @switch (b.kind) {
        @case ('checklist') {
          <div class="card">
            @for (item of b.items ?? []; track $index; let j = $index) {
              <button type="button" (click)="tick(i, j)" class="list-row w-full text-left" [disabled]="mode() === 'review'">
                <span class="check" [class.is-on]="ticked(i, j)">
                  @if (ticked(i, j)) {
                    <app-icon name="check" [strokeWidth]="3" class="size-3.5" />
                  }
                </span>
                <span class="flex-1" [class.opacity-50]="ticked(i, j)">{{ item }}</span>
              </button>
            }
          </div>
        }
        @case ('exercise') {
          <div class="flex flex-col gap-1.5">
            <span class="card-label">{{ 'lessons.exercise' | t }}</span>
            <div class="card">
              <div class="list-row py-3"><span class="font-medium">{{ b.text }}</span></div>
              @for (o of b.options ?? []; track $index; let j = $index) {
                @let state = optionState(b, i, j);
                <button type="button" (click)="choose(i, j)" class="list-row w-full text-left" [disabled]="mode() !== 'student'">
                  <ng-container [ngTemplateOutlet]="dot" [ngTemplateOutletContext]="{ $implicit: state }" />
                  <span class="flex-1" [class.font-semibold]="state === 'right'">{{ o }}</span>
                  @if (note(b, i, j); as n) {
                    <span class="text-footnote opacity-55">{{ n === 'right' ? ('lessons.rightAnswer' | t) : n }}</span>
                  }
                </button>
              }
            </div>
          </div>
        }
        @case ('link') {
          <a [href]="b.url" target="_blank" rel="noopener noreferrer" class="card list-row active:opacity-70">
            <app-icon name="link" class="size-5 text-[var(--accent)]" />
            <div class="min-w-0 flex-1 leading-tight">
              <p class="truncate font-medium">{{ b.text || host(b.url) }}</p>
              <p class="text-footnote truncate opacity-50">{{ b.url }}</p>
            </div>
            <app-icon name="chevron-right" class="row-chevron" />
          </a>
        }
        @case ('heading') {
          <h2 class="px-1 pt-2 text-xl font-semibold">{{ b.text }}</h2>
        }
        @default {
          <p class="text-body whitespace-pre-wrap px-1 leading-relaxed">{{ b.text }}</p>
        }
      }
    </ng-template>

    @if (!blocks().length) {
      <p class="text-footnote opacity-50">{{ 'lessons.noContent' | t }}</p>
    }
    @for (g of groups(); track g.key) {
      <div class="flex flex-col gap-4">
        @if (labelled()) {
          <span class="card-label flex items-center gap-1.5">
            <app-icon [name]="g.key === 'me' ? 'lock' : 'eye'" class="size-4" />{{ (g.key === 'me' ? 'lessons.forMe' : 'lessons.forStudents') | t }}
          </span>
        }
        @for (b of g.blocks; track b.i) {
          <ng-container [ngTemplateOutlet]="block" [ngTemplateOutletContext]="{ $implicit: b.block, i: b.i }" />
        }
      </div>
    }
  `,
})
export class LessonContent {
  readonly blocks = input.required<LessonBlock[]>();
  /** Each block's place in the whole lesson (the public link has only the students' ones). */
  readonly indexes = input<number[] | null>(null);
  readonly mode = input<'teacher' | 'student' | 'review'>('teacher');
  /** Review: whose answers (shown beside their pick). */
  readonly who = input('');
  readonly answers = model<LessonAnswers>({});
  readonly ticks = model<string[]>([]);

  // The teacher's own blocks first, then the students' (each with its place in the lesson)
  protected readonly groups = computed(() => {
    const indexes = this.indexes();
    const indexed = this.blocks().map((block, n) => ({ block, i: indexes?.[n] ?? n }));
    return [
      { key: 'me', blocks: indexed.filter((b) => b.block.private) },
      { key: 'students', blocks: indexed.filter((b) => !b.block.private) },
    ].filter((g) => g.blocks.length);
  });
  protected readonly labelled = computed(() => this.mode() === 'teacher' && this.groups().length > 1);

  protected ticked(block: number, item: number): boolean {
    return this.ticks().includes(`${block}:${item}`);
  }

  protected tick(block: number, item: number): void {
    const key = `${block}:${item}`;
    this.ticks.update((t) => (t.includes(key) ? t.filter((x) => x !== key) : [...t, key]));
  }

  protected choose(block: number, option: number): void {
    this.answers.update((a) => ({ ...a, [block]: option }));
  }

  // An answer's circle: the teacher sees the right one; a student / a review: the pick ✓ or ✗,
  // and once answered wrong, the right one ✓ (no right answer set: the pick in the accent).
  protected optionState(b: LessonBlock, block: number, option: number): 'right' | 'wrong' | 'picked' | 'none' {
    const right = b.answer ?? null;
    if (this.mode() === 'teacher') return option === right ? 'right' : 'none';
    const picked = this.answers()[block];
    if (picked === undefined) return 'none';
    if (right === null) return picked === option ? 'picked' : 'none';
    if (option === right) return 'right';
    return picked === option ? 'wrong' : 'none';
  }

  // Beside an answer: "right answer" (where it isn't the pick itself), the student's name (review)
  protected note(b: LessonBlock, block: number, option: number): string | null {
    const right = b.answer ?? null;
    const picked = this.answers()[block];
    if (this.mode() === 'review' && picked === option) return this.who() || null;
    if (option !== right) return null;
    if (this.mode() === 'teacher') return 'right';
    return picked !== undefined && picked !== right ? 'right' : null;
  }

  protected host(url: string | null): string {
    try {
      return new URL(url ?? '').hostname;
    } catch {
      return url ?? '';
    }
  }
}
