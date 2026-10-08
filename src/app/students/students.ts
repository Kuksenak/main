import { NgTemplateOutlet } from '@angular/common';
import { Component, DestroyRef, TemplateRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { GroupMembers, StudentGroups } from '../cards/related-lists';
import { LessonList } from '../cards/lesson-list';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { DeviceDetectionService } from '../core/services/device-detection.service';
import { NavStack } from '../core/services/nav-stack.service';
import { ToolbarService } from '../core/services/toolbar.service';
import { Icon } from '../core/ui/icon/icon';
import { LongPress } from '../core/ui/long-press';
import { ScrollArea } from '../core/ui/scroll-area/scroll-area';
import { SearchField } from '../core/ui/search-field';
import { initial } from '../core/utils/text';
import { Group, GroupService, colorVar } from './group.service';
import { Student, StudentService } from './student.service';

type Tab = 'students' | 'groups';

/**
 * Students and groups. Tabs switch the list (the search filters whichever is shown). Mobile:
 * a tap opens the card on the NavStack. Desktop: the picked item's details show on the right;
 * Edit and the links in it open cards on the stack. Groups are created from the Groups tab (+,
 * which opens the member picker right away) or by long-pressing a student to select several.
 */
@Component({
  selector: 'app-students',
  imports: [NgTemplateOutlet, GroupMembers, Icon, LessonList, LongPress, ScrollArea, SearchField, StudentGroups, TranslatePipe],
  templateUrl: './students.html',
})
export class Students {
  private service = inject(StudentService);
  private groupService = inject(GroupService);
  private i18n = inject(I18nService);
  protected stack = inject(NavStack);
  private readonly search = viewChild<TemplateRef<unknown>>('search');

  protected readonly desktop = !inject(DeviceDetectionService).isMobile();
  protected readonly colorVar = colorVar;

  protected readonly tab = signal<Tab>('students');
  protected readonly query = signal('');

  // Alphabetical, filtered by name / email / phone.
  protected readonly visible = computed(() => {
    const q = this.query().trim().toLocaleLowerCase();
    return [...this.service.students()]
      .filter((s) => !q || [s.name, s.email, s.phone].some((v) => !!v && v.toLocaleLowerCase().includes(q)))
      .sort((a, b) => a.name.localeCompare(b.name, this.i18n.locale()));
  });

  protected readonly visibleGroups = computed(() => {
    const q = this.query().trim().toLocaleLowerCase();
    return [...this.groupService.groups()]
      .filter((g) => !q || g.name.toLocaleLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name, this.i18n.locale()));
  });

  // Desktop details pane: the picked item, else the first one in the list.
  private readonly selectedId = signal<string | null>(null);
  protected readonly selected = computed<Student | null>(() => {
    const list = this.visible();
    return list.find((s) => s.id === this.selectedId()) ?? list.at(0) ?? null;
  });
  private readonly selectedGroupId = signal<string | null>(null);
  protected readonly selectedGroup = computed<Group | null>(() => {
    const list = this.visibleGroups();
    return list.find((g) => g.id === this.selectedGroupId()) ?? list.at(0) ?? null;
  });

  // Select mode (students → new group).
  protected readonly selecting = signal(false);
  protected readonly checked = signal<ReadonlySet<string>>(new Set());

  constructor() {
    // Mobile toolbar: the search field instead of a title.
    const toolbar = inject(ToolbarService);
    effect(() => toolbar.content.set(this.search() ?? null));
    inject(DestroyRef).onDestroy(() => toolbar.content.set(null));
  }

  // Switching tabs keeps the search text (it filters whichever list is shown).
  protected setTab(tab: Tab): void {
    this.tab.set(tab);
    this.cancelSelect();
  }

  protected initial(name: string): string {
    return initial(name, this.i18n.locale());
  }

  // Row taps: select mode toggles; desktop shows details; mobile opens the card.
  protected pick(s: Student): void {
    if (this.selecting()) this.toggleChecked(s.id);
    else if (this.desktop) this.selectedId.set(s.id);
    else this.stack.push({ kind: 'student', id: s.id });
  }

  protected pickGroup(g: Group): void {
    if (this.desktop) this.selectedGroupId.set(g.id);
    else this.stack.push({ kind: 'group', id: g.id });
  }

  protected openNew(): void {
    this.stack.push({ kind: this.tab() === 'groups' ? 'group' : 'student', id: null });
  }

  // ---- Select mode (entered by long-pressing a student) ----

  protected startSelect(s: Student): void {
    if (this.selecting()) return;
    this.selecting.set(true);
    this.checked.set(new Set([s.id]));
  }

  protected cancelSelect(): void {
    this.selecting.set(false);
    this.checked.set(new Set());
  }

  protected toggleChecked(id: string): void {
    const next = new Set(this.checked());
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.checked.set(next);
  }

  protected createGroupFromSelection(): void {
    const studentIds = [...this.checked()];
    this.cancelSelect();
    this.stack.push({ kind: 'group', id: null, studentIds });
  }
}
