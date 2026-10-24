import { afterNextRender, Component, computed, ElementRef, inject, input, output, viewChild } from '@angular/core';
import { desktop } from '../core/device';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { Icon } from '../core/ui';
import { AiChatStore, ChatTurn } from './ai-chat.store';
import { marked } from './marks';

/**
 * The page assistant's chat (AiChatStore), for a page: the turns — the teacher's on the right, the
 * assistant's on the left, the texts it wrote for the page under its reply as cards, "Add to the
 * page" under them (`add`: the page puts them in) — and the field at the bottom (Enter sends;
 * Shift+Enter, a new line). Nothing yet: a few words on what to ask. The page around it: a sheet
 * (phones) or a panel at the right (desktop).
 */
@Component({
  selector: 'app-ai-chat',
  imports: [Icon, TranslatePipe],
  host: { class: 'flex min-h-0 flex-1 flex-col' },
  templateUrl: './ai-chat.html',
})
export class AiChat {
  readonly pageId = input.required<string>();
  // The page as text, sent with each message
  readonly page = input.required<string>();
  readonly add = output<string[]>();

  protected readonly store = inject(AiChatStore);
  protected readonly desktop = desktop;
  protected readonly turns = computed(() => this.store.turns(this.pageId())());
  protected readonly marked = marked;

  private readonly field = viewChild.required<ElementRef<HTMLTextAreaElement>>('field');
  private readonly end = viewChild<ElementRef<HTMLElement>>('end');

  constructor() {
    afterNextRender(() => {
      if (desktop) this.field().nativeElement.focus();
      this.scrollDown();
    });
  }

  protected send(): void {
    const field = this.field().nativeElement;
    this.store.send(this.pageId(), field.value, this.page());
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

  protected put(turn: ChatTurn): void {
    if (!turn.blocks?.length) return;
    this.add.emit(turn.blocks);
    this.store.added(this.pageId(), turn);
  }

  private scrollDown(): void {
    this.end()?.nativeElement.scrollIntoView({ block: 'end' });
  }
}
