import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { Component, ElementRef, afterNextRender, inject, model, signal, viewChild } from '@angular/core';
import { DeviceDetectionService } from '../core/services/device-detection.service';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { TranslationKey } from '../core/i18n/translations';
import { Icon, IconName } from '../core/ui/icon/icon';
import { Sheet } from '../core/ui/sheet/sheet';
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

/** Ready to save: has a title and no broken link. */
export function lessonValid(l: LessonInput): boolean {
  return !!l.title.trim() && !l.blocks.some(badLink);
}

/** What gets saved: trimmed, links completed, empty blocks dropped. */
export function cleanLesson(l: LessonInput): LessonInput {
  return {
    title: l.title.trim(),
    blocks: l.blocks
      .map((b) => ({ kind: b.kind, text: b.text?.trim() || null, url: b.kind === 'link' ? normalizeUrl(b.url) : null }))
      .filter((b) => (b.kind === 'link' ? !!b.url : !!b.text)),
  };
}

/**
 * Editing a lesson in place: title, then the blocks (headings, texts, links; × removes one).
 * Add block (at the end) opens the list of kinds; blocks are reordered by dragging their handle.
 */
@Component({
  selector: 'app-lesson-form',
  imports: [CdkDrag, CdkDragHandle, CdkDropList, FormsModule, Icon, Sheet, TranslatePipe],
  host: { class: 'flex flex-col gap-6' },
  template: `
    @let m = value();
    <div class="card">
      <div class="list-row">
        <input #titleInput name="title" [ngModel]="m.title" (ngModelChange)="patch({ title: $event })" type="text" [placeholder]="'lessons.name' | t" autocomplete="off" class="row-input font-semibold" />
      </div>
    </div>

    <!-- Blocks, reordered by dragging their handle -->
    <div cdkDropList cdkDropListLockAxis="y" (cdkDropListDropped)="move($event)" class="flex flex-col gap-6">
    @for (b of m.blocks; track $index; let i = $index) {
      <div cdkDrag class="card">
        @if (b.kind === 'link') {
          <div class="list-row">
            <span cdkDragHandle class="-ml-1 flex shrink-0 cursor-grab touch-none items-center self-stretch text-[var(--text-secondary)] active:cursor-grabbing" [attr.aria-label]="'lessons.move' | t">
              <app-icon name="grip" class="size-5" />
            </span>
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
        } @else if (b.kind === 'heading') {
          <div class="list-row">
            <span cdkDragHandle class="-ml-1 flex shrink-0 cursor-grab touch-none items-center self-stretch text-[var(--text-secondary)] active:cursor-grabbing" [attr.aria-label]="'lessons.move' | t">
              <app-icon name="grip" class="size-5" />
            </span>
            <input [ngModel]="b.text" (ngModelChange)="setBlock(i, { text: $event })" type="text" [placeholder]="'lessons.heading' | t" autocomplete="off" class="row-input text-xl font-semibold" />
            <button type="button" (click)="removeBlock(i)" [attr.aria-label]="'lessons.removeBlock' | t" class="icon-plain -mr-2">
              <app-icon name="close" class="size-5" />
            </button>
          </div>
        } @else {
          <div class="list-row items-start py-3 desktop:py-2">
            <span cdkDragHandle class="-ml-1 flex shrink-0 cursor-grab touch-none items-center pt-0.5 text-[var(--text-secondary)] active:cursor-grabbing" [attr.aria-label]="'lessons.move' | t">
              <app-icon name="grip" class="size-5" />
            </span>
            <textarea
              [ngModel]="b.text"
              (ngModelChange)="setBlock(i, { text: $event })"
              rows="6"
              [placeholder]="'lessons.text' | t"
              class="row-input resize-y leading-relaxed"
            ></textarea>
            <button type="button" (click)="removeBlock(i)" [attr.aria-label]="'lessons.removeBlock' | t" class="icon-plain -mr-2 -mt-1">
              <app-icon name="close" class="size-5" />
            </button>
          </div>
        }
      </div>
    }
    </div>

    <!-- Add at the end -->
    <button #addBtn type="button" (click)="openAdd(m.blocks.length, addBtn)" class="card-btn gap-2 text-[var(--accent)]">
      <app-icon name="plus" class="size-5" />{{ 'lessons.addBlock' | t }}
    </button>

    <!-- What to add: available kinds, then the ones still to come (dimmed, "soon") -->
    @if (addOrigin(); as origin) {
      <app-sheet #addSheet [origin]="origin" (closed)="addOrigin.set(null)">
        <div class="card">
          @for (k of kinds; track k.kind) {
            <button type="button" (click)="add(k.kind, addSheet)" class="list-row w-full text-left">
              <app-icon [name]="k.icon" class="size-5 text-[var(--accent)]" />
              <span class="flex-1">{{ k.label | t }}</span>
            </button>
          }
          @for (k of soon; track k.label) {
            <div class="list-row opacity-40">
              <app-icon [name]="k.icon" class="size-5" />
              <span class="flex-1">{{ k.label | t }}</span>
              <span class="text-footnote">{{ 'lessons.soon' | t }}</span>
            </div>
          }
        </div>
      </app-sheet>
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

  protected patch(p: Partial<LessonInput>): void {
    this.value.update((m) => ({ ...m, ...p }));
  }

  protected setBlock(index: number, p: Partial<LessonBlock>): void {
    this.value.update((m) => ({ ...m, blocks: m.blocks.map((b, i) => (i === index ? { ...b, ...p } : b)) }));
  }

  // Block kinds to add, and those still to come.
  protected readonly kinds: { kind: LessonBlockKind; icon: IconName; label: TranslationKey }[] = [
    { kind: 'heading', icon: 'heading', label: 'lessons.heading' },
    { kind: 'text', icon: 'text', label: 'lessons.text' },
    { kind: 'link', icon: 'link', label: 'lessons.link' },
  ];
  protected readonly soon: { icon: IconName; label: TranslationKey }[] = [
    { icon: 'checklist', label: 'lessons.test' },
    { icon: 'image', label: 'lessons.image' },
    { icon: 'video', label: 'lessons.video' },
  ];

  // The add menu: where the new block goes, and the + it opened from.
  private insertAt = 0;
  protected readonly addOrigin = signal<HTMLElement | null>(null);

  protected move(e: CdkDragDrop<unknown>): void {
    if (e.previousIndex === e.currentIndex) return;
    this.value.update((m) => {
      const blocks = [...m.blocks];
      moveItemInArray(blocks, e.previousIndex, e.currentIndex);
      return { ...m, blocks };
    });
  }

  protected openAdd(at: number, origin: HTMLElement): void {
    this.insertAt = at;
    this.addOrigin.set(origin);
  }

  protected add(kind: LessonBlockKind, sheet: Sheet): void {
    const at = this.insertAt;
    this.value.update((m) => ({
      ...m,
      blocks: [...m.blocks.slice(0, at), { kind, text: null, url: null }, ...m.blocks.slice(at)],
    }));
    sheet.close();
  }

  protected removeBlock(index: number): void {
    this.value.update((m) => ({ ...m, blocks: m.blocks.filter((_, i) => i !== index) }));
  }
}
