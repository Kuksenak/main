import { Component, input } from '@angular/core';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { Icon } from '../core/ui/icon/icon';
import { LessonBlock } from './lesson.service';

/** A lesson's content as read: headings, texts as paragraphs, links as rows opening in a new tab. */
@Component({
  selector: 'app-lesson-content',
  imports: [Icon, TranslatePipe],
  host: { class: 'flex flex-col gap-3' },
  template: `
    @for (b of blocks(); track $index) {
      @if (b.kind === 'link') {
        <a [href]="b.url" target="_blank" rel="noopener noreferrer" class="card list-row active:opacity-70">
          <app-icon name="link" class="size-5 text-[var(--accent)]" />
          <div class="min-w-0 flex-1 leading-tight">
            <p class="truncate font-medium">{{ b.text || host(b.url) }}</p>
            <p class="text-footnote truncate opacity-50">{{ b.url }}</p>
          </div>
          <app-icon name="chevron-right" class="row-chevron" />
        </a>
      } @else if (b.kind === 'heading') {
        <h2 class="px-1 pt-2 text-xl font-semibold">{{ b.text }}</h2>
      } @else {
        <p class="text-body whitespace-pre-wrap px-1 leading-relaxed">{{ b.text }}</p>
      }
    } @empty {
      <p class="text-footnote px-4 opacity-50">{{ 'lessons.noContent' | t }}</p>
    }
  `,
})
export class LessonContent {
  readonly blocks = input.required<LessonBlock[]>();

  protected host(url: string | null): string {
    try {
      return new URL(url ?? '').hostname;
    } catch {
      return url ?? '';
    }
  }
}
