import { Component, computed, inject, input, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { EventList } from '../cards/event-list';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { Icon } from '../core/ui/icon/icon';
import { Toggle } from '../core/ui/toggle';
import { Lesson, LessonService, shareUrl } from './lesson.service';
import { LessonUsage } from './lesson-usage';

/**
 * A lesson's summary, read with it. `compact` (phones, above the content): one card — its next
 * (else last) event, and the public link (⧉ copies it while on). Full (desktop, beside the
 * content): every event using it, then the public link with its hint.
 */
@Component({
  selector: 'app-lesson-info',
  imports: [EventList, Icon, NgTemplateOutlet, Toggle, TranslatePipe],
  host: { class: 'flex flex-col gap-4' },
  template: `
    @let l = lesson();
    <ng-template #linkRow>
      <!-- The whole row (a label) flips the switch; ⧉ shown before it -->
      <label class="list-row cursor-pointer">
        <app-icon name="link" class="row-icon" />
        <span class="flex-1">{{ 'lessons.public' | t }}</span>
        <app-toggle class="order-2" [checked]="!!l.shareToken" (checkedChange)="lessons.share(l.id, $event)" [attr.aria-label]="'lessons.public' | t" />
        @if (l.shareToken; as token) {
          <button type="button" (click)="copy(token); $event.preventDefault()" [attr.aria-label]="'lessons.copy' | t" class="icon-plain order-1 !text-[var(--text)]">
            <app-icon [name]="copied() ? 'check' : 'copy'" class="size-5" />
          </button>
        }
      </label>
    </ng-template>

    @if (linkOnly()) {
      <div class="flex flex-col gap-1.5">
        <div class="card"><ng-container [ngTemplateOutlet]="linkRow" /></div>
        <p class="text-footnote px-1 opacity-50">{{ 'lessons.publicHint' | t }}</p>
      </div>
    } @else if (compact()) {
      <div class="card">
        @if (use().next ?? use().last; as e) {
          <div class="list-row">
            <app-icon name="calendar" class="row-icon" />
            <span class="flex-1">{{ (use().next ? 'lessons.next' : 'lessons.last') | t }}</span>
            <span class="min-w-0 truncate text-right opacity-50">{{ usage.day(e) }}, {{ usage.who(e) }}</span>
          </div>
        }
        <ng-container [ngTemplateOutlet]="linkRow" />
      </div>
    } @else {
      <app-event-list [lessonId]="l.id" />
      <div class="flex flex-col gap-1.5">
        <div class="card"><ng-container [ngTemplateOutlet]="linkRow" /></div>
        <p class="text-footnote px-1 opacity-50">{{ 'lessons.publicHint' | t }}</p>
      </div>
    }
  `,
})
export class LessonInfo {
  readonly lesson = input.required<Lesson>();
  readonly compact = input(false);
  /** Only the public link (the lesson's settings, beside the editor). */
  readonly linkOnly = input(false);

  protected lessons = inject(LessonService);
  protected usage = inject(LessonUsage);
  protected readonly use = computed(() => this.usage.of(this.lesson().id));
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
