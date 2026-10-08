import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { environment } from '@environments/environment';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { LessonContent } from './lesson-content';
import { LessonBlock } from './lesson.service';

/** A shared lesson at its public link (/l/:token): readable by anyone, no sign-in. */
@Component({
  selector: 'app-shared-lesson',
  imports: [LessonContent, TranslatePipe],
  host: { class: 'block h-full overflow-y-auto bg-[var(--app-bg)] text-[var(--text)]' },
  template: `
    <div class="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pb-[calc(env(safe-area-inset-bottom)+2rem)] pt-[calc(env(safe-area-inset-top)+1rem)]">
      <header class="flex items-center gap-2 opacity-60">
        <img src="logo.png" alt="" class="size-6" width="24" height="24" />
        <span class="text-footnote font-medium">{{ 'app.name' | t }}</span>
      </header>

      @switch (state()) {
        @case ('loading') {
          <p class="text-body py-10 text-center opacity-40">{{ 'app.loading' | t }}</p>
        }
        @case ('missing') {
          <p class="text-body py-10 text-center opacity-40">{{ 'lessons.notFound' | t }}</p>
        }
        @default {
          <h1 class="text-2xl font-semibold">{{ title() }}</h1>
          <app-lesson-content [blocks]="blocks()" />
        }
      }
    </div>
  `,
})
export class SharedLesson {
  protected readonly state = signal<'loading' | 'ready' | 'missing'>('loading');
  protected readonly title = signal('');
  protected readonly blocks = signal<LessonBlock[]>([]);

  constructor() {
    const token = inject(ActivatedRoute).snapshot.paramMap.get('token') ?? '';
    inject(HttpClient)
      .get<{ title: string; blocks: LessonBlock[] }>(`${environment.apiUrl}/shared/lessons/${encodeURIComponent(token)}`)
      .subscribe({
        next: (l) => {
          this.title.set(l.title);
          this.blocks.set(l.blocks);
          this.state.set('ready');
        },
        error: () => this.state.set('missing'),
      });
  }
}
