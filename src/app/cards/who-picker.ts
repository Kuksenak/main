import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { DeviceDetectionService } from '../core/services/device-detection.service';
import { Icon } from '../core/ui/icon/icon';
import { PageSheet } from '../core/ui/page-sheet/page-sheet';
import { ScrollArea } from '../core/ui/scroll-area/scroll-area';
import { SearchField } from '../core/ui/search-field';
import { Sheet } from '../core/ui/sheet/sheet';
import { initial } from '../core/utils/text';
import { GroupService, colorVar } from '../students/group.service';
import { LessonWho } from '../schedule/lesson.service';
import { StudentService } from '../students/student.service';

/**
 * Who a lesson is for: search + Groups and Students lists, the current choice checked.
 * Mobile: a page sliding in (it has a search input); desktop: a dropdown under `origin`.
 * Emits the picked student / group, then closes.
 */
@Component({
  selector: 'app-who-picker',
  imports: [NgTemplateOutlet, Icon, PageSheet, ScrollArea, SearchField, Sheet, TranslatePipe],
  template: `
    <ng-template #search>
      <app-search-field [(value)]="query" />
    </ng-template>

    <ng-template #lists>
      @for (sec of sections(); track sec.key) {
        @if (sec.items.length) {
          <div class="flex flex-col gap-1.5">
            <span class="text-footnote px-4 uppercase opacity-50">{{ sec.key | t }}</span>
            <div class="card">
              @for (item of sec.items; track item.who.studentId ?? item.who.groupId) {
                <button type="button" (click)="pick(item.who)" class="list-row w-full py-2 text-left">
                  <span
                    class="avatar"
                    [class.text-[var(--accent-fg)]]="!!item.color"
                    [style.background]="item.color"
                  >{{ initial(item.who.name) }}</span>
                  <p class="min-w-0 flex-1 truncate">{{ item.who.name }}</p>
                  @if (isCurrent(item.who)) {
                    <app-icon name="check" class="size-5 text-[var(--accent)]" />
                  }
                </button>
              }
            </div>
          </div>
        }
      }
      @if (!hasResults()) {
        <p class="text-body py-6 text-center opacity-40">{{ 'students.notFound' | t }}</p>
      }
    </ng-template>

    @if (desktop) {
      <app-sheet #dropdown [origin]="origin()" (closed)="closed.emit()">
        <div class="flex flex-col gap-3">
          <ng-container [ngTemplateOutlet]="search" />
          <app-scroll-area class="max-h-80" contentClass="gap-3">
            <ng-container [ngTemplateOutlet]="lists" />
          </app-scroll-area>
        </div>
      </app-sheet>
    } @else {
      <app-page-sheet #page [title]="'lesson.who' | t" [actions]="false" [scroll]="false" (closed)="closed.emit()">
        <div class="flex min-h-0 flex-1 flex-col gap-4">
          <ng-container [ngTemplateOutlet]="search" />
          <app-scroll-area class="min-h-0 flex-1" contentClass="gap-6">
            <ng-container [ngTemplateOutlet]="lists" />
          </app-scroll-area>
        </div>
      </app-page-sheet>
    }
  `,
})
export class WhoPicker {
  readonly value = input<LessonWho | null>(null);
  readonly origin = input<HTMLElement | null>(null);
  readonly picked = output<LessonWho>();
  readonly closed = output<void>();

  private groups = inject(GroupService);
  private students = inject(StudentService);
  private i18n = inject(I18nService);
  protected readonly desktop = !inject(DeviceDetectionService).isMobile();

  private readonly dropdown = viewChild<Sheet>('dropdown');
  private readonly page = viewChild<PageSheet>('page');

  protected readonly query = signal('');

  protected readonly sections = computed(() => {
    const q = this.query().trim().toLocaleLowerCase();
    const match = (name: string) => !q || name.toLocaleLowerCase().includes(q);
    const byName = (a: { who: LessonWho }, b: { who: LessonWho }) =>
      a.who.name.localeCompare(b.who.name, this.i18n.locale());
    return [
      {
        key: 'groups.title' as const,
        items: this.groups
          .groups()
          .filter((g) => match(g.name))
          .map((g) => ({ who: { studentId: null, groupId: g.id, name: g.name }, color: colorVar(g.color) as string | null }))
          .sort(byName),
      },
      {
        key: 'nav.students' as const,
        items: this.students
          .students()
          .filter((s) => match(s.name))
          .map((s) => ({ who: { studentId: s.id, groupId: null, name: s.name }, color: null as string | null }))
          .sort(byName),
      },
    ];
  });

  protected readonly hasResults = computed(() => this.sections().some((s) => s.items.length));

  protected initial(name: string): string {
    return initial(name, this.i18n.locale());
  }

  protected isCurrent(who: LessonWho): boolean {
    const v = this.value();
    return !!v && ((!!who.studentId && who.studentId === v.studentId) || (!!who.groupId && who.groupId === v.groupId));
  }

  protected pick(who: LessonWho): void {
    this.picked.emit(who);
    this.dropdown()?.close();
    this.page()?.close();
  }
}
