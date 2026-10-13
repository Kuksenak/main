import { Component, DestroyRef, ElementRef, computed, effect, inject, input, output, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { TranslationKey } from '../core/i18n/translations';
import { BrandIcon } from '../core/ui/icon/brand-icon';
import { Icon } from '../core/ui/icon/icon';
import { Tip } from '../core/ui/tip';
import { LessonContent } from '../lessons/lesson-content';
import { asTask, forStudents } from '../lessons/gaps';
import { LessonImportsService } from '../lessons/lesson-imports.service';
import { LessonBlock, LessonInput } from '../lessons/lesson.service';
import { AiChatService, ChatMessage } from './ai-chat.service';

/**
 * A lesson's AI chat, like Claude's, inside the lesson editor (its ✨ AI): ask for material
 * ("10 more like these", "a text about travel, A2, with questions") or send photos (attach,
 * paste, drop); the AI answers with a short reply and what it made, shown as the student will see
 * it — Accept puts it at the lesson's end, Decline puts it away. Only lesson material (the server holds it to
 * that). One chat per lesson, on this device; New chat starts over.
 */
@Component({
  selector: 'app-ai-chat',
  imports: [BrandIcon, FormsModule, Icon, LessonContent, Tip, TranslatePipe],
  host: { class: 'flex min-h-0 flex-1 flex-col desktop:h-[min(78vh,46rem)]' },
  template: `
    <div #list class="min-h-0 flex-1 overflow-y-auto">
      <div class="flex w-full flex-col gap-4 pb-4 text-[0.9375rem] leading-relaxed">
        @if (!messages().length) {
          <!-- Nothing yet: what to ask -->
          <div class="flex flex-col items-center gap-3 py-10 text-center">
            <app-brand-icon name="sparkle" class="size-8" />
            <p class="max-w-sm opacity-55">{{ 'ai.empty' | t }}</p>
          </div>
        }
        @for (m of messages(); track m.id) {
          @if (m.role === 'user') {
            <!-- The teacher's: on the right, in a light bubble -->
            <div class="flex flex-col items-end gap-1.5">
              @if (m.images?.length) {
                <div class="flex flex-wrap justify-end gap-1.5">
                  @for (src of m.images; track src) {
                    <img [src]="src" alt="" class="h-20 rounded-lg border-[0.5px] border-[var(--separator)] object-cover" />
                  }
                </div>
              } @else if (m.imageCount) {
                <span class="text-footnote flex items-center gap-1 opacity-50"><app-icon name="image" class="size-4" />{{ m.imageCount }}</span>
              }
              @if (m.text) {
                <p class="max-w-[85%] select-text whitespace-pre-wrap rounded-xl bg-[var(--fill-strong)] px-3 py-1.5">{{ m.text }}</p>
              }
            </div>
          } @else {
            <!-- The AI's: its reply as plain text, then what it made -->
            <div class="flex flex-col gap-2">
              @if (m.error) {
                <p class="text-footnote select-text break-words text-[var(--danger)]">{{ 'ai.failed' | t }} {{ m.error }}</p>
              }
              @if (m.text) {
                <p class="select-text whitespace-pre-wrap">{{ m.text }}</p>
              }
              @if (m.draft?.blocks?.length) {
                <!-- What it made, as the student will see it; Accept puts it in the lesson -->
                @if (m.decided === 'declined') {
                  <p class="text-footnote opacity-45">{{ 'ai.declined' | t }}</p>
                } @else {
                  <!-- (as in Preview: plain on the page, no frame) -->
                  <div class="compact-view">
                    <app-lesson-content [blocks]="preview(m)" mode="student" />
                  </div>
                  @if (m.decided === 'accepted') {
                    <p class="text-footnote flex items-center gap-1 opacity-45"><app-icon name="check" class="size-3.5" />{{ 'ai.added' | t }}</p>
                  } @else {
                    <div class="flex items-center justify-end gap-1">
                      <button type="button" (click)="decline(m)" class="head-btn"><app-icon name="close" />{{ 'ai.decline' | t }}</button>
                      <button type="button" (click)="addAll(m)" class="head-btn font-medium"><app-icon name="check" />{{ 'ai.accept' | t }}</button>
                    </div>
                  }
                }
              }
            </div>
          }
        }
        @if (chat.pending() === chatKey()) {
          <div class="flex items-center gap-2 opacity-55">
            <span class="size-3.5 animate-spin rounded-full border-[1.5px] border-[var(--text)] border-t-transparent"></span>
            <span class="text-footnote">{{ 'ai.thinking' | t }}</span>
          </div>
        }
      </div>
    </div>

    <!-- The message being written (as in Claude): one rounded box — the text on top; under it
         attach, the model, New chat and Send (an Enter key, as the head's buttons) -->
    <div class="pt-2 pb-[env(safe-area-inset-bottom)]">
      <div class="flex flex-col rounded-2xl border-[0.5px] border-[var(--separator)] bg-[var(--surface)] p-2 shadow-[0_1px_4px_rgb(0_0_0/0.04)]">
        @if (files().length) {
          <div class="mb-1.5 flex flex-wrap gap-1.5 px-1 pt-1">
            @for (f of files(); track f.url; let k = $index) {
              <span class="relative">
                <img [src]="f.url" alt="" class="h-14 rounded-lg border-[0.5px] border-[var(--separator)] object-cover" />
                <button type="button" (click)="unattach(k)" [attr.aria-label]="'lessons.removeBlock' | t" class="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-[var(--text)] text-[var(--app-bg)]">
                  <app-icon name="close" [strokeWidth]="2.5" class="size-3" />
                </button>
              </span>
            }
          </div>
        }
        <textarea
          #box
          [(ngModel)]="draft"
          (keydown.enter)="onEnter($event)"
          (input)="grow()"
          rows="2"
          [placeholder]="'ai.placeholder' | t"
          class="max-h-48 min-h-[calc(2lh+0.5rem)] w-full resize-none bg-transparent px-1.5 py-1 text-[0.9375rem] leading-relaxed outline-none placeholder:opacity-45"
        ></textarea>
        <div class="flex items-center gap-1">
          <button type="button" (click)="picker.click()" [appTip]="'ai.attach' | t" tipSide="top" [attr.aria-label]="'ai.attach' | t" class="head-btn !px-1.5">
            <app-icon name="paperclip" />
          </button>
          <input #picker type="file" accept="image/*" multiple hidden (change)="attach(picker.files); picker.value = ''" />
          <span class="flex-1"></span>
          @if (imports.models().length > 1) {
            <select [ngModel]="imports.model()" (ngModelChange)="imports.pickModel($event)" [attr.aria-label]="'lessons.model' | t" class="head-btn cursor-pointer appearance-none bg-transparent opacity-70">
              @for (id of imports.models(); track id) {
                <option [value]="id">{{ modelName(id) }}</option>
              }
            </select>
          }
          @if (messages().length) {
            <button type="button" (click)="chat.clear(chatKey())" [disabled]="chat.pending() === chatKey()" class="head-btn opacity-70">{{ 'ai.newChat' | t }}</button>
          }
          <button type="button" (click)="send()" [disabled]="!!chat.pending() || (!draft.trim() && !files().length)" [appTip]="'ai.send' | t" tipSide="top" [attr.aria-label]="'ai.send' | t" class="head-btn !px-1.5 disabled:opacity-30">
            <app-icon name="enter" class="!opacity-90" />
          </button>
        </div>
      </div>
    </div>
  `,
})
export class AiChat {
  /** Whose chat: the lesson's id ('new' for one not saved yet). */
  readonly chatKey = input.required<string>();
  /** The lesson as it is now (the AI sees it). */
  readonly lesson = input.required<LessonInput>();
  /** Blocks for the lesson's end. */
  readonly add = output<LessonBlock[]>();

  protected readonly chat = inject(AiChatService);
  protected readonly imports = inject(LessonImportsService);
  private readonly i18n = inject(I18nService);
  private readonly list = viewChild.required<ElementRef<HTMLElement>>('list');
  private readonly box = viewChild.required<ElementRef<HTMLTextAreaElement>>('box');

  protected draft = '';
  protected readonly messages = computed(() => {
    this.chat.pending();
    return this.chat.messages(this.chatKey());
  });
  protected readonly files = signal<{ blob: Blob; url: string }[]>([]);

  constructor() {
    this.imports.ensureLoaded();
    effect(() => this.chat.open.add(this.chatKey()));

    // New messages: scrolled to the end
    effect(() => {
      this.messages();
      this.chat.pending();
      queueMicrotask(() => {
        const el = this.list().nativeElement;
        el.scrollTop = el.scrollHeight;
      });
    });

    // Pictures pasted (Ctrl+V) or dropped: attached
    const paste = (e: ClipboardEvent) => {
      const images = [...(e.clipboardData?.files ?? [])].filter((f) => f.type.startsWith('image/'));
      if (!images.length) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      this.attach(images);
    };
    const over = (e: DragEvent) => e.preventDefault();
    const drop = (e: DragEvent) => {
      const images = [...(e.dataTransfer?.files ?? [])].filter((f) => f.type.startsWith('image/'));
      if (!images.length) return;
      e.preventDefault();
      this.attach(images);
    };
    document.addEventListener('paste', paste, true);
    document.addEventListener('dragover', over);
    document.addEventListener('drop', drop);
    inject(DestroyRef).onDestroy(() => {
      this.chat.open.delete(this.chatKey());
      document.removeEventListener('paste', paste, true);
      document.removeEventListener('dragover', over);
      document.removeEventListener('drop', drop);
    });
  }

  protected attach(list: FileList | File[] | null): void {
    const added = [...(list ?? [])].filter((f) => f.type.startsWith('image/')).map((blob) => ({ blob, url: URL.createObjectURL(blob) }));
    this.files.update((f) => [...f, ...added].slice(0, 5));
  }

  protected unattach(k: number): void {
    this.files.update((f) => f.filter((_, j) => j !== k));
  }

  // Enter sends; Shift+Enter: a new line
  protected onEnter(e: Event): void {
    if ((e as KeyboardEvent).shiftKey) return;
    e.preventDefault();
    this.send();
  }

  protected send(): void {
    if (this.chat.pending()) return;
    const text = this.draft;
    const files = this.files().map((f) => f.blob);
    if (!text.trim() && !files.length) return;
    this.draft = '';
    this.files.set([]);
    setTimeout(() => this.grow()); // (once the emptied text is in the box)
    this.chat.send(this.chatKey(), text, files, this.lesson());
  }

  // The box grows with its text (up to its max height)
  protected grow(): void {
    const el = this.box().nativeElement;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }

  // All of it at the lesson's end
  protected addAll(m: ChatMessage): void {
    if (!m.draft?.blocks.length) return;
    this.add.emit(m.draft.blocks);
    this.chat.decide(this.chatKey(), m.id, 'accepted');
  }

  // As the student will see it: tasks with their answers taken out (the same object per answer)
  private readonly previews = new Map<string, LessonBlock[]>();
  protected preview(m: ChatMessage): LessonBlock[] {
    let blocks = this.previews.get(m.id);
    if (!blocks) this.previews.set(m.id, (blocks = (m.draft?.blocks ?? []).map((b) => forStudents(asTask(b)))));
    return blocks;
  }

  protected decline(m: ChatMessage): void {
    this.chat.decide(this.chatKey(), m.id, 'declined');
  }

  // "gemini-3.5-flash-lite" → "Gemini 3.5 Flash Lite"
  protected modelName(id: string): string {
    return id.replace(/-/g, ' ').replace(/\b[a-z]/g, (c) => c.toUpperCase());
  }
}
