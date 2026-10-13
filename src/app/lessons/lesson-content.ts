import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, input, model } from '@angular/core';
import { DeviceDetectionService } from '../core/services/device-detection.service';
import { Masonry } from '../core/ui/masonry';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { Icon } from '../core/ui/icon/icon';
import { Gap, GapPart, LessonFills, Styled, gapLines, gapRight, splitInstruction, styled } from './gaps';
import { LessonBlock, imageSrc } from './lesson.service';

/** Exercise answers (block → option) and checklist ticks ("block:item"); blocks by their place in the lesson. */
export type LessonAnswers = Record<number, number>;
export type { LessonFills } from './gaps';

/**
 * A lesson's content as read, in one of three ways:
 * - `teacher`: the teacher's own blocks under "For me" (🔒), the rest under "For students" (👁) —
 *   no labels when there's only one kind; exercises with the right answer marked; checklist ticks
 *   kept while the page is open;
 * - `student` (the public link / their own page — only the students' blocks come there, without
 *   the right answers, `indexes` giving each one's place in the whole lesson): a tap picks (the
 *   pick marked, never right / wrong — the teacher checks), gaps typed in, ticks; all two-way
 *   bound (`answers`, `ticks`, `fills`) so the page saves them; `locked` once sent;
 * - `review`: one student's answers and ticks as they left them (their pick marked with `who`).
 * Gaps blocks: the lines with the right words marked (teacher), a field in each gap on the
 * text's line (student), the words written in (review: wrong ones with the right one beside).
 * Exercises are cards of rows (the question, then the answers with a circle); texts paragraphs;
 * older lessons' headings and links too.
 */
@Component({
  selector: 'app-lesson-content',
  imports: [Icon, Masonry, NgTemplateOutlet, TranslatePipe],
  // Tiled (a student's page): dense like a textbook page (see .lesson-dense)
  host: { class: 'flex flex-col', '[class.gap-5]': '!tiled()', '[class.gap-3]': 'tiled()', '[class.lesson-dense]': 'tiled()' },
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
              <button type="button" (click)="tick(i, j)" class="list-row w-full text-left" [disabled]="mode() === 'review' || locked()">
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
            <div class="card">
              <div class="list-row py-3"><span class="font-medium">{{ b.text }}</span></div>
              @for (o of b.options ?? []; track $index; let j = $index) {
                @let state = optionState(b, i, j);
                <button type="button" (click)="choose(i, j)" class="list-row w-full text-left" [disabled]="mode() !== 'student' || locked()">
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
            <div class="card gaps-card flex flex-col px-4 py-3">
              @if (b.instruction) {
                <p class="text-body whitespace-pre-wrap font-semibold leading-[1.9]">@for (st of style(b.instruction); track $index) {@if (st.href) {<a [href]="st.href" target="_blank" rel="noopener noreferrer" class="text-[var(--accent)] underline underline-offset-2">{{ st.t }}</a>} @else {<span [class.italic]="st.i" [class.underline]="st.u" [class.underline-offset-2]="st.u">{{ st.t }}</span>}}</p>
              }
              @for (line of lines(b.text); track $index) {
                <p class="text-body min-h-[1.5em] leading-[1.9]">
                  @for (p of line; track $index) {
                    @if (gapOf(p); as g) {
                      @let w = word(i, g.gap);
                      @switch (mode()) {
                        @case ('teacher') {
                          @if (g.options; as opts) {
                            <!-- To choose: the options, the right one marked -->
                            <span class="mx-0.5 inline-flex flex-wrap items-baseline gap-x-1">
                              @for (o of opts; track $index; let last = $last) {
                                <span [class.font-semibold]="isRight(g, o)" [class.text-[var(--accent)]]="isRight(g, o)" [class.opacity-55]="!isRight(g, o)">{{ o }}</span>
                                @if (!last) {
                                  <span class="opacity-30">/</span>
                                }
                              }
                            </span>
                          } @else {
                            <span class="mx-0.5 rounded-md bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] px-1.5 py-0.5 font-medium text-[var(--accent)]">{{ g.answers.join(' / ') || '…' }}</span>
                          }
                        }
                        @case ('student') {
                          @if (g.options; as opts) {
                            <!-- To choose: like a textbook's "( va / vas / vont )", on the write-in
                                 fields' light blue instead of brackets; the picked one blue and bold,
                                 the others faded; a tap picks (again: unpicks) -->
                            <span class="mx-0.5 inline rounded-md bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] px-[0.6ch] py-[0.1em] [box-decoration-break:clone]">
                              @for (o of opts; track $index; let last = $last) {
                                <button
                                  type="button"
                                  [disabled]="locked()"
                                  (click)="write(i, g.gap, w === o ? '' : o)"
                                  class="inline leading-[1.3] transition-opacity disabled:cursor-default"
                                  [class.font-bold]="w === o"
                                  [class.text-[var(--accent)]]="w === o"
                                  [class.opacity-45]="!!w && w !== o"
                                  [class.hover:text-[var(--accent)]]="!locked()"
                                >{{ o }}</button>
                                @if (!last) {
                                  <span class="mx-[0.35ch] opacity-35">/</span>
                                }
                              }
                            </span>
                          } @else {
                          <!-- On the text's line: a light blue field, like the answers in the teacher's
                               view — the blue is the wrapper's; the field itself just the text's
                               height (browsers stretch the cursor over the whole field) -->
                          <span class="mx-0.5 -my-[0.2em] inline-block rounded-md bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] py-[0.2em] pl-[1ch] pr-[0.6ch] align-baseline leading-none transition-colors focus-within:bg-[color-mix(in_srgb,var(--accent)_24%,transparent)]">
                            <input
                              type="text"
                              autocomplete="off"
                              autocapitalize="off"
                              spellcheck="false"
                              [value]="w"
                              [disabled]="locked()"
                              (input)="write(i, g.gap, $any($event.target).value)"
                              [style.width.ch]="fitsContent ? null : width(g, w)"
                              class="inline-block h-[1.1em] min-w-[6ch] align-baseline border-0 bg-transparent p-0 text-left font-semibold leading-[1.1] text-[var(--accent)] caret-[var(--accent)] outline-none [field-sizing:content] disabled:opacity-100"
                            />
                          </span>
                          }
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
                      <!-- **bold**, *italic*, __underlined__ -->
                      @for (st of style(textOf(p)); track $index) {
                        @if (st.href) {
                          <a [href]="st.href" target="_blank" rel="noopener noreferrer" class="text-[var(--accent)] underline underline-offset-2">{{ st.t }}</a>
                        } @else {
                          <span class="whitespace-pre-wrap" [class.font-bold]="st.b" [class.italic]="st.i" [class.underline]="st.u" [class.underline-offset-2]="st.u">{{ st.t }}</span>
                        }
                      }
                    }
                  }
                </p>
              }
            </div>
          </div>
        }
        @case ('image') {
          <figure class="flex flex-col gap-1.5">
            <img [src]="src(b.url)" [alt]="b.text ?? ''" loading="lazy" class="max-h-96 w-full rounded-[var(--radius-card)] border-[0.5px] border-[var(--separator)] bg-white object-contain" />
            @if (b.text) {
              <figcaption class="text-footnote px-1 opacity-60">{{ b.text }}</figcaption>
            }
          </figure>
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
          <p class="text-body whitespace-pre-wrap px-1 leading-relaxed">@for (st of style(b.text ?? ''); track $index) {@if (st.href) {<a [href]="st.href" target="_blank" rel="noopener noreferrer" class="text-[var(--accent)] underline underline-offset-2">{{ st.t }}</a>} @else {<span [class.font-bold]="st.b" [class.italic]="st.i" [class.underline]="st.u" [class.underline-offset-2]="st.u">{{ st.t }}</span>}}</p>
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
        @if (tiled()) {
          @if (desktop) {
            <!-- Desktop: tiles like Pinterest's, each as wide as its lines need (1–3 columns),
                 packed tight (see Masonry) -->
            <!-- Thirds of the page: a tile takes one, two or all three (lines may wrap) -->
            <div appMasonry="3">
              @for (tile of tilesOf(g.blocks); track tile[0].i; let count = $count) {
                <!-- Just one: the whole width -->
                <div class="flex flex-col gap-2" [attr.data-span]="count === 1 ? 99 : spanOf(tile)">
                  @for (b of tile; track b.i) {
                    <ng-container [ngTemplateOutlet]="block" [ngTemplateOutletContext]="{ $implicit: b.block, i: b.i }" />
                  }
                </div>
              }
            </div>
          } @else {
            <div class="flex flex-col gap-3">
              @for (tile of tilesOf(g.blocks); track tile[0].i) {
                <div class="flex flex-col gap-2">
                  @for (b of tile; track b.i) {
                    <ng-container [ngTemplateOutlet]="block" [ngTemplateOutletContext]="{ $implicit: b.block, i: b.i }" />
                  }
                </div>
              }
            </div>
          }
        } @else {
          @for (b of g.blocks; track b.i) {
            <ng-container [ngTemplateOutlet]="block" [ngTemplateOutletContext]="{ $implicit: b.block, i: b.i }" />
          }
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
  /** Student: sent — nothing changes any more. */
  readonly locked = input(false);
  /** Desktop: the blocks as tiles in columns (a task with the text before it — its instruction — one tile). */
  readonly tiled = input(false);

  protected readonly desktop = !inject(DeviceDetectionService).isMobile();

  // A tile's width in columns, by its longest item line (gaps / choices counted as they show; the
  // instruction wraps, it doesn't count): short lines — one column, longer — two, long ones and
  // pictures — three / two
  protected spanOf(tile: { block: LessonBlock }[]): number {
    let longest = 0;
    let total = 0;
    for (const { block: b } of tile) {
      if (b.kind === 'image') longest = Math.max(longest, 60);
      // (an older task's instruction is its first line: it wraps too, it doesn't count)
      const items = splitInstruction(b).text ?? '';
      if (b.kind !== 'gaps' && b.kind !== 'exercise' && b.kind !== 'checklist' && tile.length > 1) continue; // a text before its task wraps
      const lines = [...items.split('\n'), ...(b.items ?? []), ...(b.options ?? [])].map((l) =>
        l
          .replace(/\[[^[\]\n]*\]/g, '________')
          .replace(/\{([^{}\n]*)\}/g, (_, x: string) => x.replace(/\*/g, '').split('|').join(' / ')),
      );
      for (const l of lines) {
        longest = Math.max(longest, l.length);
        total += l.length;
      }
    }
    // A long paragraph wraps anyway: wide enough to read, not the whole width
    // Lines may wrap: a third holds ~60 characters a line; a long paragraph — two thirds at most
    if (longest > 120) longest = Math.max(100, Math.min(longest, total / 4));
    return longest <= 60 ? 1 : longest <= 120 ? 2 : 3;
  }

  // Tiles: every task its own; a text (or heading) takes the task after it along
  protected tilesOf<T extends { block: LessonBlock }>(blocks: T[]): T[][] {
    const tiles: T[][] = [];
    const isText = (x: T) => x.block.kind === 'text' || x.block.kind === 'heading';
    for (const b of blocks) {
      const last = tiles.at(-1);
      // Joins the tile before it: after a text (or heading) only — its instruction; one-question
      // exercises of older lessons, one after another. Every task its own tile.
      const join = !!last && !isText(b) && (last.every(isText) || (b.block.kind === 'exercise' && last.at(-1)!.block.kind === 'exercise'));
      if (join) last.push(b);
      else tiles.push([b]);
    }
    return tiles;
  }

  // A gaps block's lines (parsed once per text)
  private readonly parsed = new Map<string, GapPart[][]>();
  protected lines(text: string | null): GapPart[][] {
    const key = text ?? '';
    let lines = this.parsed.get(key);
    if (!lines) this.parsed.set(key, (lines = gapLines(key)));
    return lines;
  }

  protected gapOf(p: GapPart): Gap | null {
    return 'gap' in p ? p : null;
  }

  // Styled pieces of a text part (parsed once per text)
  private readonly styles = new Map<string, Styled[]>();
  protected style(text: string): Styled[] {
    let out = this.styles.get(text);
    if (!out) {
      if (this.styles.size > 500) this.styles.clear();
      this.styles.set(text, (out = styled(text)));
    }
    return out;
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

  // Room for a word (students don't get the answers — nothing to give away), growing with it
  // Where fields can size to their text (field-sizing): exactly the word, no room left around it
  protected readonly fitsContent = typeof CSS !== 'undefined' && CSS.supports?.('field-sizing', 'content');
  protected width(g: { answers: string[] }, w: string): number {
    const longest = Math.max(0, ...g.answers.map((a) => a.length));
    return Math.max(8, longest + 1, w.length * 0.85 + 1);
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
    if (this.locked()) return;
    const key = `${block}:${item}`;
    this.ticks.update((t) => (t.includes(key) ? t.filter((x) => x !== key) : [...t, key]));
  }

  protected choose(block: number, option: number): void {
    if (this.locked()) return;
    this.answers.update((a) => ({ ...a, [block]: option }));
  }

  // An answer's circle: the teacher sees the right one; a student their pick (in the accent —
  // never right / wrong); a review: the pick ✓ or ✗, and once wrong, the right one ✓ (no right
  // answer set: the pick in the accent).
  protected optionState(b: LessonBlock, block: number, option: number): 'right' | 'wrong' | 'picked' | 'none' {
    const right = b.answer ?? null;
    if (this.mode() === 'teacher') return option === right ? 'right' : 'none';
    const picked = this.answers()[block];
    if (this.mode() === 'student') return picked === option ? 'picked' : 'none';
    if (picked === undefined) return 'none';
    if (right === null) return picked === option ? 'picked' : 'none';
    if (option === right) return 'right';
    return picked === option ? 'wrong' : 'none';
  }

  // Beside an answer: "right answer" (where it isn't the pick itself), the student's name (review)
  protected note(b: LessonBlock, block: number, option: number): string | null {
    const right = b.answer ?? null;
    const picked = this.answers()[block];
    if (this.mode() === 'student') return null;
    if (this.mode() === 'review' && picked === option) return this.who() || null;
    if (option !== right) return null;
    if (this.mode() === 'teacher') return 'right';
    return picked !== undefined && picked !== right ? 'right' : null;
  }

  protected src(id: string | null): string {
    return imageSrc(id);
  }

  protected host(url: string | null): string {
    try {
      return new URL(url ?? '').hostname;
    } catch {
      return url ?? '';
    }
  }
}
