import { Component, OnInit, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { StackEntry } from '../core/services/nav-stack.service';
import { Icon } from '../core/ui/icon/icon';
import { PageSheet } from '../core/ui/page-sheet/page-sheet';
import { LessonBlock, LessonBlockKind, LessonInput, LessonService } from '../lessons/lesson.service';
import { EventList } from './event-list';

/** A link as typed: "example.com/x" → "https://example.com/x"; null when it isn't a web link. */
function normalizeUrl(value: string | null): string | null {
  const v = (value ?? '').trim();
  if (!v) return null;
  try {
    const url = new URL(/^[a-z][a-z\d+.-]*:/i.test(v) ? v : `https://${v}`);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

/** Lesson card (new or existing), opened on the NavStack: title, texts and links, its events. */
@Component({
  selector: 'app-lesson-editor',
  imports: [FormsModule, EventList, Icon, PageSheet, TranslatePipe],
  template: `
    @let m = model();
    <app-page-sheet
      #page
      [title]="(entry().id ? 'lessons.edit' : 'lessons.new') | t"
      [dirty]="dirty()"
      [canSave]="canSave()"
      [deletable]="!!entry().id"
      (save)="save()"
      (delete)="remove()"
      (closed)="closed.emit()"
    >
      <div class="flex flex-col gap-6">
        <div class="card">
          <div class="list-row">
            <input name="title" [ngModel]="m.title" (ngModelChange)="patch({ title: $event })" type="text" [placeholder]="'lessons.name' | t" autocomplete="off" class="row-input" />
          </div>
        </div>

        <!-- Content blocks, in order; × removes one -->
        @for (b of m.blocks; track $index; let i = $index) {
          <div class="card">
            @if (b.kind === 'link') {
              <div class="list-row">
                <app-icon name="link" class="size-5 opacity-40" />
                <input
                  [ngModel]="b.url"
                  (ngModelChange)="setBlock(i, { url: $event })"
                  type="url"
                  inputmode="url"
                  placeholder="https://…"
                  autocomplete="off"
                  class="row-input"
                  [class.text-[var(--warning)]]="badLink(b)"
                />
                <button type="button" (click)="removeBlock(i)" [attr.aria-label]="'lessons.removeBlock' | t" class="icon-plain -mr-2">
                  <app-icon name="close" class="size-5" />
                </button>
              </div>
              <div class="list-row">
                <input [ngModel]="b.text" (ngModelChange)="setBlock(i, { text: $event })" type="text" [placeholder]="'lessons.linkLabel' | t" autocomplete="off" class="row-input" />
              </div>
            } @else {
              <div class="list-row items-start py-3 desktop:py-2">
                <textarea
                  [ngModel]="b.text"
                  (ngModelChange)="setBlock(i, { text: $event })"
                  rows="4"
                  [placeholder]="'lessons.text' | t"
                  class="row-input resize-y leading-snug"
                ></textarea>
                <button type="button" (click)="removeBlock(i)" [attr.aria-label]="'lessons.removeBlock' | t" class="icon-plain -mr-2 -mt-1">
                  <app-icon name="close" class="size-5" />
                </button>
              </div>
            }
          </div>
        }

        <div class="card">
          <button type="button" (click)="addBlock('text')" class="list-row w-full text-left text-[var(--accent)]">
            <app-icon name="text" class="size-5" />
            <span class="flex-1">{{ 'lessons.addText' | t }}</span>
          </button>
          <button type="button" (click)="addBlock('link')" class="list-row w-full text-left text-[var(--accent)]">
            <app-icon name="link" class="size-5" />
            <span class="flex-1">{{ 'lessons.addLink' | t }}</span>
          </button>
        </div>

        @if (entry().id; as id) {
          <app-event-list [lessonId]="id" />
        }
      </div>
    </app-page-sheet>
  `,
})
export class LessonEditor implements OnInit {
  readonly entry = input.required<StackEntry>();
  readonly closed = output<void>();

  private lessons = inject(LessonService);
  private readonly page = viewChild.required<PageSheet>('page');

  protected readonly model = signal<LessonInput>({ title: '', blocks: [] });
  private readonly snapshot = signal(''); // contents when opened, to tell whether anything changed

  protected readonly dirty = computed(() => JSON.stringify(this.model()) !== this.snapshot());
  protected readonly canSave = computed(() => {
    const m = this.model();
    return !!m.title.trim() && !m.blocks.some((b) => this.badLink(b)) && this.dirty();
  });

  ngOnInit(): void {
    const lesson = this.lessons.byId(this.entry().id);
    if (lesson) this.model.set({ title: lesson.title, blocks: lesson.blocks.map((b) => ({ ...b })) });
    this.snapshot.set(JSON.stringify(this.model()));
  }

  protected patch(p: Partial<LessonInput>): void {
    this.model.update((m) => ({ ...m, ...p }));
  }

  protected setBlock(index: number, p: Partial<LessonBlock>): void {
    this.model.update((m) => ({ ...m, blocks: m.blocks.map((b, i) => (i === index ? { ...b, ...p } : b)) }));
  }

  protected addBlock(kind: LessonBlockKind): void {
    this.model.update((m) => ({ ...m, blocks: [...m.blocks, { kind, text: null, url: null }] }));
  }

  protected removeBlock(index: number): void {
    this.model.update((m) => ({ ...m, blocks: m.blocks.filter((_, i) => i !== index) }));
  }

  // Something typed in a link's address that isn't a web link.
  protected badLink(b: LessonBlock): boolean {
    return b.kind === 'link' && !!b.url?.trim() && !normalizeUrl(b.url);
  }

  protected save(): void {
    if (!this.canSave()) return;
    const m = this.model();
    const input: LessonInput = {
      title: m.title.trim(),
      blocks: m.blocks
        .map((b) => ({ kind: b.kind, text: b.text?.trim() || null, url: b.kind === 'link' ? normalizeUrl(b.url) : null }))
        .filter((b) => (b.kind === 'link' ? !!b.url : !!b.text)),
    };
    const id = this.entry().id;
    if (id) this.lessons.update(id, input);
    else this.lessons.create(input);
    this.page().close();
  }

  protected remove(): void {
    const id = this.entry().id;
    if (!id) return;
    this.lessons.remove(id);
    this.page().close();
  }
}
