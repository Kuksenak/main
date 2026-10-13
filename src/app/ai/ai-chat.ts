import { Component, DestroyRef, ElementRef, computed, effect, inject, input, output, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { TranslationKey } from '../core/i18n/translations';
import { BrandIcon } from '../core/ui/icon/brand-icon';
import { Icon, IconName } from '../core/ui/icon/icon';
import { LessonContent } from '../lessons/lesson-content';
import { LessonImportsService } from '../lessons/lesson-imports.service';
import { LessonBlock, LessonBlockKind, LessonInput } from '../lessons/lesson.service';
import { AiChatService, ChatMessage } from './ai-chat.service';

const KINDS: { kind: LessonBlockKind; icon: IconName; label: TranslationKey }[] = [
  { kind: 'text', icon: 'text', label: 'lessons.text' },
  { kind: 'gaps', icon: 'compose', label: 'lessons.gaps' },
  { kind: 'exercise', icon: 'exercise', label: 'lessons.exercise' },
  { kind: 'checklist', icon: 'checklist', label: 'lessons.checklist' },
  { kind: 'image', icon: 'image', label: 'lessons.image' },
];

/**
 * A lesson's AI chat, like Claude's, inside the lesson editor (its ✨ AI): ask for material
 * ("10 more like these", "a text about travel, A2, with questions") or send photos (attach,
 * paste, drop); the AI answers with a short reply and lesson blocks — Add to lesson puts them
 * all at the lesson's end, Pick… lets you choose. Only lesson material (the server holds it to
 * that). One chat per lesson, on this device; New chat starts over.
 */
@Component({
  selector: 'app-ai-chat',
  imports: [BrandIcon, FormsModule, Icon, LessonContent, TranslatePipe],
  host: { class: 'flex min-h-0 flex-1 flex-col desktop:h-[min(78vh,46rem)]' },
  template: `
    <div #list class="min-h-0 flex-1 overflow-y-auto">
      <div class="flex w-full flex-col gap-5 pb-4">
        @if (!messages().length) {
          <!-- Nothing yet: what to ask -->
          <div class="flex flex-col items-center gap-4 py-8 text-center">
            <app-brand-icon name="sparkle" class="size-10" />
            <p class="text-body max-w-md opacity-60">{{ 'ai.empty' | t }}</p>
          </div>
        }
        @for (m of messages(); track m.id) {
          @if (m.role === 'user') {
            <!-- The teacher's: on the right -->
            <div class="flex flex-col items-end gap-1.5">
              @if (m.images?.length) {
                <div class="flex flex-wrap justify-end gap-1.5">
                  @for (src of m.images; track src) {
                    <img [src]="src" alt="" class="h-24 rounded-xl border-[0.5px] border-[var(--separator)] object-cover" />
                  }
                </div>
              } @else if (m.imageCount) {
                <span class="text-footnote flex items-center gap-1 opacity-50"><app-icon name="image" class="size-4" />{{ m.imageCount }}</span>
              }
              @if (m.text) {
                <p class="text-body max-w-[85%] select-text whitespace-pre-wrap rounded-2xl bg-[var(--fill)] px-4 py-2.5">{{ m.text }}</p>
              }
            </div>
          } @else {
            <!-- The AI's: its reply, then what it made -->
            <div class="flex flex-col gap-2.5">
              @if (m.error) {
                <p class="text-footnote select-text break-words text-[var(--danger)]">{{ 'ai.failed' | t }} {{ m.error }}</p>
              }
              @if (m.text) {
                <p class="text-body select-text whitespace-pre-wrap">{{ m.text }}</p>
              }
              @if (m.draft?.blocks?.length) {
                <div class="card flex flex-col">
                  <div class="flex flex-wrap items-center gap-1.5 px-3 py-2.5">
                    @for (c of counts(m); track c.kind) {
                      <span class="text-footnote inline-flex items-center gap-1 rounded-full bg-[var(--fill)] px-2.5 py-1">
                        <app-icon [name]="c.icon" class="size-3.5 opacity-60" /><span class="font-semibold tabular-nums">{{ c.n }}</span>{{ c.label | t }}
                      </span>
                    }
                    <span class="flex-1"></span>
                    <button type="button" (click)="toggle(m.id)" class="text-footnote rounded-full px-2 py-1 font-medium opacity-70 hover:bg-[var(--highlight)]">
                      {{ (shown().includes(m.id) ? 'ai.hide' : 'ai.show') | t }}
                    </button>
                    <button type="button" (click)="pick(m)" class="chip !rounded-full">{{ 'ai.pick' | t }}</button>
                    @if (added().includes(m.id)) {
                      <span class="text-footnote flex items-center gap-1 px-2 font-medium text-[var(--success)]"><app-icon name="check" [strokeWidth]="2.5" class="size-4" />{{ 'ai.added' | t }}</span>
                    } @else {
                      <button type="button" (click)="addAll(m)" class="btn-primary !rounded-full !px-3.5 !py-1.5">{{ 'lessons.addToLesson' | t }}</button>
                    }
                  </div>
                  @if (shown().includes(m.id)) {
                    <div class="border-t-[0.5px] border-[var(--separator)] bg-[var(--app-bg)] p-3">
                      <app-lesson-content [blocks]="m.draft!.blocks" />
                    </div>
                  }
                </div>
              }
            </div>
          }
        }
        @if (chat.pending() === chatKey()) {
          <div class="flex items-center gap-2 opacity-60">
            <span class="size-4 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent"></span>
            <span class="text-footnote">{{ 'ai.thinking' | t }}</span>
          </div>
        }
      </div>
    </div>

    <!-- The message being written: pictures, text, Send; the model; New chat -->
    <div class="pt-2">
      @if (files().length) {
        <div class="mb-2 flex flex-wrap gap-1.5">
          @for (f of files(); track f.url; let k = $index) {
            <span class="relative">
              <img [src]="f.url" alt="" class="h-16 rounded-lg border-[0.5px] border-[var(--separator)] object-cover" />
              <button type="button" (click)="unattach(k)" [attr.aria-label]="'lessons.removeBlock' | t" class="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-[var(--text)] text-[var(--app-bg)]">
                <app-icon name="close" [strokeWidth]="2.5" class="size-3" />
              </button>
            </span>
          }
        </div>
      }
      <div class="card flex items-end gap-1.5 p-1.5">
        <button type="button" (click)="picker.click()" [attr.aria-label]="'ai.attach' | t" class="icon-plain shrink-0">
          <app-icon name="image" class="size-5" />
        </button>
        <input #picker type="file" accept="image/*" multiple hidden (change)="attach(picker.files); picker.value = ''" />
        <textarea
          #box
          [(ngModel)]="draft"
          (keydown.enter)="onEnter($event)"
          (input)="grow()"
          rows="1"
          [placeholder]="'ai.placeholder' | t"
          class="text-body max-h-48 min-h-9 flex-1 resize-none bg-transparent px-1 py-1.5 outline-none"
        ></textarea>
        <button type="button" (click)="send()" [disabled]="!!chat.pending() || (!draft.trim() && !files().length)" [attr.aria-label]="'ai.send' | t" class="btn-confirm disabled:opacity-40">
          <app-icon name="chevron-right" [strokeWidth]="2.5" class="size-6 -rotate-90" />
        </button>
      </div>
      <div class="mt-1.5 flex items-center gap-2 pb-[env(safe-area-inset-bottom)]">
        @if (imports.models().length > 1) {
          <select [ngModel]="imports.model()" (ngModelChange)="imports.pickModel($event)" [attr.aria-label]="'lessons.model' | t" class="text-footnote rounded-full bg-transparent px-1 py-0.5 opacity-70">
            @for (id of imports.models(); track id) {
              <option [value]="id">{{ modelName(id) }}</option>
            }
          </select>
        }
        <span class="flex-1"></span>
        @if (messages().length) {
          <button type="button" (click)="chat.clear(chatKey())" [disabled]="chat.pending() === chatKey()" class="text-footnote rounded-full px-2 py-1 font-medium opacity-70 hover:bg-[var(--highlight)]">{{ 'ai.newChat' | t }}</button>
        }
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
  protected readonly shown = signal<string[]>([]);
  protected readonly added = signal<string[]>([]);

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
    queueMicrotask(() => this.grow());
    this.chat.send(this.chatKey(), text, files, this.lesson());
  }

  // The box grows with its text (up to its max height)
  protected grow(): void {
    const el = this.box().nativeElement;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }

  protected toggle(id: string): void {
    this.shown.update((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  // All of it at the lesson's end
  protected addAll(m: ChatMessage): void {
    if (!m.draft?.blocks.length) return;
    this.add.emit(m.draft.blocks);
    this.added.update((a) => [...a, m.id]);
  }

  // Some of it: the preview's checkboxes, then Add to lesson
  protected pick(m: ChatMessage): void {
    if (!m.draft) return;
    this.imports.previewLocal(m.draft, (blocks) => {
      this.add.emit(blocks);
      this.added.update((a) => [...a, m.id]);
    });
  }

  protected counts(m: ChatMessage) {
    const blocks = m.draft?.blocks ?? [];
    return KINDS.map((k) => ({ ...k, n: blocks.filter((b) => b.kind === k.kind).length })).filter((c) => c.n > 0);
  }

  // "gemini-3.5-flash-lite" → "Gemini 3.5 Flash Lite"
  protected modelName(id: string): string {
    return id.replace(/-/g, ' ').replace(/\b[a-z]/g, (c) => c.toUpperCase());
  }
}
