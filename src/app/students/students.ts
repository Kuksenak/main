import { ConnectedPosition, OverlayModule } from '@angular/cdk/overlay';
import { NgTemplateOutlet } from '@angular/common';
import { Component, DestroyRef, TemplateRef, computed, effect, inject, signal, viewChild } from '@angular/core';
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

/**
 * Students and groups (iOS Contacts-like), the search filtering both: phones one list (groups
 * first), desktop two columns (students | groups). A tap opens the card on the NavStack (for
 * reading, Edit inside; a dialog on desktop).
 * Add offers a new student or group; a long press on a student starts picking students to make a
 * group of.
 */
@Component({
  selector: 'app-students',
  imports: [NgTemplateOutlet, OverlayModule, Icon, LongPress, ScrollArea, SearchField, TranslatePipe],
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

  // Select mode (students → new group).
  protected readonly selecting = signal(false);
  protected readonly checked = signal<ReadonlySet<string>>(new Set());

  // Add menu
  protected readonly adding = signal(false);
  protected readonly addOrigin = signal<HTMLElement | null>(null);
  // Desktop: under Add, right-aligned; above it when there's no room below.
  protected readonly addPositions: ConnectedPosition[] = [
    { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 6 },
    { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -6 },
  ];

  constructor() {
    // Mobile toolbar: the search field instead of a title.
    const toolbar = inject(ToolbarService);
    effect(() => toolbar.content.set(this.search() ?? null));
    inject(DestroyRef).onDestroy(() => toolbar.content.set(null));
  }

  protected initial(name: string): string {
    return initial(name, this.i18n.locale());
  }

  // Row taps: select mode toggles; else the card opens.
  protected pick(s: Student): void {
    if (this.selecting()) this.toggleChecked(s.id);
    else this.stack.push({ kind: 'student', id: s.id });
  }

  protected pickGroup(g: Group): void {
    this.stack.push({ kind: 'group', id: g.id });
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
