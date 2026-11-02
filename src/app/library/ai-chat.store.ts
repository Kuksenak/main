import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { environment } from '@environments/environment';
import { I18nService } from '../core/i18n/i18n.service';
import { Toasts } from '../core/ui';

/** A text the assistant wrote for the page (private: for the teacher only — a task's answers). */
export interface ChatBlock {
  text: string;
  private: boolean;
}

/** A turn of the chat: the teacher's message (and photos), or the assistant's reply and the blocks it wrote for the page. */
export interface ChatTurn {
  role: 'user' | 'assistant';
  text: string;
  // (the teacher's photos: shown while the app is open — object URLs)
  photos?: string[];
  blocks?: ChatBlock[];
  // (its blocks put on the page already)
  added?: boolean;
}

// A photo as sent: a JPEG, its longer side at most this (a book's page stays readable, the request small)
const PHOTO_SIDE = 1600;
export const MAX_PHOTOS = 5;

/**
 * The page assistant's chats (the API's /ai/chat answers one turn; the chat itself lives here, on
 * the device, a chat per page while the app is open). `send` a message (and photos — a book's page:
 * its tasks made into the page's) with the page as it is now: the answer comes as the next turn;
 * else a toast says why there's none (the day's questions used up, AI off on the server, …).
 */
@Injectable({ providedIn: 'root' })
export class AiChatStore {
  private readonly http = inject(HttpClient);
  private readonly i18n = inject(I18nService);
  private readonly url = `${environment.apiUrl}/ai/chat`;

  private readonly chats = new Map<string, ReturnType<typeof signal<ChatTurn[]>>>();
  readonly busy = signal(false);
  private readonly toasts = inject(Toasts);

  /** The chat about this page (empty to begin with). */
  turns(pageId: string) {
    let chat = this.chats.get(pageId);
    if (!chat) this.chats.set(pageId, (chat = signal<ChatTurn[]>([])));
    return chat;
  }

  async send(pageId: string, message: string, page: string, photos: Blob[]): Promise<void> {
    const text = message.trim();
    if ((!text && !photos.length) || this.busy()) return;
    const chat = this.turns(pageId);
    // (the chat so far as the API takes it: the assistant's blocks with its reply, so it can refer
    // to them; photos sent before: only said, not sent again)
    const history = chat()
      .map((t) => ({
        role: t.role,
        text: [t.text, t.photos?.length ? `(${t.photos.length} photo(s) attached)` : '', ...(t.blocks ?? []).map((b) => b.text)]
          .filter(Boolean)
          .join('\n\n'),
      }))
      .filter((t) => t.text);
    chat.update((turns) => [...turns, { role: 'user', text, photos: photos.map((p) => URL.createObjectURL(p)) }]);
    this.busy.set(true);
    let images: { type: string; data: string }[];
    try {
      images = await Promise.all(photos.slice(0, MAX_PHOTOS).map(asJpeg));
    } catch {
      this.busy.set(false);
      this.toasts.error(this.i18n.t('ai.photoError'));
      return;
    }
    this.http.post<{ reply: string; blocks: ChatBlock[] }>(this.url, { history, message: text, page, images }).subscribe({
      next: (answer) => {
        this.busy.set(false);
        chat.update((turns) => [...turns, { role: 'assistant', text: answer.reply, blocks: answer.blocks }]);
      },
      error: (e: HttpErrorResponse) => {
        this.busy.set(false);
        this.toasts.error(
          e.status === 429
            ? (e.error?.description ?? this.i18n.t('ai.tooMany'))
            : e.status === 503 && e.error?.code === 'Ai.Off'
              ? this.i18n.t('ai.off')
              : this.i18n.t('ai.failed'),
        );
      },
    });
  }

  /** A turn's blocks marked as put on the page. */
  added(pageId: string, turn: ChatTurn): void {
    this.turns(pageId).update((turns) => turns.map((t) => (t === turn ? { ...t, added: true } : t)));
  }

  clear(pageId: string): void {
    const chat = this.turns(pageId);
    for (const t of chat()) t.photos?.forEach((u) => URL.revokeObjectURL(u));
    chat.set([]);
  }
}

// A photo as the API takes it: a JPEG (its longer side at most PHOTO_SIDE), base64
async function asJpeg(photo: Blob): Promise<{ type: string; data: string }> {
  const bitmap = await createImageBitmap(photo);
  const scale = Math.min(1, PHOTO_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const url = canvas.toDataURL('image/jpeg', 0.85);
  return { type: 'image/jpeg', data: url.slice(url.indexOf(',') + 1) };
}
