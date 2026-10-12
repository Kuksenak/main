import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, input, model, signal } from '@angular/core';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { Icon } from '../core/ui/icon/icon';
import { GapPart, LessonFills, gapLines, gapRight } from './gaps';
import { LessonBlock } from './lesson.service';

/** Exercise answers (block → option) and checklist ticks ("block:item"); blocks by their place in the lesson. */
export type LessonAnswers = Record<number, number>;
export type { LessonFills } from './gaps';

/**
 * A lesson's content as read, in one of three ways:
 * - `teacher`: the teacher's own blocks under "For me" (🔒), the rest under "For students" (👁) —
 *   no labels when there's only one kind; exercises with the right answer marked; checklist ticks
 *   kept while the page is open;
 * - `student` (the public link — only the students' blocks come there, `indexes` giving each one's
 *   place in the whole lesson): a tap answers — right ✓ green; wrong ✗ orange, the right one shown;
 *   ticks; both two-way bound (`answers`, `ticks`) so the page saves them;
 * - `review`: one student's answers and ticks as they left them (their pick marked with `who`).
 * Gaps blocks: the lines with the right words marked (teacher), a field in each gap (student:
 * green / orange once left), the words written in (review: wrong ones with the right one beside).
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
        @case ('gaps') {
          <div class="flex flex-col gap-1.5">
            <span class="card-label">{{ 'lessons.gaps' | t }}</span>
            <div class="card flex flex-col gap-1 px-4 py-3">
              @for (line of lines(b.text); track $index) {
                <p class="text-body min-h-[1.5em] leading-[2.25]">
                  @for (p of line; track $index) {
                    @if (gapOf(p); as g) {
                      @let w = word(i, g.gap);
                      @switch (mode()) {
                        @case ('teacher') {
                          <span class="mx-0.5 rounded-md bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] px-1.5 py-0.5 font-medium text-[var(--accent)]">{{ g.answers.join(' / ') || '…' }}</span>
                        }
                        @case ('student') {
                          @let st = gapState(i, g);
                          <input
                            type="text"
                            autocomplete="off"
                            autocapitalize="off"
                            spellcheck="false"
                            [value]="w"
                            (input)="write(i, g.gap, $any($event.target).value)"
                            (focus)="focused.set(i + ':' + g.gap)"
                            (blur)="focused.set(null)"
                            [style.width.ch]="width(g, w)"
                            class="mx-0.5 inline-block rounded-none border-b-2 bg-transparent px-0.5 text-center font-medium outline-none transition-colors"
                            [class.border-[var(--success)]]="st === 'right'"
                            [class.text-[var(--success)]]="st === 'right'"
                            [class.border-[var(--warning)]]="st === 'wrong'"
                            [class.text-[var(--warning)]]="st === 'wrong'"
                            [class.border-[var(--accent)]]="st === 'none'"
                          />
                        }
                        @default {
                          @if (w.trim()) {
                            @let ok = !g.answers.length || isRight(g, w);
                            <span class="mx-0.5 rounded-md px-1.5 py-0.5 font-medium" [class.text-[var(--success)]]="ok && g.answers.length" [class.text-[var(--warning)]]="!ok" [class.bg-[color-mix(in_srgb,var(--success)_14%,transparent)]]="ok && g.answers.length" [class.bg-[color-mix(in_srgb,var(--warning)_14%,transparent)]]="!ok" [class.bg-[var(--fill)]]="!g.answers.length">{{ w }}</span>
                            @if (!ok) {
                              <span class="text-footnote opacity-55">({{ g.answers.join(' / ') }})</span>
                            }
                          } @else {
                            <span class="mx-0.5 rounded-md bg-[var(--fill)] px-1.5 py-0.5 opacity-40">—</span>
                            @if (g.answers.length) {
                              <span class="text-footnote opacity-55">({{ g.answers.join(' / ') }})</span>
                            }
                          }
                        }
                      }
                    } @else {
                      <span class="whitespace-pre-wrap">{{ textOf(p) }}</span>
                    }
                  }
                </p>
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
  readonly fills = model<LessonFills>({});
  // The gap being typed in ("block:gap": not marked right / wrong while typing)
  protected readonly focused = signal<string | null>(null);

  // A gaps block's lines (parsed once per text)
  private readonly parsed = new Map<string, GapPart[][]>();
  protected lines(text: string | null): GapPart[][] {
    const key = text ?? '';
    let lines = this.parsed.get(key);
    if (!lines) this.parsed.set(key, (lines = gapLines(key)));
    return lines;
  }

  protected gapOf(p: GapPart): { gap: number; answers: string[] } | null {
    return 'gap' in p ? p : null;
  }

  protected textOf(p: GapPart): string {
    return 'text' in p ? p.text : '';
  }

  protected word(block: number, gap: number): string {
    return this.fills()[block]?.[gap] ?? '';
  }

  protected write(block: number, gap: number, value: string): void {
    this.fills.update((f) => {
      const words = [...(f[block] ?? [])];
      while (words.length < gap) words.push('');
      words[gap] = value;
      return { ...f, [block]: words };
    });
  }

  protected isRight(g: { answers: string[] }, w: string): boolean {
    return gapRight(g.answers, w);
  }

  // A student's gap: right / wrong once written and left (no set answer: just written)
  protected gapState(block: number, g: { gap: number; answers: string[] }): 'right' | 'wrong' | 'none' {
    const w = this.word(block, g.gap);
    if (!w.trim() || !g.answers.length || this.focused() === `${block}:${g.gap}`) return 'none';
    return gapRight(g.answers, w) ? 'right' : 'wrong';
  }

  // Wide enough for the answer (not giving its length away exactly) and what's typed
  protected width(g: { answers: string[] }, w: string): number {
    const longest = Math.max(0, ...g.answers.map((a) => a.length));
    return Math.max(5, longest + 2, w.length + 1);
  }

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
