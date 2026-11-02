import { afterNextRender, Component, computed, DestroyRef, ElementRef, inject, input, output, signal, viewChild } from '@angular/core';
import { desktop } from '../core/device';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { Icon } from '../core/ui';
import { AiChatStore, ChatBlock, ChatTurn, MAX_PHOTOS } from './ai-chat.store';
import { marked } from './marks';

/**
 * The page assistant's chat (AiChatStore), for a page: the turns — the teacher's on the right (their
 * photos over it), the assistant's on the left, the blocks it wrote for the page under its reply as
 * cards (the teacher's only — answers: a lock, a dashed edge), "Add to the page" under them (`add`:
 * the page puts them in) — and the field at the bottom (Enter sends; Shift+Enter, a new line; +:
 * photos — a book's page, say — pasted or dropped in too, up to 5). Nothing yet: a few words on what
 * to ask. The page around it: a sheet (phones) or a window (desktop).
 */
@Component({
  selector: 'app-ai-chat',
  imports: [Icon, TranslatePipe],
  host: { class: 'flex min-h-0 flex-1 flex-col', '(dragover)': '$event.preventDefault()', '(drop)': 'dropped($event)' },
  templateUrl: './ai-chat.html',
})
export class AiChat {
  readonly pageId = input.required<string>();
  // The page as text, sent with each message
  readonly page = input.required<string>();
  readonly add = output<ChatBlock[]>();

  protected readonly store = inject(AiChatStore);
  protected readonly desktop = desktop;
  protected readonly turns = computed(() => this.store.turns(this.pageId())());
  protected readonly marked = marked;
  // The photos to go with the next message
  protected readonly photos = signal<{ blob: Blob; url: string }[]>([]);
  protected readonly maxPhotos = MAX_PHOTOS;

  private readonly field = viewChild.required<ElementRef<HTMLTextAreaElement>>('field');
  private readonly end = viewChild<ElementRef<HTMLElement>>('end');

  constructor() {
    afterNextRender(() => {
      if (desktop) this.field().nativeElement.focus();
      this.scrollDown();
    });
    inject(DestroyRef).onDestroy(() => this.photos().forEach((p) => URL.revokeObjectURL(p.url)));
  }

  protected send(): void {
    const field = this.field().nativeElement;
    if (this.store.busy() || (!field.value.trim() && !this.photos().length)) return;
    this.store.send(this.pageId(), field.value, this.page(), this.photos().map((p) => p.blob));
    // (their URLs now the chat's turn's)
    this.photos.set([]);
    field.value = '';
    field.style.height = '';
    setTimeout(() => this.scrollDown());
  }

  protected key(e: KeyboardEvent): void {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      this.send();
    }
  }

  protected grow(field: HTMLTextAreaElement): void {
    field.style.height = 'auto';
    field.style.height = `${Math.min(field.scrollHeight, 160)}px`;
  }

  protected attach(files: FileList | File[] | null | undefined): void {
    const images = [...(files ?? [])].filter((f) => f.type.startsWith('image/'));
    const room = MAX_PHOTOS - this.photos().length;
    if (!images.length || room <= 0) return;
    this.photos.update((p) => [...p, ...images.slice(0, room).map((blob) => ({ blob, url: URL.createObjectURL(blob) }))]);
  }

  protected unattach(i: number): void {
    URL.revokeObjectURL(this.photos()[i].url);
    this.photos.update((p) => p.filter((_, k) => k !== i));
  }

  // (Ctrl+V of a picture in the field: attached, not typed)
  protected pasted(e: ClipboardEvent): void {
    const images = [...(e.clipboardData?.files ?? [])].filter((f) => f.type.startsWith('image/'));
    if (!images.length) return;
    e.preventDefault();
    this.attach(images);
  }

  protected dropped(e: DragEvent): void {
    e.preventDefault();
    this.attach(e.dataTransfer?.files);
  }

  protected put(turn: ChatTurn): void {
    if (!turn.blocks?.length) return;
    this.add.emit(turn.blocks);
    this.store.added(this.pageId(), turn);
  }

  private scrollDown(): void {
    this.end()?.nativeElement.scrollIntoView({ block: 'end' });
  }
}
