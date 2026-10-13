import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { environment } from '@environments/environment';
import { firstValueFrom } from 'rxjs';
import { NotificationsService } from '../core/services/notifications.service';
import { LessonDraft, LessonImportsService, toJpeg } from '../lessons/lesson-imports.service';
import { LessonBlock, LessonInput } from '../lessons/lesson.service';

/** A message of an AI chat: the teacher's (text, pictures) or the AI's (its reply and the blocks it made). */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  images?: string[]; // the teacher's pictures (this visit only: object URLs)
  imageCount?: number;
  draft?: LessonDraft | null;
  error?: string;
}

/**
 * The lesson editor's assistant chats: one per lesson (its id; 'new' for a lesson not saved yet),
 * for as long as its editor is open (closing the assistant keeps it; leaving the lesson clears
 * it). send() asks the server (/ai/chat) with the chat so far and the lesson as it is; the answer
 * arrives even when the assistant was closed meanwhile (a banner says so then) — not once the
 * chat was cleared.
 */
@Injectable({ providedIn: 'root' })
export class AiChatService {
  private http = inject(HttpClient);
  private notifications = inject(NotificationsService);
  private imports = inject(LessonImportsService);

  private readonly chats = signal<Record<string, ChatMessage[]>>({});
  /** The chat waiting for its answer (one at a time). */
  readonly pending = signal<string | null>(null);
  /** The chats open on screen now (an answer for another one gets a banner). */
  readonly open = new Set<string>();

  messages(key: string): ChatMessage[] {
    return this.chats()[key] ?? [];
  }

  async send(key: string, text: string, files: Blob[], lesson: LessonInput): Promise<void> {
    if (this.pending() || (!text.trim() && !files.length)) return;
    const before = this.messages(key);
    const mine: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      text: text.trim(),
      images: files.map((f) => URL.createObjectURL(f)),
      imageCount: files.length,
    };
    this.set(key, [...before, mine]);
    this.pending.set(key);

    let answer: ChatMessage;
    try {
      const form = new FormData();
      form.append('message', mine.text);
      form.append('history', JSON.stringify(before.filter((m) => !m.error).map((m) => ({ role: m.role, text: this.asText(m) }))));
      form.append('lesson', `${lesson.title}\n${blocksAsText(lesson.blocks)}`.trim());
      for (const [i, f] of files.slice(0, 5).entries()) form.append('images', await toJpeg(f), `image-${i + 1}.jpg`);
      const model = this.imports.model();
      if (model) form.append('model', model);
      const draft = await firstValueFrom(this.http.post<LessonDraft & { reply: string | null }>(`${environment.apiUrl}/ai/chat`, form));
      answer = { id: crypto.randomUUID(), role: 'assistant', text: draft.reply ?? '', draft };
    } catch (e) {
      const reason =
        e instanceof HttpErrorResponse
          ? `${e.status || 'network'}: ${e.error?.detail ?? e.error?.description ?? e.statusText ?? ''}`
          : e instanceof Error
            ? e.message
            : String(e);
      answer = { id: crypto.randomUUID(), role: 'assistant', text: '', error: reason.slice(0, 400) };
    }
    this.pending.set(null);
    // Its chat cleared meanwhile (the lesson was left): the answer goes nowhere
    if (!this.messages(key).some((m) => m.id === mine.id)) return;
    this.set(key, [...this.messages(key), answer]);

    // Its chat closed meanwhile: a banner (a tap opens the lesson)
    if (!this.open.has(key)) {
      this.notifications.show({
        kind: 'ai',
        title: answer.error ? 'AI: something went wrong' : 'AI answered',
        body: (answer.error ?? answer.text).slice(0, 140),
        url: key === 'new' ? '/lessons' : `/lessons/${key}`,
      });
    }
  }

  clear(key: string): void {
    for (const m of this.messages(key)) m.images?.forEach((u) => URL.revokeObjectURL(u));
    this.set(key, []);
  }

  private set(key: string, messages: ChatMessage[]): void {
    this.chats.update((all) => {
      const next = { ...all };
      if (messages.length) next[key] = messages;
      else delete next[key];
      return next;
    });
  }

  // What the model is told of a message: the teacher's text; the AI's reply and its blocks
  private asText(m: ChatMessage): string {
    if (m.role === 'user') return (m.text || '') + (m.imageCount ? `\n(${m.imageCount} photo(s) were attached)` : '');
    return `${m.text}\n${blocksAsText(m.draft?.blocks ?? [])}`.trim().slice(0, 6000);
  }
}

/** Blocks as plain text, for the model: "[gaps] …", one per line. */
function blocksAsText(blocks: LessonBlock[]): string {
  return blocks
    .map((b) => `[${b.kind}] ${b.instruction ? b.instruction + '\n' : ''}${b.text ?? [...(b.items ?? []), ...(b.options ?? [])].join('; ')}`)
    .join('\n');
}
