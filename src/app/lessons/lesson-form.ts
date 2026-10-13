import { Component, DestroyRef, ElementRef, afterNextRender, computed, inject, input, model, signal, viewChild } from '@angular/core';
import { DeviceDetectionService } from '../core/services/device-detection.service';
import { FormsModule } from '@angular/forms';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { TranslationKey } from '../core/i18n/translations';
import { Icon, IconName } from '../core/ui/icon/icon';
import { AiChat } from '../ai/ai-chat';
import { AiChatService } from '../ai/ai-chat.service';
import { BrandIcon } from '../core/ui/icon/brand-icon';
import { caretRect } from '../core/ui/caret';
import { PageSheet } from '../core/ui/page-sheet/page-sheet';
import { asOptions, asTask } from './gaps';
import { LessonContent } from './lesson-content';
import { LessonImportsService } from './lesson-imports.service';
import { LessonBlock, LessonBlockKind, LessonInput, imageSrc } from './lesson.service';

/** A link as typed: "example.com/x" → "https://example.com/x"; null when it isn't a web link. */
function normalizeUrl(value: string | null): string | null {
  const v = (value ?? '').trim();
  if (!v) return null;
  try {
    const url = new URL(/^[a-z][a-z\d+.-]*:/i.test(v) ? v : `https://${v}`);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

/** Something typed in a link's address that isn't a web link. */
function badLink(b: LessonBlock): boolean {
  return b.kind === 'link' && !!b.url?.trim() && !normalizeUrl(b.url);
}

/** Ready to save: has a title and no broken link. */
export function lessonValid(l: LessonInput): boolean {
  return !!l.title.trim() && !l.blocks.some(badLink);
}

// Trimmed, the empty ones dropped
function lines(list: string[] | null | undefined): string[] {
  return (list ?? []).map((x) => x.trim()).filter((x) => !!x);
}

/**
 * What gets saved: trimmed, links completed; empty items / answers dropped (the right answer kept
 * on its option); empty blocks dropped (an exercise needs a question and two answers).
 */
export function cleanLesson(l: LessonInput): LessonInput {
  const blocks: LessonBlock[] = [];
  for (const b of l.blocks) {
    const text = b.text?.trim() || null;
    const base = { kind: b.kind, text, url: null, private: !!b.private };
    switch (b.kind) {
      case 'checklist': {
        const items = lines(b.items);
        if (items.length) blocks.push({ ...base, text: null, items });
        break;
      }
      case 'exercise': {
        const raw = b.options ?? [];
        const options = lines(raw);
        const answer =
          b.answer != null && raw[b.answer]?.trim() ? raw.slice(0, b.answer).filter((x) => x.trim()).length : null;
        if (text && options.length >= 2) blocks.push({ ...base, options, answer });
        break;
      }
      case 'image':
        if (b.url) blocks.push({ ...base, url: b.url });
        break;
      case 'link': {
        const url = normalizeUrl(b.url);
        if (url) blocks.push({ ...base, url });
        break;
      }
      case 'gaps': {
        const instruction = b.instruction?.trim() || null;
        if (text || instruction) blocks.push({ ...base, instruction });
        break;
      }
      default:
        if (text) blocks.push(base);
    }
  }
  return { title: l.title.trim(), blocks };
}

/**
 * Editing a lesson in place, Notion-like: the title, then the tasks — each one text (its first
 * line, bold, is its heading; [answers] to write in, {*right|other} to choose); "/" opens the
 * commands (a new task, the assistant), a selection the formatting (B, I, U, make it a gap / a
 * choice). Each task: Preview, who sees it, ?, ×. Older lessons' blocks become tasks when edited;
 * pictures stay. `photos` off: no assistant part (the preview's own editor).
 */
@Component({
  selector: 'app-lesson-form',
  imports: [AiChat, BrandIcon, FormsModule, Icon, LessonContent, PageSheet, TranslatePipe],
  host: { class: 'flex flex-col gap-5' },
  template: `
    @let m = value();
    @if (showTitle()) {
      <!-- The lesson's name: the page's title, plain (no card) -->
      <input #titleInput name="title" [ngModel]="m.title" (ngModelChange)="patch({ title: $event })" type="text" [placeholder]="'lessons.new' | t" autocomplete="off" class="w-full bg-transparent px-1 text-[1.5rem] font-bold leading-tight outline-none placeholder:opacity-35" />
    }

    <!-- The page: text typed right on it, and the tasks; "/" at the start of a line opens the
         commands (a task goes in right there); at the end, a place to type on -->
    <div class="flex flex-col gap-3">
    @for (b of m.blocks; track $index; let i = $index) {
      @if (b.kind === 'text') {
        <!-- Text right on the page (no card): typed where it is; emptied, it goes -->
        <textarea
          #tx
          [attr.data-task]="i"
          [ngModel]="b.text"
          (ngModelChange)="setBlock(i, { text: $event })"
          (input)="sel.set(null); onText(i, tx)"
          (keydown)="onSlashKey($event)"
          (select)="onSelect(i, tx)"
          (mouseup)="onSelect(i, tx)"
          (keyup)="onSelect(i, tx)"
          (blur)="onBlur(); dropIfEmpty(i)"
          rows="1"
          class="text-body w-full resize-none bg-transparent px-1 leading-relaxed outline-none [field-sizing:content]"
        ></textarea>
      } @else {
      <div class="card" [class.!overflow-visible]="desktop && b.kind === 'gaps'">
        <!-- Head: (kind) · Preview · who sees it · ? · × -->
        <div class="list-row !min-h-0 gap-2 pb-1 pt-2.5 after:hidden">
          @if (selectable()) {
            <!-- Picked (for Save as a new lesson / Add to a lesson) -->
            <button type="button" (click)="toggle(i)" class="check shrink-0" [class.is-on]="selected().includes(i)" [attr.aria-label]="'lessons.pick' | t">
              @if (selected().includes(i)) {
                <app-icon name="check" [strokeWidth]="3" class="size-3.5" />
              }
            </button>
          }
          <span class="text-footnote flex flex-1 items-center gap-1.5 font-semibold">
            <!-- (Tasks need no label; pictures keep theirs) -->
            @if (b.kind !== 'gaps') {
              <app-icon [name]="kindIcon(b.kind)" class="size-4 opacity-70" />{{ kindLabel(b.kind) | t }}
            }
          </span>
          @if (b.kind === 'gaps') {
            <!-- What the student sees, in a popup -->
            <button type="button" (click)="previewing.set(i)" [disabled]="!b.text?.trim()" class="text-subhead flex items-center gap-1 rounded-full bg-[var(--fill)] px-3 py-1.5 hover:bg-[var(--highlight)] shrink-0 opacity-70 disabled:opacity-30 disabled:hover:bg-[var(--fill)]">{{ 'lessons.studentSees' | t }}</button>
          }
          <button type="button" (click)="setBlock(i, { private: !b.private })" class="text-subhead flex items-center gap-1 rounded-full bg-[var(--fill)] px-3 py-1.5 hover:bg-[var(--highlight)] shrink-0 opacity-70">
            @if (b.private) {
              <app-icon name="lock" class="size-4" />
            }
            {{ (b.private ? 'lessons.onlyMe' : 'lessons.studentsSee') | t }}
          </button>
          @if (b.kind === 'gaps' && desktop) {
            <!-- ?: how to write a task, in a popup -->
            <span class="relative shrink-0">
              <button type="button" (click)="$event.stopPropagation(); helpOpen.set(helpOpen() === i ? null : i)" [attr.aria-label]="'lessons.howTo' | t" class="text-subhead flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--fill)] hover:bg-[var(--highlight)] font-semibold opacity-70" [class.!opacity-100]="helpOpen() === i">?</button>
              @if (helpOpen() === i) {
                <div (click)="$event.stopPropagation()" class="popover-panel text-footnote absolute right-0 top-full z-30 mt-2 w-80 p-3 leading-relaxed">{{ 'lessons.gapsHint' | t }}</div>
              }
            </span>
          }
          <button type="button" (click)="removeBlock(i)" [attr.aria-label]="'lessons.removeBlock' | t" [class]="b.kind === 'gaps' && desktop ? 'flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--fill)] hover:bg-[var(--highlight)] -mr-1 opacity-70' : 'icon-plain -mr-2'">
            <app-icon name="close" class="size-5" />
          </button>
        </div>

        @switch (b.kind) {
          @case ('checklist') {
            @for (item of b.items ?? []; track $index; let j = $index) {
              <div class="list-row">
                <span class="check"></span>
                <input [ngModel]="item" (ngModelChange)="setItem(i, 'items', j, $event)" type="text" [placeholder]="'lessons.item' | t" autocomplete="off" class="row-input" />
                <button type="button" (click)="removeItem(i, 'items', j)" [attr.aria-label]="'lessons.removeBlock' | t" class="icon-plain -mr-2">
                  <app-icon name="close" class="size-4" />
                </button>
              </div>
            }
            <button type="button" (click)="addItem(i, 'items')" class="list-row add-row">
              <span class="flex items-center gap-2"><app-icon name="plus" class="size-5" />{{ 'lessons.item' | t }}</span>
            </button>
          }
          @case ('exercise') {
            <div class="list-row">
              <input [ngModel]="b.text" (ngModelChange)="setBlock(i, { text: $event })" type="text" [placeholder]="'lessons.question' | t" autocomplete="off" class="row-input font-medium" />
            </div>
            @for (o of b.options ?? []; track $index; let j = $index) {
              <div class="list-row">
                <!-- The circle marks the right answer -->
                <button type="button" (click)="setBlock(i, { answer: b.answer === j ? null : j })" class="check" [class.is-on]="b.answer === j" [attr.aria-label]="'lessons.right' | t">
                  @if (b.answer === j) {
                    <app-icon name="check" [strokeWidth]="3" class="size-3.5" />
                  }
                </button>
                <input [ngModel]="o" (ngModelChange)="setItem(i, 'options', j, $event)" type="text" [placeholder]="'lessons.option' | t" autocomplete="off" class="row-input" />
                <button type="button" (click)="removeItem(i, 'options', j)" [attr.aria-label]="'lessons.removeBlock' | t" class="icon-plain -mr-2">
                  <app-icon name="close" class="size-4" />
                </button>
              </div>
            }
            <button type="button" (click)="addItem(i, 'options')" class="list-row add-row">
              <span class="flex items-center gap-2"><app-icon name="plus" class="size-5" />{{ 'lessons.option' | t }}</span>
            </button>
          }
          @case ('image') {
            <div class="px-4 pb-2 pt-1">
              <img [src]="src(b.url)" alt="" class="max-h-72 w-full rounded-xl bg-white object-contain" />
            </div>
            <div class="list-row">
              <input [ngModel]="b.text" (ngModelChange)="setBlock(i, { text: $event })" type="text" [placeholder]="'lessons.caption' | t" autocomplete="off" class="row-input" />
            </div>
          }
          @case ('link') {
            <div class="list-row">
              <app-icon name="link" class="size-5 opacity-40" />
              <input [ngModel]="b.url" (ngModelChange)="setBlock(i, { url: $event })" type="url" inputmode="url" placeholder="https://…" autocomplete="off" class="row-input" [class.text-[var(--warning)]]="badLink(b)" />
            </div>
            <div class="list-row">
              <input [ngModel]="b.text" (ngModelChange)="setBlock(i, { text: $event })" type="text" [placeholder]="'lessons.linkLabel' | t" autocomplete="off" class="row-input" />
            </div>
          }
          @case ('gaps') {
            <div class="list-row items-start pb-3 pt-1">
              <textarea
                #ta
                [attr.data-task]="i"
                [ngModel]="b.text"
                (ngModelChange)="setBlock(i, { text: $event })"
                (input)="sel.set(null)"
                (select)="onSelect(i, ta)"
                (mouseup)="onSelect(i, ta)"
                (keyup)="onSelect(i, ta)"
                (blur)="onBlur()"
                rows="2"
                [placeholder]="'lessons.gapsPlaceholder' | t"
                class="row-input text-subhead min-h-[3lh] resize-none leading-relaxed [field-sizing:content]"
              ></textarea>
            </div>
          }
          @case ('heading') {
            <div class="list-row">
              <input [ngModel]="b.text" (ngModelChange)="setBlock(i, { text: $event })" type="text" [placeholder]="'lessons.heading' | t" autocomplete="off" class="row-input text-xl font-semibold" />
            </div>
          }
          @default {
            <div class="list-row items-start pb-3 pt-1">
              <textarea [ngModel]="b.text" (ngModelChange)="setBlock(i, { text: $event })" rows="2" [placeholder]="'lessons.text' | t" class="row-input min-h-[3lh] resize-none leading-relaxed [field-sizing:content]"></textarea>
            </div>
          }
        }
      </div>
      }
    }
      @if (m.blocks.at(-1)?.kind !== 'text') {
        <!-- The end of the page: type here (text), or "/" for a command -->
        <textarea
          #end
          rows="1"
          (input)="onEnd(end)"
          (keydown)="onSlashKey($event)"
          (blur)="onBlur()"
          [placeholder]="'lessons.slashHint' | t"
          class="text-body w-full resize-none bg-transparent px-1 leading-relaxed outline-none placeholder:opacity-40 [field-sizing:content]"
        ></textarea>
      }
    </div>

    <!-- "/": the commands at the cursor -->
    @if (slash(); as sl) {
      <div class="popover-panel fixed z-[2100] w-64 p-1" [style.left.px]="sl.x" [style.top.px]="sl.y">
        @for (c of slashItems(); track c.id; let k = $index) {
          <button
            type="button"
            (mousedown)="$event.preventDefault()"
            (click)="runSlash(c.id)"
            class="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left"
            [class.bg-[var(--highlight)]]="k === sl.active"
          >
            @if (c.id === 'assistant') {
              <app-brand-icon name="sparkle" class="size-6 shrink-0" />
            } @else {
              <span class="flex size-6 shrink-0 items-center justify-center rounded-md bg-[var(--fill)]"><app-icon name="plus" class="size-4" /></span>
            }
            <span class="min-w-0 leading-tight">
              <span class="text-subhead block font-medium">{{ c.label | t }}</span>
              <span class="text-footnote block opacity-55">{{ c.hint | t }}</span>
            </span>
          </button>
        } @empty {
          <p class="text-footnote px-2.5 py-2 opacity-50">{{ 'lessons.slashNone' | t }}</p>
        }
      </div>
    }

    <!-- A selection: its formatting -->
    @if (sel(); as se) {
      <div class="popover-panel fixed z-[2100] flex items-center gap-0.5 p-1" [style.left.px]="se.x" [style.top.px]="se.y">
        @for (f of formatsFor(se.block); track f.id) {
          <button
            type="button"
            (mousedown)="$event.preventDefault()"
            (click)="format(f.id)"
            [attr.aria-label]="f.label | t"
            [attr.title]="f.label | t"
            class="flex h-8 min-w-8 items-center justify-center rounded-md px-1.5 text-[0.9375rem] hover:bg-[var(--highlight)]"
            [class.font-bold]="f.id === 'bold'"
            [class.italic]="f.id === 'italic'"
            [class.underline]="f.id === 'underline'"
            [class.font-mono]="f.id === 'gap' || f.id === 'choice'"
            [class.text-[var(--accent)]]="f.id === 'gap' || f.id === 'choice'"
          >{{ f.mark }}</button>
        }
      </div>
    }

    @if (aiOpen()) {
      <app-page-sheet [title]="'nav.ai' | t" [actions]="false" [scroll]="false" [large]="true" (closed)="aiOpen.set(false)">
        <h1 class="mb-3 flex items-center gap-2 px-1 text-xl font-semibold mobile:hidden"><app-brand-icon name="sparkle" class="size-6" />{{ 'nav.ai' | t }}</h1>
        <!-- Loaded the first time it's opened -->
        @defer {
          <app-ai-chat [chatKey]="lessonId() ?? 'new'" [lesson]="m" (add)="appendBlocks($event)" />
        } @loading {
          <p class="text-body py-10 text-center opacity-40">{{ 'app.loading' | t }}</p>
        }
      </app-page-sheet>
    }

    <!-- A task as the student sees it (answers taken out, choices unmarked) -->
    @if (previewing() !== null && m.blocks[previewing()!]; as b) {
      <app-page-sheet [title]="'lessons.studentSees' | t" [actions]="false" [large]="true" (closed)="previewing.set(null)">
        <div class="flex flex-col gap-3">
          <h1 class="px-1 text-xl font-semibold mobile:hidden">{{ 'lessons.studentSees' | t }}</h1>
          <app-lesson-content [blocks]="asStudentSees(b)" mode="student" />
        </div>
      </app-page-sheet>
    }

    @if (photos()) {
      <!-- Photos being read for this lesson; ready ones open the preview -->
      @if (mine().length) {
        <div class="-mt-2 flex flex-wrap justify-center gap-2">
          @for (x of mine(); track x.id) {
            @switch (x.status) {
              @case ('done') {
                <button type="button" (click)="imports.preview(x.id)" class="chip gap-1.5 !rounded-full !bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] font-medium text-[var(--accent)]">
                  <app-icon name="check" [strokeWidth]="2.5" class="size-4" />{{ 'lessons.ready' | t }}
                </button>
              }
              @case ('failed') {
                <button type="button" (click)="imports.preview(x.id)" class="chip gap-1.5 !rounded-full text-[var(--danger)]">
                  <app-icon name="close" class="size-4" />{{ 'lessons.readFailed' | t }}
                </button>
              }
              @default {
                <span class="chip gap-1.5 !rounded-full opacity-70">
                  <span class="size-3.5 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent"></span>{{ 'lessons.reading' | t }}
                </span>
              }
            }
          }
        </div>
      }
      @if (photoError(); as e) {
        <p class="text-footnote -mt-2 text-center text-[var(--danger)]">{{ e | t }}</p>
        @if (photoDetail(); as d) {
          <p class="text-footnote -mt-3 select-text break-words text-center opacity-50">{{ d }}</p>
        }
      }
    }
  `,
})
export class LessonForm {
  readonly value = model.required<LessonInput>();
  /** The lesson being edited (null: a new one) — photos read for it come back here. */
  readonly lessonId = input<string | null>(null);
  /** The photo part (From photo, pasting, what's being read); off in the preview's own editor. */
  readonly photos = input(true);
  /** The name field at the top (off: the page shows it in its own head — the desktop lesson page). */
  readonly showTitle = input(true);
  /** Blocks can be picked (a checkbox each): `selected` — their places. */
  readonly selectable = input(false);
  readonly selected = model<number[]>([]);
  protected readonly aiOpen = signal(false);
  protected readonly desktop = !inject(DeviceDetectionService).isMobile();
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);
  private readonly i18n = inject(I18nService);
  // The task whose "how to write it" is open (desktop's ?)
  protected readonly helpOpen = signal<number | null>(null);

  // Blocks from the AI at the lesson's end (as tasks: heading and body in one text)
  protected appendBlocks(blocks: LessonBlock[]): void {
    this.value.update((m) => ({ ...m, blocks: [...m.blocks.filter((b) => b.kind !== 'gaps' || b.text?.trim()), ...blocks.map(asTask)] }));
  }

  // ---- "/" commands and the selection's formatting

  // The commands, opened by "/" at a line's start: in a text block (`block`; its "/…" from `start`
  // to `end`) or at the page's end (block -1); what's typed after "/" filters them
  protected readonly slash = signal<{ block: number; start: number; end: number; query: string; x: number; y: number; active: number } | null>(null);
  protected readonly sel = signal<{ block: number; x: number; y: number } | null>(null);
  private field: HTMLTextAreaElement | null = null;

  private readonly commands: { id: 'task' | 'assistant'; label: TranslationKey; hint: TranslationKey; words: string }[] = [
    { id: 'task', label: 'lessons.slashTask', hint: 'lessons.slashTaskHint', words: 'task exercise new add zadanie exercice' },
    { id: 'assistant', label: 'nav.ai', hint: 'lessons.slashAssistantHint', words: 'assistant ai asystent ia' },
  ];
  protected readonly slashItems = computed(() => {
    const q = (this.slash()?.query ?? '').toLowerCase();
    return this.commands
      .filter((c) => this.photos() || c.id !== 'assistant')
      .filter((c) => !q || c.words.split(' ').some((w) => w.startsWith(q)) || this.i18n.t(c.label).toLowerCase().startsWith(q));
  });

  protected readonly formats: { id: 'bold' | 'italic' | 'underline' | 'gap' | 'choice'; mark: string; label: TranslationKey }[] = [
    { id: 'bold', mark: 'B', label: 'lessons.fmtBold' },
    { id: 'italic', mark: 'I', label: 'lessons.fmtItalic' },
    { id: 'underline', mark: 'U', label: 'lessons.fmtUnderline' },
    { id: 'gap', mark: '[ ]', label: 'lessons.fmtGap' },
    { id: 'choice', mark: '{ }', label: 'lessons.fmtChoice' },
  ];

  // Text on the page: "/" at the start of a line (and the letters after it) opens the commands
  protected onText(block: number, ta: HTMLTextAreaElement): void {
    this.field = ta;
    const caret = ta.selectionStart;
    const lineStart = ta.value.lastIndexOf('\n', caret - 1) + 1;
    const m = /^\/([\p{L}]*)$/u.exec(ta.value.slice(lineStart, caret));
    if (!m) {
      this.slash.set(null);
      return;
    }
    const r = caretRect(ta, lineStart);
    const was = this.slash();
    this.slash.set({ block, start: lineStart, end: caret, query: m[1], x: r.left, y: r.top + r.height + 2, active: was?.block === block ? was.active : 0 });
  }

  // The page's end: "/…" the commands; other text — text on the page, typed on in it
  protected onEnd(end: HTMLTextAreaElement): void {
    this.field = end;
    const v = end.value;
    if (/^\/[\p{L}]*$/u.test(v)) {
      const r = end.getBoundingClientRect();
      const was = this.slash();
      this.slash.set({ block: -1, start: 0, end: v.length, query: v.slice(1), x: r.left, y: r.bottom + 2, active: was?.block === -1 ? was.active : 0 });
      return;
    }
    this.slash.set(null);
    if (!v) return;
    end.value = '';
    this.insertBlock(this.value().blocks.length, 'text', v);
  }

  protected onSlashKey(e: KeyboardEvent): void {
    const sl = this.slash();
    if (!sl) return;
    const n = this.slashItems().length;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (n) this.slash.set({ ...sl, active: (sl.active + (e.key === 'ArrowDown' ? 1 : n - 1)) % n });
    } else if (e.key === 'Enter') {
      const c = this.slashItems()[sl.active];
      if (!c) return;
      e.preventDefault();
      this.runSlash(c.id);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      this.slash.set(null);
    }
  }

  // A command: its "/…" taken out; a task goes right there (the text around it split: above it,
  // under it), or the assistant opens
  protected runSlash(id: 'task' | 'assistant'): void {
    const sl = this.slash();
    this.slash.set(null);
    if (!sl) return;
    if (sl.block < 0) {
      if (this.field) this.field.value = '';
      if (id === 'assistant') this.aiOpen.set(true);
      else this.insertBlock(this.value().blocks.length, 'gaps', '');
      return;
    }
    const text = this.value().blocks[sl.block]?.text ?? '';
    const before = text.slice(0, sl.start).replace(/\n$/, '');
    const after = text.slice(sl.end).replace(/^\n/, '');
    if (id === 'assistant') {
      this.setBlock(sl.block, { text: before + (before && after ? '\n' : '') + after });
      this.aiOpen.set(true);
      return;
    }
    const piece = (t: string): LessonBlock => ({ kind: 'text', text: t, url: null, private: false, instruction: null });
    const task: LessonBlock = { kind: 'gaps', text: '', url: null, private: false, instruction: null };
    const replaced = [...(before ? [piece(before)] : []), task, ...(after ? [piece(after)] : [])];
    this.value.update((m) => ({ ...m, blocks: [...m.blocks.slice(0, sl.block), ...replaced, ...m.blocks.slice(sl.block + 1)] }));
    this.focusTask(sl.block + (before ? 1 : 0), 0);
  }

  // A new block at `at` (a task, or text on the page), its text `text`, the cursor at its end
  private insertBlock(at: number, kind: 'gaps' | 'text', text: string): void {
    const block: LessonBlock = { kind, text, url: null, private: false, instruction: null };
    this.value.update((m) => ({ ...m, blocks: [...m.blocks.slice(0, at), block, ...m.blocks.slice(at)] }));
    this.focusTask(at, text.length);
  }

  // Text on the page left empty: gone
  protected dropIfEmpty(i: number): void {
    setTimeout(() => {
      const b = this.value().blocks[i];
      if (b?.kind === 'text' && !b.text?.trim() && document.activeElement?.getAttribute('data-task') !== String(i)) this.removeBlock(i);
    }, 150);
  }

  protected formatsFor(block: number) {
    return this.value().blocks[block]?.kind === 'gaps' ? this.formats : this.formats.filter((f) => f.id !== 'gap' && f.id !== 'choice');
  }

  // A selection in a task: the formatting toolbar over it
  protected onSelect(block: number, ta: HTMLTextAreaElement): void {
    this.field = ta;
    requestAnimationFrame(() => {
      if (document.activeElement !== ta || ta.selectionStart === ta.selectionEnd) {
        this.sel.set(null);
        return;
      }
      const r = caretRect(ta, ta.selectionStart);
      this.sel.set({ block, x: r.left, y: Math.max(4, r.top - 44) });
    });
  }

  protected onBlur(): void {
    setTimeout(() => {
      this.slash.set(null);
      this.sel.set(null);
    }, 120);
  }

  // B / I / U: **…**, *…*, __…__; a gap: […] (the selection its answer); a choice: {*…|} (the
  // selection the right one, the cursor where the others go)
  protected format(kind: 'bold' | 'italic' | 'underline' | 'gap' | 'choice'): void {
    const ta = this.field;
    const se = this.sel();
    if (!ta || !se) return;
    const [a, b] = [ta.selectionStart, ta.selectionEnd];
    const picked = ta.value.slice(a, b);
    // A choice from several options selected ("a) va b) vas", "va / vas"): all of them, the first
    // the right one; one: it's the right one, the cursor where the others go
    const options = kind === 'choice' ? asOptions(picked).map((o) => o.replace(/[|{}]/g, ' ')) : [];
    const inserted =
      kind === 'choice'
        ? options.length > 1
          ? `{*${options.join('|')}}`
          : `{*${options[0] ?? picked}|}`
        : (({ bold: ['**', '**'], italic: ['*', '*'], underline: ['__', '__'], gap: ['[', ']'] }) as Record<string, string[]>)[kind].join(picked);
    const text = ta.value.slice(0, a) + inserted + ta.value.slice(b);
    this.setBlock(se.block, { text });
    this.sel.set(null);
    ta.value = text;
    ta.focus();
    if (kind === 'choice') {
      const at = options.length > 1 ? a + inserted.length : a + inserted.length - 1;
      ta.setSelectionRange(at, at);
    } else {
      const open = kind === 'bold' || kind === 'underline' ? 2 : 1;
      ta.setSelectionRange(a + open, a + open + picked.length);
    }
  }

  // A task's field focused, the cursor at `caret`
  private focusTask(index: number, caret: number): void {
    setTimeout(() => {
      const ta = this.host.nativeElement.querySelector<HTMLTextAreaElement>(`textarea[data-task="${index}"]`);
      if (!ta) return;
      ta.focus();
      ta.setSelectionRange(caret, caret);
    });
  }

  // The task shown as the student sees it (its place), in a popup
  protected readonly previewing = signal<number | null>(null);

  protected toggle(i: number): void {
    this.selected.update((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i].sort((a, b) => a - b)));
  }

  // Editing starts in the title (desktop; on phones the keyboard would cover the form).
  private readonly titleInput = viewChild<ElementRef<HTMLInputElement>>('titleInput');
  constructor() {
    const desktop = this.desktop;
    afterNextRender(() => {
      if (desktop) this.titleInput()?.nativeElement.focus({ preventScroll: true });
    });
    this.imports.ensureLoaded();

    // The preview's "Add" lands here when it's this lesson
    const release = this.imports.take((lessonId, title, blocks) => {
      if (!this.photos() || lessonId !== this.lessonId()) return false;
      this.value.update((m) => ({ title: m.title.trim() ? m.title : title, blocks: [...m.blocks, ...blocks] }));
      return true;
    });
    const closeHelp = () => this.helpOpen.set(null);
    document.addEventListener('click', closeHelp);
    const chats = inject(AiChatService);
    inject(DestroyRef).onDestroy(() => {
      release();
      document.removeEventListener('click', closeHelp);
      if (this.photos()) chats.clear(this.lessonId() ?? 'new');
    });
  }

  protected readonly badLink = badLink;
  protected src(id: string | null): string {
    return imageSrc(id);
  }

  protected readonly imports = inject(LessonImportsService);
  protected readonly sending = signal(false);
  protected readonly photoError = signal<TranslationKey | null>(null);
  protected readonly photoDetail = signal<string | null>(null);
  // This lesson's photos being read / ready (a new lesson: those for a new one)
  protected readonly mine = computed(() => this.imports.imports().filter((x) => x.lessonId === this.lessonId()));

  // "gemini-3.5-flash-lite" → "Gemini 3.5 Flash Lite"
  protected modelName(id: string): string {
    return id.replace(/-/g, ' ').replace(/\b[a-z]/g, (c) => c.toUpperCase());
  }

  protected fromPhotos(input: HTMLInputElement): void {
    const files = [...(input.files ?? [])];
    input.value = ''; // the same photo again later still fires (change)
    this.send(files);
  }

  // Up to 5 pages to the queue: the answer comes at once, the reading in the background
  private async send(files: Blob[]): Promise<void> {
    if (!files.length || this.sending()) return;
    this.sending.set(true);
    this.photoError.set(null);
    this.photoDetail.set(null);
    try {
      await this.imports.start(files, this.lessonId());
    } catch (e) {
      const status = (e as { status?: number }).status;
      this.photoError.set(status === 503 ? 'lessons.photoOff' : 'lessons.photoFailed');
      this.photoDetail.set(status === 503 ? null : `${status ?? ''} ${(e as Error).message ?? e}`.trim().slice(0, 300));
    } finally {
      this.sending.set(false);
    }
  }

  // Block kinds to add (headings and links only in older lessons)
  protected readonly kinds: { kind: LessonBlockKind; icon: IconName; label: TranslationKey }[] = [
    { kind: 'text', icon: 'text', label: 'lessons.text' },
    { kind: 'exercise', icon: 'exercise', label: 'lessons.exercise' },
    { kind: 'gaps', icon: 'compose', label: 'lessons.gaps' },
    { kind: 'checklist', icon: 'checklist', label: 'lessons.checklist' },
  ];
  private static readonly ALL: Record<LessonBlockKind, { icon: IconName; label: TranslationKey }> = {
    text: { icon: 'text', label: 'lessons.text' },
    exercise: { icon: 'exercise', label: 'lessons.exercise' },
    gaps: { icon: 'compose', label: 'lessons.gaps' },
    image: { icon: 'image', label: 'lessons.image' },
    checklist: { icon: 'checklist', label: 'lessons.checklist' },
    heading: { icon: 'heading', label: 'lessons.heading' },
    link: { icon: 'link', label: 'lessons.link' },
  };
  protected kindIcon(kind: LessonBlockKind): IconName {
    return LessonForm.ALL[kind]?.icon ?? 'text';
  }
  protected kindLabel(kind: LessonBlockKind): TranslationKey {
    return LessonForm.ALL[kind]?.label ?? 'lessons.text';
  }

  protected patch(p: Partial<LessonInput>): void {
    this.value.update((m) => ({ ...m, ...p }));
  }

  protected setBlock(index: number, p: Partial<LessonBlock>): void {
    this.value.update((m) => ({ ...m, blocks: m.blocks.map((b, i) => (i === index ? { ...b, ...p } : b)) }));
  }

  // A checklist's items / an exercise's answers
  protected setItem(index: number, list: 'items' | 'options', at: number, text: string): void {
    const b = this.value().blocks[index];
    this.setBlock(index, { [list]: (b[list] ?? []).map((x, j) => (j === at ? text : x)) });
  }

  protected addItem(index: number, list: 'items' | 'options'): void {
    const b = this.value().blocks[index];
    this.setBlock(index, { [list]: [...(b[list] ?? []), ''] });
  }

  protected removeItem(index: number, list: 'items' | 'options', at: number): void {
    const b = this.value().blocks[index];
    const p: Partial<LessonBlock> = { [list]: (b[list] ?? []).filter((_, j) => j !== at) };
    // The right answer stays on its option
    if (list === 'options' && b.answer != null) p.answer = b.answer === at ? null : b.answer > at ? b.answer - 1 : b.answer;
    this.setBlock(index, p);
  }

  // A new block at the end: a checklist is the teacher's plan by default; an exercise starts with
  // two empty answers, a checklist with one item.
  protected add(kind: LessonBlockKind): void {
    const block: LessonBlock = {
      kind,
      text: null,
      url: null,
      private: kind === 'checklist',
      items: kind === 'checklist' ? [''] : null,
      options: kind === 'exercise' ? ['', ''] : null,
      answer: null,
    };
    this.value.update((m) => ({ ...m, blocks: [...m.blocks, block] }));
  }

  // A text → a task: "...", "…", "___", "---", "– – –" become gaps to write in ([] — no set answer; fill them in)
  // (a text block of an older lesson)
  protected toTask(index: number): void {
    const text = (this.value().blocks[index].text ?? '').replace(/_{2,}|\.{3,}|…+|-{3,}|[–—](?: ?[–—]){2,}/g, '[]');
    this.setBlock(index, { kind: 'gaps', text });
  }

  // The text block above a task, into it (first) — the instruction with its task, one block
  protected joinAbove(index: number): void {
    this.value.update((m) => {
      const above = m.blocks[index - 1];
      const task = m.blocks[index];
      const text = [above.text?.trim(), task.text ?? ''].filter((x) => x !== undefined && x !== '').join('\n');
      const blocks = m.blocks.filter((_, j) => j !== index - 1).map((b, j) => (j === index - 1 ? { ...task, text } : b));
      return { ...m, blocks };
    });
  }

  // A task as students get it: the write-in answers taken out, the choices unstarred (the same
  // object for the same text — the preview isn't redrawn on every check)
  private readonly seen = new Map<string, LessonBlock[]>();
  protected asStudentSees(b: LessonBlock): LessonBlock[] {
    const key = JSON.stringify([b.instruction ?? '', b.text ?? '']);
    let shown = this.seen.get(key);
    if (!shown) {
      if (this.seen.size > 50) this.seen.clear();
      this.seen.set(key, (shown = [this.blank(b)]));
    }
    return shown;
  }

  private blank(b: LessonBlock): LessonBlock {
    const text = (b.text ?? '')
      .replace(/\[[^[\]\n]*\]/g, '[]')
      .replace(/\{([^{}\n]*)\}/g, (_, inside: string) => `{${inside.replace(/(^|\|)\s*\*/g, '$1')}}`);
    return { ...b, text, private: false };
  }

  protected removeBlock(index: number): void {
    this.value.update((m) => ({ ...m, blocks: m.blocks.filter((_, i) => i !== index) }));
    if (this.selectable()) this.selected.update((s) => s.filter((x) => x !== index).map((x) => (x > index ? x - 1 : x)));
  }
}
