import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, input, signal } from '@angular/core';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { Icon } from '../core/ui/icon/icon';
import { LessonBlock } from './lesson.service';

/**
 * A lesson's content as read. The teacher's own blocks under "For me" (🔒), the rest under "For
 * students" (👁) — no labels when there's only one kind, nor on the public link (`shared`: only
 * the students' blocks come there). Texts as paragraphs, checklists with ticks (kept while the
 * page is open), exercises: tap an answer — right in green, wrong in red; older lessons' headings
 * and links too.
 */
@Component({
  selector: 'app-lesson-content',
  imports: [Icon, NgTemplateOutlet, TranslatePipe],
  host: { class: 'flex flex-col gap-5' },
  template: `
    <ng-template #block let-b let-i="i">
      @switch (b.kind) {
        @case ('checklist') {
          <div class="card">
            @for (item of b.items ?? []; track $index; let j = $index) {
              <button type="button" (click)="tick(i, j)" class="list-row w-full text-left">
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
          <div class="card flex flex-col gap-3 px-[var(--row-px)] py-3">
            <p class="text-footnote opacity-50">{{ 'lessons.exercise' | t }}</p>
            <p class="font-medium">{{ b.text }}</p>
            <div class="flex flex-wrap gap-2">
              @for (o of b.options ?? []; track $index; let j = $index) {
                <button
                  type="button"
                  (click)="choose(i, j)"
                  class="chip !rounded-full"
                  [class.!bg-[var(--success)]]="chosen(i) === j && b.answer === j"
                  [class.!bg-[var(--danger)]]="chosen(i) === j && b.answer != null && b.answer !== j"
                  [class.!bg-[var(--accent)]]="chosen(i) === j && b.answer == null"
                  [class.text-white]="chosen(i) === j"
                >{{ o }}</button>
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
      <div class="flex flex-col gap-3">
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
  /** The public link: just the blocks, no "For me / For students". */
  readonly shared = input(false);

  // The teacher's own blocks first, then the students' (each keeps its index in the lesson)
  protected readonly groups = computed(() => {
    const indexed = this.blocks().map((block, i) => ({ block, i }));
    return [
      { key: 'me', blocks: indexed.filter((b) => b.block.private) },
      { key: 'students', blocks: indexed.filter((b) => !b.block.private) },
    ].filter((g) => g.blocks.length);
  });
  protected readonly labelled = computed(() => !this.shared() && this.groups().length > 1);

  // Ticks and chosen answers, while the page is open ("block:item" / block → option)
  private readonly ticks = signal<ReadonlySet<string>>(new Set());
  private readonly answers = signal<ReadonlyMap<number, number>>(new Map());

  protected ticked(block: number, item: number): boolean {
    return this.ticks().has(`${block}:${item}`);
  }

  protected tick(block: number, item: number): void {
    const next = new Set(this.ticks());
    const key = `${block}:${item}`;
    if (next.has(key)) next.delete(key);
    else next.add(key);
    this.ticks.set(next);
  }

  protected chosen(block: number): number | undefined {
    return this.answers().get(block);
  }

  protected choose(block: number, option: number): void {
    this.answers.update((m) => new Map(m).set(block, option));
  }

  protected host(url: string | null): string {
    try {
      return new URL(url ?? '').hostname;
    } catch {
      return url ?? '';
    }
  }
}
