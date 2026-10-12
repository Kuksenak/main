import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, afterNextRender, inject, model, signal, viewChild } from '@angular/core';
import { environment } from '@environments/environment';
import { firstValueFrom } from 'rxjs';
import { DeviceDetectionService } from '../core/services/device-detection.service';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { TranslationKey } from '../core/i18n/translations';
import { Icon, IconName } from '../core/ui/icon/icon';
import { LessonBlock, LessonBlockKind, LessonInput } from './lesson.service';

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

/** Something typed in a link's address that isn't a web link. */
function badLink(b: LessonBlock): boolean {
  return b.kind === 'link' && !!b.url?.trim() && !normalizeUrl(b.url);
}

/** A photo as a JPEG at most 2000 px on its longer side (turned upright from its EXIF). */
async function toJpeg(file: File): Promise<Blob> {
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

/** Ready to save: has a title and no broken link. */
export function lessonValid(l: LessonInput): boolean {
  return !!l.title.trim() && !l.blocks.some(badLink);
}

// Trimmed, the empty ones dropped
function lines(list: string[] | null | undefined): string[] {
  return (list ?? []).map((x) => x.trim()).filter((x) => !!x);
}

/**
 * What gets saved: trimmed, links completed; empty items / answers dropped (the right answer kept
 * on its option); empty blocks dropped (an exercise needs a question and two answers).
 */
export function cleanLesson(l: LessonInput): LessonInput {
  const blocks: LessonBlock[] = [];
  for (const b of l.blocks) {
    const text = b.text?.trim() || null;
    const base = { kind: b.kind, text, url: null, private: !!b.private };
    switch (b.kind) {
      case 'checklist': {
        const items = lines(b.items);
        if (items.length) blocks.push({ ...base, text: null, items });
        break;
      }
      case 'exercise': {
        const raw = b.options ?? [];
        const options = lines(raw);
        const answer =
          b.answer != null && raw[b.answer]?.trim() ? raw.slice(0, b.answer).filter((x) => x.trim()).length : null;
        if (text && options.length >= 2) blocks.push({ ...base, options, answer });
        break;
      }
      case 'link': {
        const url = normalizeUrl(b.url);
        if (url) blocks.push({ ...base, url });
        break;
      }
      default:
        if (text) blocks.push(base);
    }
  }
  return { title: l.title.trim(), blocks };
}

/**
 * Editing a lesson in place: the title, then the blocks — each a card with its kind, who sees it
 * (students / only me: a tap switches), its drag handle and ×: texts, checklists (items), exercises
 * (a question, answers, the right one marked by its circle); older lessons' headings and links
 * too. + Text / Exercise / Checklist at the end, and From photo: pages of a book read by the
 * server's AI into blocks added at the end (a title too, if there's none yet) — to check and fix.
 */
@Component({
  selector: 'app-lesson-form',
  imports: [CdkDrag, CdkDragHandle, CdkDropList, FormsModule, Icon, TranslatePipe],
  host: { class: 'flex flex-col gap-5' },
  template: `
    @let m = value();
    <div class="card">
      <div class="list-row">
        <input #titleInput name="title" [ngModel]="m.title" (ngModelChange)="patch({ title: $event })" type="text" [placeholder]="'lessons.name' | t" autocomplete="off" class="row-input font-semibold" />
      </div>
    </div>

    <!-- Blocks, reordered by dragging their handle -->
    <div cdkDropList cdkDropListLockAxis="y" (cdkDropListDropped)="move($event)" class="flex flex-col gap-4">
    @for (b of m.blocks; track $index; let i = $index) {
      <div cdkDrag class="card">
        <!-- Head: ⠿ · kind · who sees it · × -->
        <div class="list-row !min-h-0 gap-2 pb-1 pt-2.5 after:hidden">
          <span cdkDragHandle class="-ml-1 flex shrink-0 cursor-grab touch-none items-center text-[var(--text-secondary)] active:cursor-grabbing" [attr.aria-label]="'lessons.move' | t">
            <app-icon name="grip" class="size-5" />
          </span>
          <span class="text-footnote flex flex-1 items-center gap-1.5 font-semibold">
            <app-icon [name]="kindIcon(b.kind)" class="size-4 opacity-70" />{{ kindLabel(b.kind) | t }}
          </span>
          <button type="button" (click)="setBlock(i, { private: !b.private })" class="text-footnote flex items-center gap-1 rounded-full px-2 py-1 opacity-60 hover:bg-[var(--highlight)]">
            <app-icon [name]="b.private ? 'lock' : 'eye'" class="size-3.5" />{{ (b.private ? 'lessons.onlyMe' : 'lessons.studentsSee') | t }}
          </button>
          <button type="button" (click)="removeBlock(i)" [attr.aria-label]="'lessons.removeBlock' | t" class="icon-plain -mr-2">
            <app-icon name="close" class="size-5" />
          </button>
        </div>

        @switch (b.kind) {
          @case ('checklist') {
            @for (item of b.items ?? []; track $index; let j = $index) {
              <div class="list-row">
                <span class="check"></span>
                <input [ngModel]="item" (ngModelChange)="setItem(i, 'items', j, $event)" type="text" [placeholder]="'lessons.item' | t" autocomplete="off" class="row-input" />
                <button type="button" (click)="removeItem(i, 'items', j)" [attr.aria-label]="'lessons.removeBlock' | t" class="icon-plain -mr-2">
                  <app-icon name="close" class="size-4" />
                </button>
              </div>
            }
            <button type="button" (click)="addItem(i, 'items')" class="list-row add-row">
              <span class="flex items-center gap-2"><app-icon name="plus" class="size-5" />{{ 'lessons.item' | t }}</span>
            </button>
          }
          @case ('exercise') {
            <div class="list-row">
              <input [ngModel]="b.text" (ngModelChange)="setBlock(i, { text: $event })" type="text" [placeholder]="'lessons.question' | t" autocomplete="off" class="row-input font-medium" />
            </div>
            @for (o of b.options ?? []; track $index; let j = $index) {
              <div class="list-row">
                <!-- The circle marks the right answer -->
                <button type="button" (click)="setBlock(i, { answer: b.answer === j ? null : j })" class="check" [class.is-on]="b.answer === j" [attr.aria-label]="'lessons.right' | t">
                  @if (b.answer === j) {
                    <app-icon name="check" [strokeWidth]="3" class="size-3.5" />
                  }
                </button>
                <input [ngModel]="o" (ngModelChange)="setItem(i, 'options', j, $event)" type="text" [placeholder]="'lessons.option' | t" autocomplete="off" class="row-input" />
                <button type="button" (click)="removeItem(i, 'options', j)" [attr.aria-label]="'lessons.removeBlock' | t" class="icon-plain -mr-2">
                  <app-icon name="close" class="size-4" />
                </button>
              </div>
            }
            <button type="button" (click)="addItem(i, 'options')" class="list-row add-row">
              <span class="flex items-center gap-2"><app-icon name="plus" class="size-5" />{{ 'lessons.option' | t }}</span>
            </button>
          }
          @case ('link') {
            <div class="list-row">
              <app-icon name="link" class="size-5 opacity-40" />
              <input [ngModel]="b.url" (ngModelChange)="setBlock(i, { url: $event })" type="url" inputmode="url" placeholder="https://…" autocomplete="off" class="row-input" [class.text-[var(--warning)]]="badLink(b)" />
            </div>
            <div class="list-row">
              <input [ngModel]="b.text" (ngModelChange)="setBlock(i, { text: $event })" type="text" [placeholder]="'lessons.linkLabel' | t" autocomplete="off" class="row-input" />
            </div>
          }
          @case ('heading') {
            <div class="list-row">
              <input [ngModel]="b.text" (ngModelChange)="setBlock(i, { text: $event })" type="text" [placeholder]="'lessons.heading' | t" autocomplete="off" class="row-input text-xl font-semibold" />
            </div>
          }
          @default {
            <div class="list-row items-start pb-3 pt-1">
              <textarea [ngModel]="b.text" (ngModelChange)="setBlock(i, { text: $event })" rows="5" [placeholder]="'lessons.text' | t" class="row-input resize-y leading-relaxed"></textarea>
            </div>
          }
        }
      </div>
    }
    </div>

    <!-- Add at the end -->
    <div class="flex flex-wrap justify-center gap-2">
      @for (k of kinds; track k.kind) {
        <button type="button" (click)="add(k.kind)" class="chip gap-1.5 !rounded-full">
          <app-icon name="plus" class="size-4 text-[var(--accent)]" />{{ k.label | t }}
        </button>
      }
      <!-- Pages of a book (camera or library on phones) → blocks -->
      <button type="button" (click)="photoInput.click()" [disabled]="reading()" class="chip gap-1.5 !rounded-full" [class.opacity-60]="reading()">
        @if (reading()) {
          <span class="size-4 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent"></span>{{ 'lessons.reading' | t }}
        } @else {
          <app-icon name="image" class="size-4 text-[var(--accent)]" />{{ 'lessons.fromPhoto' | t }}
        }
      </button>
      <input #photoInput type="file" accept="image/*" multiple hidden (change)="fromPhotos(photoInput)" />
    </div>
    @if (photoError(); as e) {
      <p class="text-footnote -mt-2 text-center text-[var(--danger)]">{{ e | t }}</p>
    }
  `,
})
export class LessonForm {
  readonly value = model.required<LessonInput>();

  // Editing starts in the title (desktop; on phones the keyboard would cover the form).
  private readonly titleInput = viewChild<ElementRef<HTMLInputElement>>('titleInput');
  constructor() {
    const desktop = !inject(DeviceDetectionService).isMobile();
    afterNextRender(() => {
      if (desktop) this.titleInput()?.nativeElement.focus({ preventScroll: true });
    });
  }

  protected readonly badLink = badLink;

  private http = inject(HttpClient);
  protected readonly reading = signal(false);
  protected readonly photoError = signal<TranslationKey | null>(null);

  // Up to 5 pages, sent as JPEGs no larger than 2000 px (phone photos are huge; HEIC → JPEG)
  protected async fromPhotos(input: HTMLInputElement): Promise<void> {
    const files = [...(input.files ?? [])].slice(0, 5);
    input.value = ''; // the same photo again later still fires (change)
    if (!files.length) return;
    this.reading.set(true);
    this.photoError.set(null);
    try {
      const form = new FormData();
      for (const [i, f] of files.entries()) form.append('images', await toJpeg(f), `page-${i + 1}.jpg`);
      const draft = await firstValueFrom(
        this.http.post<{ title: string; blocks: LessonBlock[] }>(`${environment.apiUrl}/lessons/from-photo`, form),
      );
      if (!draft.blocks.length) {
        this.photoError.set('lessons.photoEmpty');
        return;
      }
      this.value.update((m) => ({ title: m.title.trim() ? m.title : draft.title, blocks: [...m.blocks, ...draft.blocks] }));
    } catch (e) {
      this.photoError.set(
        e instanceof HttpErrorResponse && e.status === 503 ? 'lessons.photoOff' : 'lessons.photoFailed',
      );
    } finally {
      this.reading.set(false);
    }
  }

  // Block kinds to add (headings and links only in older lessons)
  protected readonly kinds: { kind: LessonBlockKind; icon: IconName; label: TranslationKey }[] = [
    { kind: 'text', icon: 'text', label: 'lessons.text' },
    { kind: 'exercise', icon: 'exercise', label: 'lessons.exercise' },
    { kind: 'checklist', icon: 'checklist', label: 'lessons.checklist' },
  ];
  private static readonly ALL: Record<LessonBlockKind, { icon: IconName; label: TranslationKey }> = {
    text: { icon: 'text', label: 'lessons.text' },
    exercise: { icon: 'exercise', label: 'lessons.exercise' },
    checklist: { icon: 'checklist', label: 'lessons.checklist' },
    heading: { icon: 'heading', label: 'lessons.heading' },
    link: { icon: 'link', label: 'lessons.link' },
  };
  protected kindIcon(kind: LessonBlockKind): IconName {
    return LessonForm.ALL[kind]?.icon ?? 'text';
  }
  protected kindLabel(kind: LessonBlockKind): TranslationKey {
    return LessonForm.ALL[kind]?.label ?? 'lessons.text';
  }

  protected patch(p: Partial<LessonInput>): void {
    this.value.update((m) => ({ ...m, ...p }));
  }

  protected setBlock(index: number, p: Partial<LessonBlock>): void {
    this.value.update((m) => ({ ...m, blocks: m.blocks.map((b, i) => (i === index ? { ...b, ...p } : b)) }));
  }

  // A checklist's items / an exercise's answers
  protected setItem(index: number, list: 'items' | 'options', at: number, text: string): void {
    const b = this.value().blocks[index];
    this.setBlock(index, { [list]: (b[list] ?? []).map((x, j) => (j === at ? text : x)) });
  }

  protected addItem(index: number, list: 'items' | 'options'): void {
    const b = this.value().blocks[index];
    this.setBlock(index, { [list]: [...(b[list] ?? []), ''] });
  }

  protected removeItem(index: number, list: 'items' | 'options', at: number): void {
    const b = this.value().blocks[index];
    const p: Partial<LessonBlock> = { [list]: (b[list] ?? []).filter((_, j) => j !== at) };
    // The right answer stays on its option
    if (list === 'options' && b.answer != null) p.answer = b.answer === at ? null : b.answer > at ? b.answer - 1 : b.answer;
    this.setBlock(index, p);
  }

  protected move(e: CdkDragDrop<unknown>): void {
    if (e.previousIndex === e.currentIndex) return;
    this.value.update((m) => {
      const blocks = [...m.blocks];
      moveItemInArray(blocks, e.previousIndex, e.currentIndex);
      return { ...m, blocks };
    });
  }

  // A new block at the end: a checklist is the teacher's plan by default; an exercise starts with
  // two empty answers, a checklist with one item.
  protected add(kind: LessonBlockKind): void {
    const block: LessonBlock = {
      kind,
      text: null,
      url: null,
      private: kind === 'checklist',
      items: kind === 'checklist' ? [''] : null,
      options: kind === 'exercise' ? ['', ''] : null,
      answer: null,
    };
    this.value.update((m) => ({ ...m, blocks: [...m.blocks, block] }));
  }

  protected removeBlock(index: number): void {
    this.value.update((m) => ({ ...m, blocks: m.blocks.filter((_, i) => i !== index) }));
  }
}
