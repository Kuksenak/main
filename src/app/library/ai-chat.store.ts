import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { environment } from '@environments/environment';
import { I18nService } from '../core/i18n/i18n.service';

/** A turn of the chat: the teacher's message, or the assistant's reply and the texts it wrote for the page. */
export interface ChatTurn {
  role: 'user' | 'assistant';
  text: string;
  blocks?: string[];
  // (its texts put on the page already)
  added?: boolean;
}

/**
 * The page assistant's chats (the API's /ai/chat answers one turn; the chat itself lives here, on
 * the device, a chat per page while the app is open). `send` a message with the page as it is now:
 * the answer comes as the next turn; `error` says why there's none (the day's questions used up,
 * AI off on the server, …).
 */
@Injectable({ providedIn: 'root' })
export class AiChatStore {
  private readonly http = inject(HttpClient);
  private readonly i18n = inject(I18nService);
  private readonly url = `${environment.apiUrl}/ai/chat`;

  private readonly chats = new Map<string, ReturnType<typeof signal<ChatTurn[]>>>();
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);

  /** The chat about this page (empty to begin with). */
  turns(pageId: string) {
    let chat = this.chats.get(pageId);
    if (!chat) this.chats.set(pageId, (chat = signal<ChatTurn[]>([])));
    return chat;
  }

  send(pageId: string, message: string, page: string): void {
    const text = message.trim();
    if (!text || this.busy()) return;
    const chat = this.turns(pageId);
    // (the chat so far as the API takes it: the assistant's texts with its reply, so it can refer to them)
    const history = chat().map((t) => ({ role: t.role, text: [t.text, ...(t.blocks ?? [])].join('\n\n') }));
    chat.update((turns) => [...turns, { role: 'user', text }]);
    this.busy.set(true);
    this.error.set(null);
    this.http.post<{ reply: string; blocks: string[] }>(this.url, { history, message: text, page }).subscribe({
      next: (answer) => {
        this.busy.set(false);
        chat.update((turns) => [...turns, { role: 'assistant', text: answer.reply, blocks: answer.blocks }]);
      },
      error: (e: HttpErrorResponse) => {
        this.busy.set(false);
        this.error.set(
          e.status === 429
            ? (e.error?.description ?? this.i18n.t('ai.tooMany'))
            : e.status === 503 && e.error?.code === 'Ai.Off'
              ? this.i18n.t('ai.off')
              : this.i18n.t('ai.failed'),
        );
      },
    });
  }

  /** A turn's texts marked as put on the page. */
  added(pageId: string, turn: ChatTurn): void {
    this.turns(pageId).update((turns) => turns.map((t) => (t === turn ? { ...t, added: true } : t)));
  }

  clear(pageId: string): void {
    this.turns(pageId).set([]);
    this.error.set(null);
  }
}
