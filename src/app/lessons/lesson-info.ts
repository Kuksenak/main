import { Component, inject, input, signal } from '@angular/core';
import { EventList } from '../cards/event-list';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { Icon } from '../core/ui/icon/icon';
import { Toggle } from '../core/ui/toggle';
import { Lesson, LessonService, shareUrl } from './lesson.service';

/** A lesson's ⓘ: the public link switch (⧉ copies the link while on) and the events using it. */
@Component({
  selector: 'app-lesson-info',
  imports: [EventList, Icon, Toggle, TranslatePipe],
  host: { class: 'flex flex-col gap-6 desktop:gap-4' },
  template: `
    @let l = lesson();
    <div class="flex flex-col gap-1.5">
      <div class="card">
        <div class="list-row">
          <span class="flex-1">{{ 'lessons.public' | t }}</span>
          @if (l.shareToken; as token) {
            <button type="button" (click)="copy(token)" [attr.aria-label]="'lessons.copy' | t" class="icon-plain !text-[var(--text)]">
              <app-icon [name]="copied() ? 'check' : 'copy'" class="size-6" />
            </button>
          }
          <app-toggle [checked]="!!l.shareToken" (checkedChange)="lessons.share(l.id, $event)" [attr.aria-label]="'lessons.public' | t" />
        </div>
      </div>
      <p class="text-footnote px-4 opacity-50">{{ 'lessons.publicHint' | t }}</p>
    </div>
    <app-event-list [lessonId]="l.id" />
  `,
})
export class LessonInfo {
  readonly lesson = input.required<Lesson>();

  protected lessons = inject(LessonService);
  protected readonly copied = signal(false);

  protected copy(token: string): void {
    navigator.clipboard?.writeText(shareUrl(token)).then(
      () => {
        this.copied.set(true);
        setTimeout(() => this.copied.set(false), 2000);
      },
      () => {},
    );
  }
}
