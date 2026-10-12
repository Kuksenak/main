import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { environment } from '@environments/environment';
import { firstValueFrom } from 'rxjs';
import { NotificationsService } from '../core/services/notifications.service';
import { LessonBlock, LessonService } from './lesson.service';

/** What the model made of the photos: the draft, its raw answer, which model, how long. */
export interface LessonDraft {
  title: string;
  blocks: LessonBlock[];
  raw: unknown;
  model: string;
  seconds: number;
}

/** Photos being read into a lesson, in the background. */
export interface LessonImport {
  id: string;
  lessonId: string | null; // the lesson it's for (null: a new one)
  model: string;
  pages: number;
  status: 'queued' | 'running' | 'done' | 'failed';
  error: string | null;
  createdAt: string;
  draft?: LessonDraft | null;
}

/** An open lesson editor taking a draft into its lesson (true: taken). */
type Taker = (lessonId: string | null, title: string, blocks: LessonBlock[]) => boolean;

/** A photo as a JPEG at most 2000 px on its longer side (turned upright from its EXIF). */
export async function toJpeg(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('no image'))), 'image/jpeg', 0.85),
  );
}

/**
 * Lessons from photos, read in the background: start() sends the pages and returns at once; the
 * server reads them and says so (a notification — "ready", a tap previews); meanwhile the list
 * is polled too, in case the live connection is down. preview() opens one (the preview sheet in
 * the layout): edit, then add() — into the lesson's open editor if there is one, else saved into
 * the lesson right away (a new lesson without one) — or drop().
 */
@Injectable({ providedIn: 'root' })
export class LessonImportsService {
  private http = inject(HttpClient);
  private lessons = inject(LessonService);
  private base = `${environment.apiUrl}/lesson-imports`;

  readonly imports = signal<LessonImport[]>([]);
  /** The one being previewed. */
  readonly previewing = signal<string | null>(null);
  readonly waiting = computed(() => this.imports().some((x) => x.status === 'queued' || x.status === 'running'));

  // The models one may pick (the server's default first; the last one picked remembered)
  readonly models = signal<string[]>([]);
  readonly model = signal<string | null>(null);
  private static readonly MODEL_KEY = 'lessons.photoModel';

  private takers = new Set<Taker>();
  private poll?: ReturnType<typeof setInterval>;
  private loaded = false;

  constructor() {
    inject(NotificationsService).received.subscribe((n) => {
      if (n.kind === 'lessonImport') this.load();
    });
  }

  /** The list and the models, once (the editor asks when it opens). */
  ensureLoaded(): void {
    if (this.loaded) return;
    this.loaded = true;
    this.load();
    this.http
      .get<{ models: string[]; defaultModel: string | null }>(`${environment.apiUrl}/lessons/from-photo/models`)
      .subscribe({
        next: (res) => {
          let saved: string | null = null;
          try {
            saved = localStorage.getItem(LessonImportsService.MODEL_KEY);
          } catch {}
          this.models.set(res.models ?? []);
          this.model.set(saved && res.models.includes(saved) ? saved : res.defaultModel);
        },
        error: () => {},
      });
  }

  pickModel(id: string): void {
    this.model.set(id);
    try {
      localStorage.setItem(LessonImportsService.MODEL_KEY, id);
    } catch {}
  }

  load(): void {
    this.http.get<{ imports: LessonImport[] }>(this.base).subscribe({
      next: (res) => {
        this.imports.set(res.imports ?? []);
        // While something is being read: a look every 5 s (the notification may not come through)
        clearInterval(this.poll);
        if (this.waiting()) this.poll = setInterval(() => this.load(), 5000);
      },
      error: () => {},
    });
  }

  /** Sends up to 5 pages to be read (as JPEGs); throws the reason when the server says no. */
  async start(files: Blob[], lessonId: string | null): Promise<void> {
    const form = new FormData();
    for (const [i, f] of files.slice(0, 5).entries()) {
      const jpeg = await toJpeg(f).catch(() => {
        throw new Error(`can't open ${(f as File).name ?? 'the image'} (${f.type || 'unknown type'})`);
      });
      form.append('images', jpeg, `page-${i + 1}.jpg`);
    }
    const model = this.model();
    if (model) form.append('model', model);
    if (lessonId) form.append('lessonId', lessonId);
    try {
      const created = await firstValueFrom(this.http.post<LessonImport>(`${environment.apiUrl}/lessons/from-photo`, form));
      this.imports.update((list) => [created, ...list]);
      this.load();
    } catch (e) {
      if (e instanceof HttpErrorResponse) {
        throw Object.assign(new Error(e.error?.detail ?? e.error?.description ?? e.statusText ?? ''), { status: e.status });
      }
      throw e;
    }
  }

  /** One with its draft. */
  get(id: string): Promise<LessonImport> {
    return firstValueFrom(this.http.get<LessonImport>(`${this.base}/${id}`));
  }

  preview(id: string): void {
    this.previewing.set(id);
  }

  /** An open editor offers to take drafts for its lesson (until the returned function is called). */
  take(taker: Taker): () => void {
    this.takers.add(taker);
    return () => this.takers.delete(taker);
  }

  /** Blocks at the end of a lesson: into its open editor if there is one, else saved into it. */
  addTo(lessonId: string, blocks: LessonBlock[]): void {
    const lesson = this.lessons.byId(lessonId);
    const taken = [...this.takers].some((t) => t(lessonId, lesson?.title ?? '', blocks));
    if (!taken && lesson) this.lessons.update(lesson.id, { title: lesson.title, blocks: [...lesson.blocks, ...blocks] });
  }

  /** Blocks as a new lesson (`created` gets its id). */
  addAsNew(title: string, blocks: LessonBlock[], created?: (id: string) => void): void {
    this.lessons.create({ title: title.trim() || 'Lesson', blocks }, created);
  }

  drop(id: string): void {
    this.imports.update((list) => list.filter((x) => x.id !== id));
    if (this.previewing() === id) this.previewing.set(null);
    this.http.delete(`${this.base}/${id}`).subscribe({ error: () => {} });
  }
}
