import { ConnectedPosition, OverlayModule } from '@angular/cdk/overlay';
import { NgTemplateOutlet } from '@angular/common';
import { Component, DestroyRef, TemplateRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { DeviceDetectionService } from '../core/services/device-detection.service';
import { NavStack } from '../core/services/nav-stack.service';
import { ToolbarService } from '../core/services/toolbar.service';
import { GroupView, StudentView } from '../cards/person-views';
import { Icon } from '../core/ui/icon/icon';
import { LongPress } from '../core/ui/long-press';
import { ScrollArea } from '../core/ui/scroll-area/scroll-area';
import { SearchBar } from '../core/ui/search-bar';
import { SearchField } from '../core/ui/search-field';
import { primeKeyboard } from '../core/utils/keyboard';
import { initial } from '../core/utils/text';
import { Group, GroupService, colorVar, GROUPS_ON } from './group.service';
import { Student, StudentService } from './student.service';
import { PersonPage } from './person-page';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

/**
 * Students and groups in one list (iOS Contacts-like: groups first), the search filtering both.
 * Phones: a tap opens the card on the NavStack (for reading, Edit inside). Desktop: the list on
 * the left, the picked student / group on the right; its Edit opens the form.
 * Add offers a new student or group; a long press on a student starts picking students to make a
 * group of.
 * Phones: groups and students behind Groups | Students tabs (desktop: both in one list).
 */
@Component({
  selector: 'app-students',
  imports: [NgTemplateOutlet, OverlayModule, GroupView, SearchBar, Icon, LongPress, PersonPage, ScrollArea, SearchField, StudentView, TranslatePipe],
  templateUrl: './students.html',
})
export class Students {
  private service = inject(StudentService);
  private groupService = inject(GroupService);
  private i18n = inject(I18nService);
  protected stack = inject(NavStack);
  private readonly search = viewChild<TemplateRef<unknown>>('search');
  private readonly searchBar = viewChild<TemplateRef<unknown>>('searchBar');
  // Searching (phones): + hides (it'd show through the search bar's ✕)
  protected readonly searchActive = signal(false);

  protected readonly desktop = !inject(DeviceDetectionService).isMobile();
  protected readonly colorVar = colorVar;
  protected readonly router = inject(Router);

  // Desktop: the student / group open (its link: /students/student/:id, /students/group/:id)
  private readonly params = toSignal(inject(ActivatedRoute).paramMap.pipe(map((p) => ({ kind: p.get('kind'), id: p.get('id') }))));
  protected readonly openKind = computed(() => {
    const k = this.params()?.kind;
    return k === 'student' || k === 'group' ? k : null;
  });
  protected readonly openId = computed(() => (this.openKind() ? (this.params()?.id ?? null) : null));
  // (one page per one: switching starts it afresh)
  protected readonly openKey = computed(() => (this.openKind() && this.openId() ? [`${this.openKind()}:${this.openId()}`] : []));

  protected readonly query = signal('');

  // Phones: which tab is showing (desktop lists both).
  protected readonly tab = signal<'groups' | 'students'>('students');
  // Phones: the open tab (searching too: it filters that tab); desktop: both
  protected readonly groupsOn = GROUPS_ON;
  protected readonly showGroups = computed(() => GROUPS_ON && (this.desktop || this.tab() === 'groups'));
  protected readonly showStudents = computed(() => this.desktop || this.tab() === 'students');

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
    const toolbar = inject(ToolbarService);
    // The search field in the top bar (searching: the menu and account step aside)
    if (!this.desktop) effect(() => toolbar.content.set(this.searchBar() ?? null));
    effect(() => toolbar.searching.set(this.searchActive()));
    inject(DestroyRef).onDestroy(() => {
      toolbar.content.set(null);
      toolbar.searching.set(false);
    });
  }

  protected initial(name: string): string {
    return initial(name, this.i18n.locale());
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

  // Row taps: select mode toggles; desktop shows it on the right; phones open the card.
  protected pick(s: Student): void {
    if (this.selecting()) this.toggleChecked(s.id);
    else if (this.desktop) this.picked.set({ kind: 'student', id: s.id });
    else this.stack.push({ kind: 'student', id: s.id });
  }

  protected pickGroup(g: Group): void {
    if (this.desktop) this.picked.set({ kind: 'group', id: g.id });
    else this.stack.push({ kind: 'group', id: g.id });
  }

  // Add: on a tab, straight to a new one of its kind; desktop: the menu (student or group).
  protected openAdd(origin: HTMLElement): void {
    if (!this.showGroups()) return this.openNew('student');
    if (!this.showStudents()) return this.openNew('group');
    this.addOrigin.set(origin);
    this.adding.set(true);
  }

  // Phones: the keyboard comes up right in the tap (the form's name field gets it once it's in).
  protected openNew(kind: 'student' | 'group'): void {
    if (!this.desktop) primeKeyboard();
    this.stack.push({ kind, id: null });
  }

  // ---- Select mode ----

  // Entered by long-pressing a student (who starts checked).
  protected startSelect(s: Student): void {
    if (this.selecting() || !GROUPS_ON) return;
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
    if (!this.desktop) primeKeyboard();
    this.stack.push({ kind: 'group', id: null, studentIds });
  }
}
