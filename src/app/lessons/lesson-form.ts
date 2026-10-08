import { Component, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { Icon } from '../core/ui/icon/icon';
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

/** Editing a lesson in place: title, texts and links (× removes one), Add text / Add link. */
@Component({
  selector: 'app-lesson-form',
  imports: [FormsModule, Icon, TranslatePipe],
  host: { class: 'flex flex-col gap-6' },
  template: `
    @let m = value();
    <div class="card">
      <div class="list-row">
        <input name="title" [ngModel]="m.title" (ngModelChange)="patch({ title: $event })" type="text" [placeholder]="'lessons.name' | t" autocomplete="off" class="row-input font-semibold" />
      </div>
    </div>

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
  `,
})
export class LessonForm {
  readonly value = model.required<LessonInput>();

  protected readonly badLink = badLink;

  protected patch(p: Partial<LessonInput>): void {
    this.value.update((m) => ({ ...m, ...p }));
  }

  protected setBlock(index: number, p: Partial<LessonBlock>): void {
    this.value.update((m) => ({ ...m, blocks: m.blocks.map((b, i) => (i === index ? { ...b, ...p } : b)) }));
  }

  protected addBlock(kind: LessonBlockKind): void {
    this.value.update((m) => ({ ...m, blocks: [...m.blocks, { kind, text: null, url: null }] }));
  }

  protected removeBlock(index: number): void {
    this.value.update((m) => ({ ...m, blocks: m.blocks.filter((_, i) => i !== index) }));
  }
}
