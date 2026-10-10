import { NgTemplateOutlet } from '@angular/common';
import { Component, DestroyRef, TemplateRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { GroupView, StudentView } from '../cards/person-views';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { DeviceDetectionService } from '../core/services/device-detection.service';
import { NavStack } from '../core/services/nav-stack.service';
import { ToolbarService } from '../core/services/toolbar.service';
import { Icon } from '../core/ui/icon/icon';
import { LongPress } from '../core/ui/long-press';
import { ScrollArea } from '../core/ui/scroll-area/scroll-area';
import { SearchField } from '../core/ui/search-field';
import { Sheet } from '../core/ui/sheet/sheet';
import { initial } from '../core/utils/text';
import { Group, GroupService, colorVar } from './group.service';
import { Student, StudentService } from './student.service';

/**
 * Students and groups in one list (iOS Contacts-like): groups first, then students, the search
 * filtering both. Mobile: a tap opens the card on the NavStack (for reading, Edit inside).
 * Desktop: the picked student / group shows on the right the same way; its Edit opens the form.
 * Add offers a new student or group; a long press on a student starts picking students to make a
 * group of.
 */
@Component({
  selector: 'app-students',
  imports: [NgTemplateOutlet, GroupView, Icon, LongPress, ScrollArea, SearchField, Sheet, StudentView, TranslatePipe],
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

  protected readonly query = signal('');

  private readonly byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, this.i18n.locale());

  // Alphabetical, filtered by name / email / phone.
  protected readonly visible = computed(() => {
    const q = this.query().trim().toLocaleLowerCase();
    return this.service
      .students()
      .filter((s) => !q || [s.name, s.email, s.phone].some((v) => !!v && v.toLocaleLowerCase().includes(q)))
      .sort(this.byName);
  });

  protected readonly visibleGroups = computed(() => {
    const q = this.query().trim().toLocaleLowerCase();
    return this.groupService
      .groups()
      .filter((g) => !q || g.name.toLocaleLowerCase().includes(q))
      .sort(this.byName);
  });

  /** Under a student's name: their groups, else how to reach them. */
  protected subtitle(s: Student): string {
    const groups = this.groupService
      .groups()
      .filter((g) => g.studentIds.includes(s.id))
      .map((g) => g.name);
    return groups.join(', ') || s.email || s.phone || '';
  }

  // Desktop details: the picked student / group, else the first student (else the first group).
  private readonly picked = signal<{ kind: 'student' | 'group'; id: string } | null>(null);
  protected readonly pickedStudent = computed<Student | null>(() => {
    const p = this.picked();
    if (p?.kind === 'group' && this.visibleGroups().some((g) => g.id === p.id)) return null;
    return this.visible().find((s) => s.id === p?.id) ?? this.visible().at(0) ?? null;
  });
  protected readonly pickedGroup = computed<Group | null>(() => {
    if (this.pickedStudent()) return null;
    const p = this.picked();
    return this.visibleGroups().find((g) => g.id === p?.id) ?? this.visibleGroups().at(0) ?? null;
  });

  protected isPicked(kind: 'student' | 'group', id: string): boolean {
    return kind === 'student' ? this.pickedStudent()?.id === id : this.pickedGroup()?.id === id;
  }

  // Select mode (students → new group).
  protected readonly selecting = signal(false);
  protected readonly checked = signal<ReadonlySet<string>>(new Set());

  // Add menu
  protected readonly adding = signal(false);
  protected readonly addOrigin = signal<HTMLElement | null>(null);

  constructor() {
    // Mobile toolbar: the search field instead of a title.
    const toolbar = inject(ToolbarService);
    effect(() => toolbar.content.set(this.search() ?? null));
    inject(DestroyRef).onDestroy(() => toolbar.content.set(null));
  }

  protected initial(name: string): string {
    return initial(name, this.i18n.locale());
  }

  // Row taps: select mode toggles; desktop shows details; mobile opens the card.
  protected pick(s: Student): void {
    if (this.selecting()) this.toggleChecked(s.id);
    else if (this.desktop) this.picked.set({ kind: 'student', id: s.id });
    else this.stack.push({ kind: 'student', id: s.id });
  }

  protected pickGroup(g: Group): void {
    if (this.desktop) this.picked.set({ kind: 'group', id: g.id });
    else this.stack.push({ kind: 'group', id: g.id });
  }

  protected openAdd(origin: HTMLElement): void {
    this.addOrigin.set(origin);
    this.adding.set(true);
  }

  protected openNew(kind: 'student' | 'group'): void {
    this.stack.push({ kind, id: null });
  }

  // ---- Select mode ----

  // Entered by long-pressing a student (who starts checked).
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
