import { ChangeDetectorRef, Component, DestroyRef, ElementRef, afterNextRender, computed, effect, inject, input, model, signal, untracked, viewChild } from '@angular/core';
import { DeviceDetectionService } from '../core/services/device-detection.service';
import { FormsModule } from '@angular/forms';
import { ConfirmDelete } from '../core/ui/confirm';
import { Tip } from '../core/ui/tip';
import { LessonClipboard } from './lesson-clipboard';
import { Sheet } from '../core/ui/sheet/sheet';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { TranslationKey } from '../core/i18n/translations';
import { Icon, IconName } from '../core/ui/icon/icon';
import { AiChat } from '../ai/ai-chat';
import { AiChatService } from '../ai/ai-chat.service';
import { BrandIcon } from '../core/ui/icon/brand-icon';
import { caretRect } from '../core/ui/caret';
import { PageSheet } from '../core/ui/page-sheet/page-sheet';
import { ToBody } from '../core/ui/to-body';
import { Mark, asOptions, asTask, forStudents, marked, marksAt, tidy, unmark } from './gaps';
import { LessonContent } from './lesson-content';
import { LessonImportsService } from './lesson-imports.service';
import { LessonBlock, LessonBlockKind, LessonInput, imageSrc } from './lesson.service';
import { badLink } from './lesson-input';

type FormatId = 'bold' | 'italic' | 'underline' | 'strike' | 'gap' | 'choice' | 'link';

/**
 * Editing a lesson in place, Notion-like: the title, then the tasks — each one text (its first
 * line, bold, is its heading; [answers] to write in, {*right|other} to choose); "/" opens the
 * commands (a new task, the assistant), a selection the formatting (B, I, U, make it a gap / a
 * choice). Each task: Preview, who sees it, ?, ×. Older lessons' blocks become tasks when edited;
 * pictures stay. `photos` off: no assistant part (the preview's own editor).
 */
@Component({
  selector: 'app-lesson-form',
  imports: [AiChat, BrandIcon, ConfirmDelete, FormsModule, Sheet, Tip, Icon, LessonContent, PageSheet, ToBody, TranslatePipe],
  host: { class: 'flex flex-col gap-3', '(document:keydown)': 'typeOnPage($event)', '(document:dragover)': 'autoScroll($event)', '(document:paste)': 'pasteOnPage($event)', '(document:mousedown)': 'clickOnPage($event)' },
  template: `
    @let m = value();
    @if (showTitle()) {
      <!-- The lesson's name: the page's title, plain (no card) -->
      <input #titleInput name="title" [ngModel]="m.title" (ngModelChange)="patch({ title: $event })" type="text" [placeholder]="'lessons.new' | t" autocomplete="off" class="w-full bg-transparent px-1 text-[1.5rem] font-bold leading-tight outline-none placeholder:opacity-35" />
    }

    <!-- The page: text typed right on it, and the tasks; "/" at the start of a line opens the
         commands (a task goes in right there); at the end, a place to type on -->
    <!-- (tasks are moved by their ⠿, as in Notion: nothing moves meanwhile, a line shows where it'd go) -->
    <div #list data-tasks class="relative flex flex-col gap-2" [class.pl-5]="desktop && !selectable()" (dragover)="dragOver($event, list)" (drop)="drop($event)" (mousedown)="placeCaret($event, list)">
    @if (dropLine(); as y) {
      <div aria-hidden="true" class="drop-line pointer-events-none absolute right-0 z-20" [class.left-5]="desktop && !selectable()" [class.left-0]="!desktop || selectable()" [style.top.px]="y"></div>
    }
    @for (b of m.blocks; track $index; let i = $index) {
      @if (caret()?.at === i) {
        <!-- The caret between tasks: they part for a line — a plain field with its hint; what's typed
             becomes a task there, "/" the commands, Ctrl+V pastes -->
        <div data-caret class="flex h-7 items-center [animation:fadeIn_120ms_ease-out]">
          <input
            data-caret-input
            type="text"
            autocomplete="off"
            [placeholder]="'lessons.caretHint' | t"
            (input)="caretTyped($event)"
            (keydown)="caretKey($event)"
            (click)="slash() || openAdd()"
            (blur)="caretBlur()"
            class="h-7 w-full bg-transparent text-[0.9375rem] outline-none placeholder:opacity-45"
          />
        </div>
      }
      @if (b.kind === 'text') {
        <!-- Text right on the page (no card): typed where it is; emptied, it goes; its links and
             style marks highlighted under it -->
        <div class="relative" data-block>
        <div aria-hidden="true" class="text-body pointer-events-none absolute inset-0 whitespace-pre-wrap break-words px-1 leading-relaxed">@for (k of marks(b.text); track $index) {<span [class.mark-gap]="k.kind === 'gap'" [class.mark-choice]="k.kind === 'choice'" [class.mark-link]="k.kind === 'link'" [class.mark-syntax]="k.kind === 'syntax'">{{ k.t }}</span>}</div>
        <textarea
          #tx
          [attr.data-task]="i"
          [ngModel]="b.text"
          (ngModelChange)="setBlock(i, { text: $event })"
          (input)="sel.set(null)"
          (keydown)="onSlashKey($event)"
          (select)="onSelect(i, tx)"
          (mouseup)="onSelect(i, tx)"
          (keyup)="onSelect(i, tx)"
          (focus)="field = tx"
          (click)="openFocus(i, tx)"
          [readOnly]="!desktop || locked()"
          (blur)="onBlur(); dropIfEmpty(i)"
          rows="1"
          class="text-body relative w-full resize-none bg-transparent px-1 leading-relaxed text-transparent caret-[var(--text)] outline-none [field-sizing:content]"
        ></textarea>
        </div>
      } @else {
      @let slim = desktop && b.kind === 'gaps' && !selectable();
      <div
        class="card group relative"
        [class.task-card]="slim"
        [class.!overflow-visible]="desktop && b.kind === 'gaps'"
        data-block
        #card
      >
        @if (slim && !locked()) {
          <!-- Desktop tasks: no head row — ⠿ and ▾ outside it at the right (▾: Preview, who sees it, Delete; a lock instead for "only me"), shown on hover (or while
               it's being typed in): ↗ as the student sees it (in a window), who sees it, ×;
               "only me" always shows -->
          <!-- At its left, outside it (as in Notion): ⠿ — drag to move it, click for its menu (Preview,
               who sees it, Delete). Shown on hover; "only me": a lock under it, always. -->
          <div class="task-tools absolute -left-6 top-0 z-10 flex flex-col items-center gap-1">
            <button type="button" draggable="true" (dragstart)="dragStart($event, i)" (dragend)="dragEnd()" #more (click)="taskMenu.set(taskMenu()?.index === i ? null : { index: i, from: more })" [appTip]="'lessons.moveOrMenu' | t" tipSide="left" [attr.aria-label]="'lessons.moveOrMenu' | t" [attr.aria-expanded]="taskMenu()?.index === i" class="drag-handle flex h-6 w-5 cursor-grab items-center justify-center rounded transition-opacity hover:bg-[var(--highlight)] active:cursor-grabbing" [class]="taskMenu()?.index === i ? 'opacity-100 bg-[var(--highlight)]' : 'opacity-0 group-hover:opacity-50 group-focus-within:opacity-50 hover:!opacity-100'">
              <app-icon name="grip" class="size-[1.125rem]" />
            </button>
          </div>
        } @else {
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
          <button type="button" #rm (click)="askRemove(i, rm)" [attr.aria-label]="'lessons.removeBlock' | t" [class]="b.kind === 'gaps' && desktop ? 'flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--fill)] hover:bg-[var(--highlight)] -mr-1 opacity-70' : 'icon-plain -mr-2'">
            <app-icon name="close" class="size-5" />
          </button>
        </div>
        }

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
            <div class="list-row items-start" [class.pb-3]="!slim" [class.pt-1]="!slim" [class.py-[4px]]="slim" [class.!px-[8px]]="slim">
              <div class="relative min-w-0 flex-1" [class.only-me]="b.private">
              <!-- Only me: a gray lock before its first letter (its first line set in for it) -->
              @if (b.private) {
                <span [appTip]="'lessons.onlyMe' | t" tipSide="top" class="absolute left-0 top-[0.15em] z-10 flex size-[1.125rem] items-center justify-center opacity-45">
                  <app-icon name="lock" class="size-4" />
                </span>
              }
              <!-- Under the field: the same text, its [gaps] and {choices} highlighted (only
                   backgrounds — nothing that would move the text) -->
              <div aria-hidden="true" class="text-[0.9375rem] pointer-events-none absolute inset-0 whitespace-pre-wrap break-words leading-relaxed">@for (k of marks(b.text); track $index) {<span [class.mark-gap]="k.kind === 'gap'" [class.mark-choice]="k.kind === 'choice'" [class.mark-link]="k.kind === 'link'" [class.mark-syntax]="k.kind === 'syntax'">{{ k.t }}</span>}</div>
              <textarea
                #ta
                [attr.data-task]="i"
                [ngModel]="b.text"
                (ngModelChange)="setBlock(i, { text: $event })"
                (input)="sel.set(null)"
                (select)="onSelect(i, ta)"
                (mouseup)="onSelect(i, ta)"
                (keyup)="onSelect(i, ta)"
                (focus)="field = ta"
                (click)="openFocus(i, ta)"
                [readOnly]="!desktop || locked()"
                (blur)="onBlur()"
                rows="2"
                [placeholder]="'lessons.gapsPlaceholder' | t"
                class="row-input relative min-h-[3lh] !text-[0.9375rem] resize-none leading-relaxed text-transparent caret-[var(--text)] [field-sizing:content] placeholder:text-[var(--text)]"
              ></textarea>
              </div>
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
      <!-- (always there, under the last task: the end's line) -->
      @if (desktop && !locked() && photos()) {
        <!-- The caret between tasks: they part for a line — a plain field with its hint; what's typed
             becomes a task there, "/" the commands, Ctrl+V pastes -->
        <div data-caret class="flex h-7 items-center [animation:fadeIn_120ms_ease-out]">
          <input
            data-caret-input
            type="text"
            autocomplete="off"
            [placeholder]="'lessons.caretHint' | t"
            (input)="caretTyped($event)"
            (keydown)="caretKey($event)"
            (click)="slash() || caretAtEnd(true)"
            (blur)="caretBlur()"
            class="h-7 w-full bg-transparent text-[0.9375rem] outline-none placeholder:opacity-45"
          />
        </div>
      }
      @if (desktop && !locked()) {
        <!-- Under the tasks: a click there puts the caret at the end (an empty lesson has it from the start) -->
        <div aria-hidden="true" class="-mt-3 min-h-16 cursor-text" (mousedown)="$event.preventDefault(); caretAtEnd(true)"></div>
      }
      <!-- The end of the page: a new task; the assistant (unless the page has them in its head) -->
      @if (endButtons()) {
      <div class="flex items-center gap-2">
        <button type="button" (click)="insertBlock(m.blocks.length, 'gaps', '')" class="btn-secondary gap-1.5 pl-2.5">
          <app-icon name="plus" [strokeWidth]="2" class="size-[1.125rem]" />{{ 'lessons.slashTask' | t }}
        </button>
        @if (photos()) {
          <button type="button" (click)="aiOpen.set(true)" class="btn-secondary gap-1.5 pl-2.5">
            <app-brand-icon name="sparkle" class="size-[1.125rem]" />{{ 'nav.ai' | t }}
          </button>
        }
      </div>
      }
    </div>

    <!-- "/": the commands at the cursor -->
    @if (slash(); as sl) {
      <!-- (in the menus' style: a plain list, an icon and a label a row) -->
      <div appToBody data-commands class="dialog-panel fixed z-[2100] w-max !rounded-[0.625rem] p-1 [animation:dropdownIn_160ms_var(--ease-out-quick)]" [style.left.px]="sl.x" [style.top.px]="sl.y">
        <div class="menu-list">
          @for (c of slashItems(); track c.id; let k = $index) {
            <button type="button" (mousedown)="$event.preventDefault()" (click)="runSlash(c.id)" (mouseenter)="slash.set({ ...sl, active: k })" [disabled]="c.id === 'paste' && !clipboard.blocks()?.length" class="menu-item no-hover" [class.!bg-[var(--tint)]]="k === sl.active">
              @if (c.id === 'assistant') {
                <app-brand-icon name="sparkle" class="menu-icon !opacity-100" />
              } @else if (c.id === 'paste') {
                <app-icon name="paste" />
              } @else {
                <app-icon name="plus" />
              }
              <span class="flex-1">{{ c.label | t }}</span>
              <span class="text-footnote pl-3 opacity-45">{{ c.hint | t }}</span>
            </button>
          } @empty {
            <p class="menu-foot">{{ 'lessons.slashNone' | t }}</p>
          }
        </div>
      </div>
    }

    <!-- A selection: its menu beside it — B I U in a row, then Fill in, Choice,
         Link a row each; Link asks for the address -->
    @if (desktop && sel(); as se) {
      <!-- (in the menus' style: B I U S in a row, then a row each with its icon; what's on: gray, ✓) -->
      <div appToBody class="dialog-panel fixed z-[2100] flex w-max min-w-44 flex-col !rounded-[10px] p-1 [animation:dropdownIn_160ms_var(--ease-out-quick)]" [style.left.px]="se.x" [style.top.px]="se.y" (mousedown)="keepFocus($event)">
        @if (linking()) {
          <form (submit)="applyLink(); $event.preventDefault()" class="flex w-64 items-center gap-1">
            <input #linkField type="url" inputmode="url" [(ngModel)]="linkUrl" name="url" placeholder="https://…" autocomplete="off" (keydown.enter)="applyLink(); $event.preventDefault()" (keydown.escape)="sel.set(null); field?.focus()" (blur)="onLinkBlur()" class="h-8 min-w-0 flex-1 rounded-md bg-[var(--fill)] px-2 text-[0.9375rem] outline-none placeholder:opacity-45" />
            <button type="submit" [appTip]="'action.done' | t" tipSide="bottom" [attr.aria-label]="'action.done' | t" class="head-btn !px-1.5"><app-icon name="enter" /></button>
          </form>
        } @else {
          <div class="flex items-center gap-0.5">
            @for (f of styleFormats; track f.id) {
              <button
                type="button"
                (click)="pickFormat(f.id)"
                [attr.aria-label]="f.label | t"
                [appTip]="f.label | t"
                tipSide="top"
                class="flex h-8 flex-1 items-center justify-center rounded-md text-[0.9375rem] hover:bg-[var(--highlight)]"
                [class.!bg-[var(--highlight)]]="se.on?.includes(f.id)"
                [class.font-bold]="f.id === 'bold'"
                [class.italic]="f.id === 'italic'"
                [class.underline]="f.id === 'underline'"
                [class.line-through]="f.id === 'strike'"
              >{{ f.mark }}</button>
            }
          </div>
          <div class="menu-sep !mx-0"></div>
          <div class="menu-list">
            @for (f of itemFormats(se.block); track f.id) {
              <button type="button" (click)="pickFormat(f.id)" class="menu-item">
                <app-icon [name]="f.id === 'gap' ? 'text' : f.id === 'choice' ? 'checklist' : 'link'" />
                <span class="flex-1">{{ f.text! | t }}</span>
                @if (se.on?.includes(f.id)) {
                  <app-icon name="check" class="size-4 text-[var(--accent)]" />
                }
              </button>
            }
          </div>
        }
      </div>
    }

    @if (!desktop) {
      <!-- (always there, hidden: a tap focuses its field at once — iOS opens the keyboard only
           then; moving a focused field would drop the focus) -->
      <div appToBody [class.hidden]="!kbBar()">
      @if (kbBar(); as kb) {
      @let fb = m.blocks[kb.block];
      @if (fb) {
      <!-- Phones: a tap in a task / text opens it alone, the whole screen above the keyboard —
           our buttons on top (B I U, Fill in, Choice, Link; ✓ closes), the field under them;
           leaving the field closes it too -->
      <div
        class="fixed inset-x-0 z-[2050] flex flex-col bg-[var(--app-bg)]"
        [style.top.px]="kbOffset()"
        [style.height.px]="kbHeight()"
      >
        <div class="flex shrink-0 items-center gap-1 px-2 pb-2 pt-[calc(env(safe-area-inset-top)+0.5rem)]" (pointerdown)="keepFocus($event)" (mousedown)="keepFocus($event)">
          @if (linking()) {
            <form (submit)="applyLink(); $event.preventDefault()" class="flex min-w-0 flex-1 items-center gap-1">
              <input #linkField type="url" inputmode="url" [(ngModel)]="linkUrl" name="url" placeholder="https://…" autocomplete="off" class="text-body h-10 min-w-0 flex-1 rounded-full bg-[var(--fill)] px-3.5 outline-none" />
              <button type="submit" class="btn-primary !h-10 !px-4 !py-0">OK</button>
            </form>
          } @else {
            <div class="glass-neutral flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto rounded-full px-1.5 py-1">
              @for (f of formatsFor(kb.block); track f.id) {
                <button
                  type="button"
                  (click)="mobileFormat(f.id)"
                  [attr.aria-label]="f.label | t"
                  class="flex h-9 min-w-9 shrink-0 items-center justify-center rounded-full px-2.5 text-[1rem] active:bg-[var(--highlight)]"
                  [class.font-bold]="f.id === 'bold'"
                  [class.italic]="f.id === 'italic'"
                  [class.underline]="f.id === 'underline'"
                [class.line-through]="f.id === 'strike'"
                  [class.text-[var(--accent)]]="f.id === 'gap' || f.id === 'choice' || f.id === 'link'"
                >{{ f.text ? (f.text | t) : f.mark }}</button>
              }
            </div>
            <button type="button" (click)="closeFocus()" [attr.aria-label]="'action.done' | t" class="btn-confirm shrink-0">
              <app-icon name="check" [strokeWidth]="2" class="size-7" />
            </button>
          }
        </div>
        <div class="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
          <div class="relative" [class.card]="fb.kind === 'gaps'" [class.px-4]="fb.kind === 'gaps'" [class.py-3]="fb.kind === 'gaps'">
            <div class="relative">
              @if (true) {
                <div aria-hidden="true" class="text-body pointer-events-none absolute inset-0 whitespace-pre-wrap break-words leading-relaxed">@for (k of marks(fb.text); track $index) {<span [class.mark-gap]="k.kind === 'gap'" [class.mark-choice]="k.kind === 'choice'" [class.mark-link]="k.kind === 'link'" [class.mark-syntax]="k.kind === 'syntax'">{{ k.t }}</span>}</div>
              }
              <textarea
                #ft
                data-focus
                [ngModel]="fb.text"
                (ngModelChange)="setBlock(kb.block, { text: $event })"
                (focus)="field = ft"
                (input)="sel.set(null); fb.kind === 'text' ? onText(kb.block, ft) : null"
                (keydown)="onSlashKey($event)"
                (blur)="onFocusBlur()"
                rows="3"
                [placeholder]="(fb.kind === 'gaps' ? 'lessons.gapsPlaceholder' : 'lessons.slashHint') | t"
                class="text-body relative w-full resize-none bg-transparent leading-relaxed outline-none [field-sizing:content] placeholder:opacity-40"
                [class.text-transparent]="true"
                [class.caret-[var(--text)]]="true"
                [class.placeholder:text-[var(--text)]]="true"
              ></textarea>
            </div>
          </div>
        </div>
      </div>
      }
      }
      </div>
    }

    @if (aiOpen()) {
      <app-page-sheet [title]="'nav.ai' | t" [actions]="false" [scroll]="false" [large]="true" (closed)="aiOpen.set(false)">
        <h1 class="mb-2 flex items-center gap-2 px-1 text-[1rem] font-medium mobile:hidden"><app-brand-icon name="sparkle" class="size-5" />{{ 'nav.ai' | t }}</h1>
        <!-- Loaded the first time it's opened -->
        @defer {
          <app-ai-chat [chatKey]="lessonId() ?? 'new'" [lesson]="m" (add)="appendBlocks($event)" />
        } @loading {
          <p class="text-body py-10 text-center opacity-40">{{ 'app.loading' | t }}</p>
        }
      </app-page-sheet>
    }

    <!-- A task's menu (a click on its ⠿): Preview, who sees it, Delete -->
    @if (taskMenu(); as tm) {
      @let tb = m.blocks[tm.index];
      @if (tb) {
        <app-sheet [origin]="tm.from" [fit]="true" (closed)="taskMenu.set(null)">
          <div class="menu-list">
            <button type="button" (click)="taskMenu.set(null); previewing.set(tm.index)" [disabled]="!tb.text?.trim()" class="menu-item">
              <app-icon name="popout" />
              <span class="flex-1">{{ 'lessons.studentSees' | t }}</span>
            </button>
            <button type="button" (click)="setBlock(tm.index, { private: !tb.private })" class="menu-item">
              <app-icon name="lock" />
              <span class="flex-1">{{ 'lessons.onlyMe' | t }}</span>
              @if (tb.private) {
                <app-icon name="check" class="size-4 text-[var(--accent)]" />
              }
            </button>
            <button type="button" (click)="copyTask(tm.index)" [disabled]="!tb.text?.trim()" class="menu-item">
              <app-icon name="copy" />
              <span class="flex-1">{{ 'action.copy' | t }}</span>
            </button>
            <button type="button" (click)="formatTask(tm.index)" [disabled]="!tb.text?.trim()" class="menu-item">
              <app-icon name="wand" />
              <span class="flex-1">{{ 'lessons.format' | t }}</span>
            </button>
            <div class="menu-sep"></div>
            <button type="button" (click)="removeFromMenu(tm.index, tm.from)" class="menu-item is-danger">
              <app-icon name="trash" />
              <span class="flex-1">{{ 'lessons.removeBlock' | t }}</span>
            </button>
          </div>
        </app-sheet>
      }
    }

    <!-- × on a task with something in it: asked first -->
    @if (removing(); as r) {
      <app-confirm-delete [origin]="r.from" (confirmed)="removeBlock(r.index)" (closed)="removing.set(null)" />
    }

    <!-- A task as the student sees it (answers taken out, choices unmarked) -->
    @if (previewing() !== null && m.blocks[previewing()!]; as b) {
      <app-page-sheet [title]="'lessons.studentSees' | t" [actions]="false" [fit]="true" (closed)="previewing.set(null)">
        <div class="compact-view flex flex-col gap-2">
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
  /** Task / Assistant at the page's end (off: the page has them in its head — addTask(), openAssistant()). */
  readonly endButtons = input(true);
  /** Locked: shown as it is, nothing edited, added or moved. */
  readonly locked = input(false);

  /** A new task at the end, the cursor in it. */
  addTask(): void {
    this.insertBlock(this.value().blocks.length, 'gaps', '');
  }

  openAssistant(): void {
    this.aiAt = null;
    this.aiOpen.set(true);
  }
  /** Blocks can be picked (a checkbox each): `selected` — their places. */
  readonly selectable = input(false);
  readonly selected = model<number[]>([]);
  protected readonly aiOpen = signal(false);
  protected readonly desktop = !inject(DeviceDetectionService).isMobile();
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly i18n = inject(I18nService);
  // The task whose "how to write it" is open (desktop's ?)
  protected readonly helpOpen = signal<number | null>(null);

  // Blocks from the AI at the lesson's end (as tasks: heading and body in one text)
  // (at the caret it was opened from, else at the end; several answers in a row, one after another)
  private aiAt: number | null = null;
  protected appendBlocks(blocks: LessonBlock[]): void {
    const added = blocks.map(asTask);
    if (this.aiAt === null) {
      this.value.update((m) => ({ ...m, blocks: [...m.blocks.filter((b) => b.kind !== 'gaps' || b.text?.trim()), ...added] }));
      return;
    }
    const at = Math.min(this.aiAt, this.value().blocks.length);
    this.value.update((m) => ({ ...m, blocks: [...m.blocks.slice(0, at), ...added, ...m.blocks.slice(at)] }));
    this.aiAt = at + added.length;
  }

  // ---- "/" commands and the selection's formatting

  // The commands, opened by "/" at a line's start: in a text block (`block`; its "/…" from `start`
  // to `end`) or at the page's end (block -1); what's typed after "/" filters them
  protected readonly slash = signal<{ block: number; start: number; end: number; query: string; x: number; y: number; active: number } | null>(null);
  protected readonly sel = signal<{ block: number; x: number; y: number; on?: Mark[] } | null>(null);
  // Link: its address asked in the toolbar / menu
  protected readonly linking = signal(false);
  protected linkUrl = '';
  protected readonly linkField = viewChild<ElementRef<HTMLInputElement>>('linkField');
  protected field: HTMLTextAreaElement | null = null;
  private dragging = false;

  private readonly commands: { id: 'task' | 'assistant' | 'paste'; label: TranslationKey; hint: TranslationKey; words: string }[] = [
    { id: 'task', label: 'lessons.slashTask', hint: 'lessons.slashTaskHint', words: 'task exercise new add zadanie exercice' },
    { id: 'assistant', label: 'nav.ai', hint: 'lessons.slashAssistantHint', words: 'assistant ai asystent ia' },
    { id: 'paste', label: 'action.paste', hint: 'lessons.slashPasteHint', words: 'paste insert wklej coller' },
  ];
  protected readonly slashItems = computed(() => {
    const q = (this.slash()?.query ?? '').toLowerCase();
    return this.commands
      .filter((c) => this.photos() || c.id !== 'assistant')
      .filter((c) => c.id !== 'paste' || this.slash()?.block === -1)
      .filter((c) => !q || c.words.split(' ').some((w) => w.startsWith(q)) || this.i18n.t(c.label).toLowerCase().startsWith(q));
  });

  protected readonly formats: { id: FormatId; mark: string; text?: TranslationKey; label: TranslationKey }[] = [
    { id: 'bold', mark: 'B', label: 'lessons.fmtBold' },
    { id: 'italic', mark: 'I', label: 'lessons.fmtItalic' },
    { id: 'underline', mark: 'U', label: 'lessons.fmtUnderline' },
    { id: 'strike', mark: 'S', label: 'lessons.fmtStrike' },
    { id: 'gap', mark: '[ ]', text: 'lessons.fmtGapShort', label: 'lessons.fmtGap' },
    { id: 'choice', mark: '{ }', text: 'lessons.fmtChoiceShort', label: 'lessons.fmtChoice' },
    { id: 'link', mark: 'Link', text: 'lessons.fmtLinkShort', label: 'lessons.fmtLink' },
  ];

  // The menu: B I U in a row; then a row each — Fill in, Choice (tasks), Link
  protected readonly styleFormats = this.formats.filter((f) => !f.text);
  protected itemFormats(block: number) {
    return this.formatsFor(block).filter((f) => f.text);
  }

  // A task's text cut at its gaps / choices (the highlighting under its field; once per text)
  private readonly markedCache = new Map<string, ReturnType<typeof marked>>();
  protected marks(text: string | null): ReturnType<typeof marked> {
    const key = text ?? '';
    let out = this.markedCache.get(key);
    if (!out) {
      if (this.markedCache.size > 200) this.markedCache.clear();
      this.markedCache.set(key, (out = marked(key)));
    }
    return out;
  }

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


  // "+ Add": the commands under it (`query`: typed to filter them)
  // (the commands opened by "/": letters filter them; by a click: letters start a task)
  private bySlash = false;

  protected openAdd(query = ''): void {
    this.bySlash = false;
    // (a caret between tasks: the commands open at it)
    const c = this.caret();
    const list = this.host.nativeElement.querySelector<HTMLElement>('[data-tasks]');
    if (c && list) {
      const box = list.getBoundingClientRect();
      const line = list.querySelector<HTMLElement>('[data-caret]')?.getBoundingClientRect();
      this.slash.set({ block: -1, start: 0, end: 0, query, x: (line?.left ?? box.left) - 4, y: Math.min((line?.bottom ?? box.top + c.y) - 2, window.innerHeight - 140), active: 0 });
      return;
    }
    // (none yet: at the end)
    this.caretAtEnd(false);
    setTimeout(() => this.openAdd(query));
  }

  // The caret at the end of the page, its field focused (`menu`: the commands too)
  protected caretAtEnd(menu: boolean): void {
    if (!this.desktop || this.locked()) return;
    this.caret.set({ at: this.value().blocks.length, y: 0 });
    setTimeout(() => {
      const field = this.host.nativeElement.querySelector<HTMLInputElement>('[data-caret-input]');
      field?.focus();
      field?.scrollIntoView({ block: 'nearest' });
      if (menu) this.openAdd();
    });
  }

  // Keys on the page outside any field (nothing open over it): open the commands, a letter filtering
  // them (by its key, whatever the keyboard's language: "t" for Task); while they're open: ↑ ↓ pick,
  // Enter runs, Esc closes, letters / Backspace change the filter
  protected typeOnPage(e: KeyboardEvent): void {
    if (e.key === 'Escape' && this.caret() && !this.slash()) {
      this.caret.set(null);
      return;
    }
    if (!this.desktop || e.defaultPrevented || e.isComposing || e.ctrlKey || e.metaKey || e.altKey) return;
    if (!this.photos() || this.locked() || this.aiOpen() || this.previewing() !== null || this.sel()) return;
    const a = document.activeElement as HTMLElement | null;
    if (a?.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])')) return;
    if (a && a !== document.body && !this.host.nativeElement.contains(a)) return;
    const letter = /^Key[A-Z]$/.test(e.code) ? e.code.slice(3).toLowerCase() : e.key.length === 1 && e.key !== ' ' ? e.key : '';
    const sl = this.slash();
    if (sl && sl.block !== -1) return;
    if (!sl) {
      // (only "/" opens them — its key on any keyboard layout)
      if (e.key !== '/' && e.code !== 'Slash' && e.code !== 'NumpadDivide') return;
      e.preventDefault();
      this.openAdd();
      this.bySlash = true;
      return;
    }
    // Opened by a click (not "/"): what's typed is a new task, right there
    if (sl.block === -1 && !this.bySlash && e.key.length === 1 && e.key !== '/' && e.key !== ' ') {
      e.preventDefault();
      const at = this.caret()?.at ?? this.value().blocks.length;
      this.caret.set(null);
      this.slash.set(null);
      this.insertBlock(at, 'gaps', e.key);
      return;
    }
    if (e.key === 'Backspace') {
      e.preventDefault();
      this.slash.set({ ...sl, query: sl.query.slice(0, -1), active: 0 });
    } else if (letter && letter !== '/') {
      e.preventDefault();
      this.slash.set({ ...sl, query: sl.query + letter, active: 0 });
    } else {
      this.onSlashKey(e);
    }
  }

  // A click away from the "+ Add" commands: they close
  protected clickOnPage(e: MouseEvent): void {
    this.clearCaret(e);
    if (this.slash()?.block !== -1) return;
    const t = e.target as HTMLElement | null;
    if (t?.closest('[data-commands], [data-caret]')) return;
    this.slash.set(null);
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
      if (!c || (c.id === 'paste' && !this.clipboard.blocks()?.length)) return;
      e.preventDefault();
      this.runSlash(c.id);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      this.slash.set(null);
    }
  }

  // A command: its "/…" taken out; a task goes right there (the text around it split: above it,
  // under it), or the assistant opens
  protected runSlash(id: 'task' | 'assistant' | 'paste'): void {
    const sl = this.slash();
    this.slash.set(null);
    if (!sl) return;
    if (sl.block < 0) {
      // (at the caret between tasks, else at the end)
      const at = this.caret()?.at ?? this.value().blocks.length;
      this.aiAt = this.caret() ? at : null;
      this.caret.set(null);
      if (id === 'assistant') this.aiOpen.set(true);
      else if (id === 'paste') {
        // (the tasks copied, there)
        const copied = this.clipboard.blocks() ?? [];
        this.value.update((m) => ({ ...m, blocks: [...m.blocks.slice(0, at), ...copied.map((b) => ({ ...b })), ...m.blocks.slice(at)] }));
      } else this.insertBlock(at, 'gaps', '');
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
  protected insertBlock(at: number, kind: 'gaps' | 'text', text: string): void {
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
    if (this.locked()) return; // (locked: no formatting)
    requestAnimationFrame(() => {
      // The link's address being typed: the menu stays as it is
      if (this.linking()) return;
      if (document.activeElement !== ta || ta.selectionStart === ta.selectionEnd) {
        this.sel.set(null);
        return;
      }
      // Still selecting (the mouse held): the menu once it's let go
      if (this.dragging) {
        this.sel.set(null);
        return;
      }
      if (!this.desktop) return; // phones: the bar over the keyboard
      const r = caretRect(ta, ta.selectionEnd);
      this.sel.set({ block, x: Math.min(r.left + 14, window.innerWidth - 200), y: Math.max(8, Math.min(r.top - 8, window.innerHeight - 180)), on: this.marksOf(ta) });
    });
  }

  // Nothing selected: the word the cursor is in (false: none there)
  private selectWord(ta: HTMLTextAreaElement): boolean {
    if (ta.selectionStart !== ta.selectionEnd) return true;
    const v = ta.value;
    let [a, b] = [ta.selectionStart, ta.selectionStart];
    while (a > 0 && /[\p{L}\p{N}'’-]/u.test(v[a - 1])) a--;
    while (b < v.length && /[\p{L}\p{N}'’-]/u.test(v[b])) b++;
    if (a === b) return false;
    ta.setSelectionRange(a, b);
    return true;
  }

  // ---- Phones: the bar over the keyboard

  protected readonly kbBar = signal<{ block: number } | null>(null);
  // How far iOS has scrolled the window (the bar stays at the visible top)
  protected readonly kbOffset = signal(0);
  protected readonly kbHeight = signal(0);

  // Phones: a tap on a task / text — it alone on the screen, the keyboard up, the cursor where tapped
  protected openFocus(block: number, ta: HTMLTextAreaElement): void {
    if (this.desktop) return;
    const caret = ta.selectionStart || (ta.value ?? '').length;
    this.kbBar.set({ block });
    this.placeBar();
    this.cdr.detectChanges();
    const ft = document.querySelector<HTMLTextAreaElement>('textarea[data-focus]');
    if (!ft) return;
    ft.focus();
    ft.setSelectionRange(caret, caret);
    this.field = ft;
    // (the keyboard comes up: what's visible shrinks)
    setTimeout(() => this.placeBar(), 300);
  }

  // Phones: leaving the block's field (not for our buttons / the link's address) closes it
  protected onFocusBlur(): void {
    setTimeout(() => {
      if (this.linking()) return;
      if (document.activeElement?.hasAttribute('data-focus')) return;
      this.closeFocus();
    }, 150);
  }

  protected closeFocus(): void {
    const kb = this.kbBar();
    this.kbBar.set(null);
    this.slash.set(null);
    this.sel.set(null);
    (document.activeElement as HTMLElement | null)?.blur();
    if (kb) this.dropIfEmpty(kb.block);
  }

  // The visible part of the window (above the keyboard; iOS may scroll it)
  private placeBar(): void {
    const vv = window.visualViewport;
    this.kbOffset.set(Math.max(0, vv?.offsetTop ?? 0));
    this.kbHeight.set(vv?.height ?? window.innerHeight);
  }

  protected mobileFormat(kind: FormatId): void {
    const ta = this.field;
    const kb = this.kbBar();
    if (!ta || !kb || !this.selectWord(ta)) return;
    this.sel.set({ block: kb.block, x: 0, y: 0, on: this.marksOf(ta) });
    this.pickFormat(kind);
  }

  protected onBlur(): void {
    setTimeout(() => {
      if (this.linking()) return; // the link's address being typed
      this.slash.set(null);
      this.sel.set(null);
    }, 120);
  }

  // The address field left (not for the menu's OK): the menu closes
  protected onLinkBlur(): void {
    setTimeout(() => {
      if (!this.linking() || document.activeElement === this.linkField()?.nativeElement) return;
      this.sel.set(null);
    }, 120);
  }

  // Clicks in the toolbar / menu keep the text's selection (but the link's address field takes focus)
  protected keepFocus(e: Event): void {
    if (!(e.target instanceof HTMLInputElement)) e.preventDefault();
  }

  protected marksOf(ta: HTMLTextAreaElement): Mark[] {
    return marksAt(ta.value, ta.selectionStart, ta.selectionEnd);
  }

  protected pickFormat(kind: FormatId): void {
    // Already so: taken off (a choice keeps its right option, a link its text)
    if (this.sel()?.on?.includes(kind)) {
      this.unformat(kind);
      return;
    }
    // One at a time: what it already is comes off first
    for (const other of this.sel()?.on ?? []) this.strip(other);
    if (kind !== 'link') {
      this.format(kind);
      return;
    }
    this.linkUrl = '';
    this.linking.set(true);
    setTimeout(() => this.linkField()?.nativeElement.focus());
  }

  // A mark taken off the selection, the selection kept on the plain text (the menu stays)
  private strip(kind: Mark): void {
    const ta = this.field;
    const se = this.sel();
    if (!ta || !se) return;
    const r = unmark(ta.value, ta.selectionStart, ta.selectionEnd, kind);
    if (!r) return;
    this.setBlock(se.block, { text: r.text });
    ta.value = r.text;
    ta.setSelectionRange(r.a, r.b);
    this.sel.set({ ...se, on: (se.on ?? []).filter((m) => m !== kind) });
  }

  private unformat(kind: Mark): void {
    const ta = this.field;
    const se = this.sel();
    if (!ta || !se) return;
    const r = unmark(ta.value, ta.selectionStart, ta.selectionEnd, kind);
    this.sel.set(null);
    if (!r) return;
    this.setBlock(se.block, { text: r.text });
    ta.value = r.text;
    ta.focus();
    ta.setSelectionRange(r.a, r.b);
  }

  // <text|https://…>: a link (the selection its text)
  protected applyLink(): void {
    const ta = this.field;
    const se = this.sel();
    this.linking.set(false);
    if (!ta || !se) return;
    let url = this.linkUrl.trim();
    if (!url) return;
    if (!/^[a-z][a-z\d+.-]*:/i.test(url)) url = `https://${url}`;
    const [a, b] = [ta.selectionStart, ta.selectionEnd];
    const picked = ta.value.slice(a, b).replace(/[<>|]/g, ' ') || url;
    const inserted = `<${picked}|${url}>`;
    const text = ta.value.slice(0, a) + inserted + ta.value.slice(b);
    this.setBlock(se.block, { text });
    this.sel.set(null);
    ta.value = text;
    ta.focus();
    ta.setSelectionRange(a + inserted.length, a + inserted.length);
  }

  // B / I / U: **…**, *…*, __…__; a gap: […] (the selection its answer); a choice: {*…|} (the
  // selection the right one, the cursor where the others go)
  protected format(kind: Exclude<FormatId, 'link'>): void {
    const ta = this.field;
    const se = this.sel();
    if (!ta || !se) return;
    const [a, b] = [ta.selectionStart, ta.selectionEnd];
    const picked = ta.value.slice(a, b);
    // A choice from several options selected ("a) va b) vas", "va / vas"): all of them, the first
    // the right one; one: it's the right one, the cursor where the others go
    const options = kind === 'choice' ? asOptions(picked).map((o) => o.replace(/[|{}]/g, ' ')) : [];
    // Marks don't go over a line's end: several lines selected, each line's text marked on its own
    // (its spaces at the ends left outside)
    const [open, close] = (({ bold: ['**', '**'], italic: ['*', '*'], underline: ['__', '__'], strike: ['~~', '~~'], gap: ['[', ']'] }) as Record<string, string[]>)[kind] ?? ['', ''];
    const wrapLine = (line: string) => {
      const m = /^(\s*)(.*?)(\s*)$/.exec(line)!;
      return m[2] ? `${m[1]}${open}${m[2]}${close}${m[3]}` : line;
    };
    const multiline = kind !== 'choice' && picked.includes('\n');
    const inserted =
      kind === 'choice'
        ? options.length > 1
          ? `{*${options.join('|')}}`
          : `{*${options[0] ?? picked}|}`
        : multiline
          ? picked.split('\n').map(wrapLine).join('\n')
          : open + picked + close;
    const text = ta.value.slice(0, a) + inserted + ta.value.slice(b);
    this.setBlock(se.block, { text });
    this.sel.set(null);
    ta.value = text;
    ta.focus();
    if (kind === 'choice') {
      const at = options.length > 1 ? a + inserted.length : a + inserted.length - 1;
      ta.setSelectionRange(at, at);
    } else if (multiline) {
      ta.setSelectionRange(a, a + inserted.length);
    } else {
      ta.setSelectionRange(a + open.length, a + open.length + picked.length);
    }
  }

  // A task's field focused, the cursor at `caret`
  private focusTask(index: number, caret: number): void {
    setTimeout(() => {
      const ta = this.host.nativeElement.querySelector<HTMLTextAreaElement>(`textarea[data-task="${index}"]`);
      if (!ta) return;
      if (!this.desktop) {
        ta.setSelectionRange(caret, caret);
        this.openFocus(index, ta);
        return;
      }
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
    // The menu gone: no address being typed either
    effect(() => {
      if (!this.sel()) this.linking.set(false);
    });
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
    // A selection made by touch (phones): the toolbar too
    const selectionChange = () => {
      const el = document.activeElement;
      if (el instanceof HTMLTextAreaElement && el.dataset['task'] !== undefined && this.host.nativeElement.contains(el)) {
        this.onSelect(Number(el.dataset['task']), el);
      }
    };
    document.addEventListener('selectionchange', selectionChange);
    // A selection being made with the mouse: no menu till the button's let go (then mouseup shows it)
    const down = (e: MouseEvent) => {
      if (e.button === 0 && e.target instanceof HTMLTextAreaElement && this.host.nativeElement.contains(e.target)) this.dragging = true;
    };
    const up = () => {
      if (!this.dragging) return;
      this.dragging = false;
      selectionChange();
    };
    document.addEventListener('mousedown', down, true);
    document.addEventListener('mouseup', up, true);
    const placeBar = () => this.placeBar();
    window.visualViewport?.addEventListener('resize', placeBar);
    window.visualViewport?.addEventListener('scroll', placeBar);
    const chats = inject(AiChatService);
    inject(DestroyRef).onDestroy(() => {
      release();
      document.removeEventListener('click', closeHelp);
      document.removeEventListener('selectionchange', selectionChange);
      document.removeEventListener('mousedown', down, true);
      document.removeEventListener('mouseup', up, true);
      window.visualViewport?.removeEventListener('resize', placeBar);
      window.visualViewport?.removeEventListener('scroll', placeBar);
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
      this.seen.set(key, (shown = [forStudents(b)]));
    }
    return shown;
  }

  // ---- Moving a task (by its ⠿), as in Notion: only the ⠿ follows the pointer, nothing else moves;
  // a line jumps between the tasks — moving down, under the task the pointer is over; up, above it
  // (none while it's over its own place)
  protected readonly dragFrom = signal<number | null>(null);
  private dropAt: number | null = null;
  private dragY = 0;
  protected readonly dropLine = signal<number | null>(null);

  protected dragStart(e: DragEvent, i: number): void {
    this.taskMenu.set(null);
    this.dragFrom.set(i);
    this.dragY = e.clientY;
    e.dataTransfer?.setData('text/plain', '');
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
  }

  protected dragOver(e: DragEvent, list: HTMLElement): void {
    const from = this.dragFrom();
    if (from === null) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    const cards = [...list.querySelectorAll<HTMLElement>(':scope > [data-block]')].map((c) => c.getBoundingClientRect());
    // The task under the pointer (above them all: the first; under them all: the last)
    let over = cards.findIndex((r) => e.clientY < r.bottom + 4);
    if (over < 0) over = cards.length - 1;
    const at = e.clientY >= this.dragY ? over + 1 : over;
    if (at === from || at === from + 1) {
      this.dropAt = null;
      this.dropLine.set(null);
      return;
    }
    this.dropAt = at;
    const box = list.getBoundingClientRect();
    const y = at < cards.length ? cards[at].top - (at ? (cards[at].top - cards[at - 1].bottom) / 2 : 4) : cards[cards.length - 1].bottom + 4;
    this.dropLine.set(y - box.top - 1.5);
  }

  // ---- A caret between tasks (a click in the gap between them, above the first, under the last;
  // the commands open there at once):
  // Ctrl+V pastes the tasks copied there (else the clipboard's text, a new task); without one, at the end
  protected readonly caret = signal<{ at: number; y: number } | null>(null);
  // (an empty lesson: the caret there from the start, with its hint)
  private readonly emptyCaret = effect(() => {
    if (this.desktop && this.photos() && !this.locked() && !this.value().blocks.length && !this.caret()) {
      untracked(() => this.caret.set({ at: 0, y: 0 }));
    }
  });

  // (the place between two tasks nearest to y, and the middle of the gap there)
  private gapAt(list: HTMLElement, clientY: number): { at: number; y: number } {
    const box = list.getBoundingClientRect();
    const cards = [...list.querySelectorAll<HTMLElement>(':scope > [data-block]')].map((c) => c.getBoundingClientRect());
    if (!cards.length) return { at: 0, y: 0 };
    let at = cards.findIndex((r) => clientY < r.top + r.height / 2);
    if (at < 0) at = cards.length;
    const y = at < cards.length ? cards[at].top - (at ? (cards[at].top - cards[at - 1].bottom) / 2 : 4) : cards[cards.length - 1].bottom + 4;
    return { at, y: y - box.top - 1 };
  }

  protected placeCaret(e: MouseEvent, list: HTMLElement): void {
    if (e.target !== list || !this.desktop || this.locked()) return;
    e.preventDefault();
    (document.activeElement as HTMLElement | null)?.blur();
    this.caret.set(this.gapAt(list, e.clientY));
    // (its field focused, and the commands right away under it, once it's drawn)
    setTimeout(() => {
      this.host.nativeElement.querySelector<HTMLInputElement>('[data-caret-input]')?.focus();
      this.openAdd();
    });
  }

  // Typed in the caret's field: "/…" filters the commands; anything else — a new task with it
  protected caretTyped(e: Event): void {
    const field = e.target as HTMLInputElement;
    const v = field.value;
    if (v.startsWith('/')) {
      if (!this.slash()) this.openAdd(v.slice(1));
      else this.slash.update((sl) => (sl ? { ...sl, query: v.slice(1), active: 0 } : sl));
      this.bySlash = true;
      return;
    }
    if (!v) return;
    const at = this.caret()?.at ?? this.value().blocks.length;
    field.value = '';
    this.caret.set(null);
    this.slash.set(null);
    // (the new task drawn and focused at once: the next letters go on in it, not here)
    const block: LessonBlock = { kind: 'gaps', text: v, url: null, private: false, instruction: null };
    this.value.update((m) => ({ ...m, blocks: [...m.blocks.slice(0, at), block, ...m.blocks.slice(at)] }));
    this.cdr.detectChanges();
    const ta = this.host.nativeElement.querySelector<HTMLTextAreaElement>(`textarea[data-task="${at}"]`);
    ta?.focus();
    ta?.setSelectionRange(v.length, v.length);
  }

  // Its keys: the commands' (↑ ↓ Enter Esc); Esc with none open drops the caret
  protected caretKey(e: KeyboardEvent): void {
    if (this.slash()) {
      this.onSlashKey(e);
      return;
    }
    if (e.key === 'Escape') this.caret.set(null);
  }

  // Left (not for the commands' menu): the caret goes
  protected caretBlur(): void {
    setTimeout(() => {
      if (document.activeElement?.hasAttribute('data-caret-input') || this.aiOpen()) return;
      if (this.slash()?.block === -1) this.slash.set(null);
      if (!this.value().blocks.length) return; // (an empty lesson keeps it)
      this.caret.set(null);
      if (this.slash()?.block === -1) this.slash.set(null);
    }, 120);
  }

  // (a click anywhere but between the tasks: gone — an empty lesson keeps it)
  private clearCaret(e: MouseEvent): void {
    if (!this.value().blocks.length) return;
    const t = e.target as HTMLElement | null;
    if (this.caret() && !t?.hasAttribute?.('data-tasks') && !t?.closest?.('[data-commands], [data-caret]')) this.caret.set(null);
  }

  protected pasteOnPage(e: ClipboardEvent): void {
    if (!this.desktop || !this.photos() || this.locked() || this.aiOpen() || this.previewing() !== null) return;
    const a = document.activeElement as HTMLElement | null;
    if (a?.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])') && !a.hasAttribute('data-caret-input')) return;
    const copied = this.clipboard.blocks();
    const text = e.clipboardData?.getData('text/plain')?.trim() ?? '';
    const blocks: LessonBlock[] = copied?.length ? copied.map((b) => ({ ...b })) : text ? [{ kind: 'gaps', text, url: null, private: false, instruction: null }] : [];
    if (!blocks.length) return;
    e.preventDefault();
    const at = this.caret()?.at ?? this.value().blocks.length;
    this.value.update((m) => ({ ...m, blocks: [...m.blocks.slice(0, at), ...blocks, ...m.blocks.slice(at)] }));
    this.caret.set(null);
    this.slash.set(null);
  }

  // Near the top / bottom of what scrolls while moving one: it scrolls (faster the closer)
  protected autoScroll(e: DragEvent): void {
    if (this.dragFrom() === null) return;
    let box: HTMLElement | null = this.host.nativeElement.parentElement;
    while (box && !(box.scrollHeight > box.clientHeight && /auto|scroll/.test(getComputedStyle(box).overflowY))) box = box.parentElement;
    if (!box) return;
    const r = box.getBoundingClientRect();
    const edge = 80;
    const down = e.clientY - (r.bottom - edge);
    const up = r.top + edge - e.clientY;
    if (down > 0) box.scrollTop += Math.ceil(down / 4);
    else if (up > 0) box.scrollTop -= Math.ceil(up / 4);
  }

  protected drop(e: DragEvent): void {
    e.preventDefault();
    const from = this.dragFrom();
    const at = this.dropAt;
    this.dragEnd();
    if (from === null || at === null) return;
    this.value.update((m) => {
      const blocks = [...m.blocks];
      const [moved] = blocks.splice(from, 1);
      blocks.splice(at > from ? at - 1 : at, 0, moved);
      return { ...m, blocks };
    });
  }

  protected dragEnd(): void {
    this.dragFrom.set(null);
    this.dropAt = null;
    this.dropLine.set(null);
  }

  // Its menu → Copy: the task kept to paste (⋯ → Paste content, here or in another lesson); its
  // text to the clipboard too
  protected readonly clipboard = inject(LessonClipboard);

  protected copyTask(index: number): void {
    this.taskMenu.set(null);
    const b = this.value().blocks[index];
    if (b) this.clipboard.copy([{ ...b }]);
  }

  // ⋯ → Format: its text brought to one look (see tidy)
  protected formatTask(index: number): void {
    this.taskMenu.set(null);
    const b = this.value().blocks[index];
    if (b?.text) this.setBlock(index, { text: tidy(b.text) });
  }

  /** Every task's text brought to one look (the page's ⋯ → Format). */
  formatAll(): void {
    this.value.update((m) => ({ ...m, blocks: m.blocks.map((b) => (b.text && (b.kind === 'gaps' || b.kind === 'text') ? { ...b, text: tidy(b.text) } : b)) }));
  }

  // A task's ⋯ menu (which one, and its button)
  protected readonly taskMenu = signal<{ index: number; from: HTMLElement } | null>(null);
  protected removeFromMenu(index: number, from: HTMLElement): void {
    this.taskMenu.set(null);
    this.askRemove(index, from);
  }

  // ×: an empty block goes at once; one with something in it, once confirmed
  protected readonly removing = signal<{ index: number; from: HTMLElement } | null>(null);
  protected askRemove(index: number, from: HTMLElement): void {
    const b = this.value().blocks[index];
    const filled = !!(b?.text?.trim() || b?.url || b?.items?.some((x) => x.trim()) || b?.options?.some((x) => x.trim()) || b?.instruction?.trim());
    if (filled) this.removing.set({ index, from });
    else this.removeBlock(index);
  }

  protected removeBlock(index: number): void {
    this.value.update((m) => ({ ...m, blocks: m.blocks.filter((_, i) => i !== index) }));
    if (this.selectable()) this.selected.update((s) => s.filter((x) => x !== index).map((x) => (x > index ? x - 1 : x)));
  }
}
