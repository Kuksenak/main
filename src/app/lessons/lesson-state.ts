import { computed, inject, signal } from '@angular/core';
import { I18nService } from '../core/i18n/i18n.service';
import { cleanLesson, lessonValid } from './lesson-form';
import { LessonInput, LessonService } from './lesson.service';

/**
 * Reading / editing one lesson, shared by the lesson card (mobile) and the lesson page
 * (desktop). Create it in a component field: `state = new LessonState(() => this.id())` —
 * id null = a new lesson, edited from the start.
 */
export class LessonState {
  private lessons = inject(LessonService);
  private i18n = inject(I18nService);

  // The lesson shown: the given one, or the one just created here.
  private readonly createdId = signal<string | null>(null);
  readonly id = computed(() => this.givenId() ?? this.createdId());
  readonly lesson = computed(() => this.lessons.byId(this.id()));

  // Editing: from the start for a new lesson; the draft and what it started from.
  private readonly editRequested = signal(false);
  readonly editing = computed(() => !this.id() || this.editRequested());
  readonly draft = signal<LessonInput>({ title: '', blocks: [] });
  private readonly snapshot = signal(JSON.stringify(this.draft()));
  readonly dirty = computed(() => JSON.stringify(this.draft()) !== this.snapshot());
  readonly canSave = computed(() => lessonValid(this.draft()) && this.dirty());

  readonly heading = computed(() => {
    if (this.editing()) return this.draft().title.trim() || this.i18n.t('lessons.new');
    return this.lesson()?.title ?? '';
  });

  constructor(private readonly givenId: () => string | null) {}

  edit(): void {
    const l = this.lesson();
    if (!l) return;
    this.draft.set({ title: l.title, blocks: l.blocks.map((b) => ({ ...b })) });
    this.snapshot.set(JSON.stringify(this.draft()));
    this.editRequested.set(true);
  }

  /** Leave editing without saving (back to reading). */
  cancelEdit(): void {
    this.editRequested.set(false);
  }

  /** Save; `onCreated` gets a new lesson's id. Back to reading. */
  save(onCreated?: (id: string) => void): void {
    if (!this.canSave()) return;
    const input = cleanLesson(this.draft());
    const id = this.id();
    if (id) this.lessons.update(id, input);
    else
      this.lessons.create(input, (newId) => {
        this.createdId.set(newId);
        onCreated?.(newId);
      });
    this.editRequested.set(false);
  }

  remove(): void {
    const id = this.id();
    if (id) this.lessons.remove(id);
  }
}
