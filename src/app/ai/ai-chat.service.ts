import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from '@environments/environment';
import { firstValueFrom } from 'rxjs';
import { NotificationsService } from '../core/services/notifications.service';
import { LessonDraft, LessonImportsService, toJpeg } from '../lessons/lesson-imports.service';

/** A message of the AI chat: the teacher's (text, pictures) or the AI's (its reply and the blocks it made). */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  images?: string[]; // the teacher's pictures (this visit only: object URLs)
  imageCount?: number;
  draft?: LessonDraft | null;
  error?: string;
}

const KEY = 'ai.chat';

/**
 * The AI chat: one conversation, kept on this device (New chat clears it). send() asks the
 * server (/ai/chat) with the chat so far; the answer arrives here even when the page was left
 * meanwhile (a banner says so then; a tap comes back).
 */
@Injectable({ providedIn: 'root' })
export class AiChatService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private notifications = inject(NotificationsService);
  private imports = inject(LessonImportsService);

  readonly messages = signal<ChatMessage[]>(this.restore());
  readonly pending = signal(false);

  async send(text: string, files: Blob[]): Promise<void> {
    if (this.pending() || (!text.trim() && !files.length)) return;
    const before = this.messages();
    const mine: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      text: text.trim(),
      images: files.map((f) => URL.createObjectURL(f)),
      imageCount: files.length,
    };
    this.messages.set([...before, mine]);
    this.save();
    this.pending.set(true);

    let answer: ChatMessage;
    try {
      const form = new FormData();
      form.append('message', mine.text);
      form.append('history', JSON.stringify(before.filter((m) => !m.error).map((m) => ({ role: m.role, text: this.asText(m) }))));
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
    this.messages.update((list) => [...list, answer]);
    this.save();
    this.pending.set(false);

    // Elsewhere in the app meanwhile: a banner (a tap comes back here)
    if (!this.router.url.startsWith('/ai')) {
      this.notifications.show({
        kind: 'ai',
        title: answer.error ? 'AI: something went wrong' : 'AI answered',
        body: (answer.error ?? answer.text).slice(0, 140),
        url: '/ai',
      });
    }
  }

  clear(): void {
    for (const m of this.messages()) m.images?.forEach((u) => URL.revokeObjectURL(u));
    this.messages.set([]);
    this.save();
  }

  // What the model is told of a message: the teacher's text; the AI's reply and its blocks
  private asText(m: ChatMessage): string {
    if (m.role === 'user') return (m.text || '') + (m.imageCount ? `\n(${m.imageCount} photo(s) were attached)` : '');
    const blocks = (m.draft?.blocks ?? [])
      .map((b) => `[${b.kind}] ${b.text ?? [...(b.items ?? []), ...(b.options ?? [])].join('; ')}`)
      .join('\n');
    return `${m.text}\n${blocks}`.trim().slice(0, 6000);
  }

  // Kept on this device (without the pictures; the model's raw answer left out)
  private save(): void {
    try {
      const kept = this.messages().map(({ images, draft, ...m }) => ({ ...m, draft: draft ? { ...draft, raw: null } : draft }));
      localStorage.setItem(KEY, JSON.stringify(kept));
    } catch {}
  }

  private restore(): ChatMessage[] {
    try {
      return JSON.parse(localStorage.getItem(KEY) ?? '[]') as ChatMessage[];
    } catch {
      return [];
    }
  }
}
