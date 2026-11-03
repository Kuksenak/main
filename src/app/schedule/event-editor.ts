import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, DestroyRef, effect, ElementRef, inject, input, OnInit, output, signal, viewChild } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AuthStore } from '../auth/auth.store';
import { desktop } from '../core/device';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { TranslationKey } from '../core/i18n/translations';
import { UiMenu, UiMenuItem, UiMenuLabel, UiMenuSeparator } from '../core/ui/menu';
import { Confirm, Icon, UiButton, UiDate, UiFloatingButton, UiKbd, UiList, UiListItem, UiListTitle, UiOption, UiSelect, UiSheet, UiTime } from '../core/ui';
import { LibraryStore, PageItem } from '../library/library.store';
import { dayKey, EventInput, EventsStore, Occurrence, Repeat, Scope } from './events.store';

// Repeat: presets (as the old app's, iOS's) — a rule none of them is: Custom (Every n days / weeks / months)
const PRESETS: { key: string; repeat: Repeat; every: number; label: TranslationKey }[] = [
  { key: 'never', repeat: 'Never', every: 1, label: 'schedule.never' },
  { key: 'day', repeat: 'Daily', every: 1, label: 'schedule.daily' },
  { key: 'week', repeat: 'Weekly', every: 1, label: 'schedule.weekly' },
  { key: 'twoWeeks', repeat: 'Weekly', every: 2, label: 'schedule.twoWeeks' },
  { key: 'month', repeat: 'Monthly', every: 1, label: 'schedule.monthly' },
  { key: 'year', repeat: 'Yearly', every: 1, label: 'schedule.yearly' },
];
// (Every, for Custom: 1 to 12 of the repeat's days / weeks / months)
const INTERVALS = Array.from({ length: 12 }, (_, i) => i + 1);

/**
 * An event, new (`event` none: on `day`, at the next hour, an hour long) or as it is (as the old
 * app's): its title; Starts (a day, a time), Ends (a time — not after the start: orange, not saved);
 * Repeat, Every (n days / weeks / months), End repeat (never, or on a day); the library's pages it
 * goes with; a repeat saved / deleted: which of them, asked. Desktops: a panel at the right, the
 * page's color, a line at its left (the schedule in sight) — saved as it's changed (as Notion's), Esc
 * / Enter close it, Delete in its head; phones (as the old app's): a page of its own sliding in from the right — ‹ (changed: ✕) · its
 * name · ✓, iOS's cards, Delete at the end. `closed` as it goes.
 */
@Component({
  selector: 'app-event-editor',
  imports: [Icon, NgTemplateOutlet, TranslatePipe, UiButton, UiDate, UiFloatingButton, UiKbd, UiList, UiListItem, UiListTitle, UiMenu, UiMenuItem, UiMenuLabel, UiMenuSeparator, UiSelect, UiSheet, UiTime],
  templateUrl: './event-editor.html',
})
export class EventEditor implements OnInit {
  readonly event = input<Occurrence | null>(null);
  readonly day = input(new Date());
  readonly closed = output<void>();

  protected readonly desktop = desktop;
  protected readonly store = inject(EventsStore);
  protected readonly library = inject(LibraryStore);
  private readonly i18n = inject(I18nService);
  private readonly confirm = inject(Confirm);

  protected readonly title = signal('');
  protected readonly date = signal<string | null>(null);
  protected readonly start = signal<string | null>(null);
  protected readonly end = signal<string | null>(null);
  protected readonly repeat = signal<Repeat>('Never');
  protected readonly every = signal('1');
  protected readonly until = signal<string | null>(null);
  protected readonly pageIds = signal<string[]>([]);
  // A repeat saved / deleted: which of them it's for — asked (desktops: a menu at the head / the trash;
  // phones: the choices in place of Save / Delete)
  protected readonly choice = signal<{ kind: 'save' | 'delete'; at: HTMLElement | null } | null>(null);
  private readonly head = viewChild<ElementRef<HTMLElement>>('head');
  protected readonly saving = signal(false);
  // The pages' field: what's typed (the library's pages with it listed under it)
  protected readonly find = signal('');
  // (phones: the library's pages to add — a sheet)
  protected readonly adding = signal(false);
  // (desktops: the pages' dropdown open — at its row)
  protected readonly picking = signal<HTMLElement | null>(null);
  // (a rule none of the presets is: Custom, its Every shown)
  private readonly custom = signal(false);

  // The event as it is now (none: not made yet) — desktops: the one the changes went to, as they're saved
  protected readonly current = signal<Occurrence | null>(null);
  // (changes go to `current` as a whole — made here, one on its own, a series of its own: no "which of them")
  private readonly whole = signal(false);
  protected readonly repeating = computed(() => !!this.current() && this.current()!.repeat !== 'Never' && !this.whole());
  protected readonly preset = computed(() =>
    this.custom() ? 'custom' : (PRESETS.find((p) => p.repeat === this.repeat() && p.every === Number(this.every()))?.key ?? 'custom'),
  );
  // (Custom: offered only to an event that already repeats so)
  protected readonly presets = computed<UiOption[]>(() => [
    ...PRESETS.map((p) => ({ value: p.key, label: this.i18n.t(p.label) })),
    ...(this.preset() === 'custom' ? [{ value: 'custom', label: this.i18n.t('schedule.custom') }] : []),
  ]);
  protected readonly intervals = computed<UiOption[]>(() => {
    const r = this.repeat();
    const unit = this.i18n.t(r === 'Daily' ? 'schedule.days' : r === 'Weekly' ? 'schedule.weeks' : r === 'Yearly' ? 'schedule.years' : 'schedule.months');
    return INTERVALS.map((n) => ({ value: String(n), label: `${n} ${unit}` }));
  });
  protected readonly endRepeats = computed<UiOption[]>(() => [
    { value: 'never', label: this.i18n.t('schedule.untilNone') },
    { value: 'date', label: this.i18n.t('schedule.onDay') },
  ]);
  protected readonly scopes: { value: Scope; label: TranslationKey }[] = [
    { value: 'this', label: 'schedule.scopeThis' },
    { value: 'following', label: 'schedule.scopeFollowing' },
    { value: 'all', label: 'schedule.scopeAll' },
  ];

  // Ends' day: the start's ("Tue, 3 Nov")
  protected readonly endDay = computed(() => {
    const d = this.date();
    if (!d) return '';
    const [y, mo, day] = d.split('-').map(Number);
    return this.i18n.date(new Date(y, mo - 1, day), { weekday: 'short', month: 'short', day: 'numeric' });
  });

  // How long (minutes): the end less the start (not after it: none)
  protected readonly minutes = computed(() => {
    const s = toMinutes(this.start());
    const e = toMinutes(this.end());
    return s === null || e === null || e <= s ? null : e - s;
  });

  // The pages it goes with (gone ones left out); the field's finds: the rest with what's typed
  protected readonly pages = computed(() => {
    const byId = new Map((this.library.items() ?? []).map((p) => [p.id, p]));
    return this.pageIds().flatMap((id) => (byId.get(id) ? [byId.get(id)!] : []));
  });
  // (phones: all the library's others, to add)
  protected readonly addable = computed(() => (this.library.items() ?? []).filter((p) => !this.pageIds().includes(p.id)));
  protected readonly found = computed<PageItem[]>(() => {
    const words = this.i18n.lower(this.find().trim());
    return (this.library.items() ?? [])
      .filter((p) => !this.pageIds().includes(p.id) && (!words || this.i18n.lower(p.title).includes(words)))
      .slice(0, 6);
  });
  protected readonly canSave = computed(() => !!this.title().trim() && !!this.date() && this.minutes() !== null && !this.saving());

  // (its pages: only for those who can read the library)
  protected readonly hasLibrary = inject(AuthStore).can('library');

  constructor() {
    if (this.hasLibrary) this.library.load();
    // (desktops: a change — saved 0.8s after the last one)
    effect(() => {
      const state = this.state();
      if (!desktop || state === this.saved()) return;
      clearTimeout(this.timer);
      this.timer = setTimeout(() => this.flush(), 800);
    });
    inject(DestroyRef).onDestroy(() => clearTimeout(this.timer));
  }

  // Desktops: saved as it's changed — what was sent last; Saving… / Saved in the foot
  private readonly saved = signal('');
  protected readonly status = signal<'saving' | 'saved' | null>(null);
  private timer = 0;
  private sending = false;
  // (a repeat's changes: for which of them — asked at the first, then all go there)
  private scope: Scope | null = null;
  // (that menu closed with none picked: closing doesn't ask again — the changes left unsaved)
  private declined = false;

  protected choiceClosed(): void {
    if (this.choice()?.kind === 'save' && desktop) this.declined = true;
    this.choice.set(null);
  }
  private readonly valid = computed(() => !!this.title().trim() && !!this.date() && this.minutes() !== null);

  // What's changed sent: a new one made (then put as it is); a repeat — asked which of them first (a
  // menu at the head; then this one / the later ones: an event of their own, put as it is after)
  private async flush(): Promise<void> {
    clearTimeout(this.timer);
    const state = this.state();
    if (state === this.saved() || !this.valid() || this.sending) return;
    const current = this.current();
    if (this.repeating() && !this.scope) {
      if (!this.choice()) this.choice.set({ kind: 'save', at: this.head()?.nativeElement ?? null });
      return;
    }
    this.sending = true;
    this.status.set('saving');
    const input = this.input();
    const scope = this.scope;
    try {
      const id = await firstValueFrom(
        !current ? this.store.save(input, null, 'all')
        : !this.repeating() ? this.store.put(current.id, input)
        : this.store.save(input, current, scope!),
      );
      this.saved.set(state);
      this.status.set('saved');
      if (!current || (this.repeating() && scope !== 'all')) {
        // (made / one of its own now: the changes go to it, as a whole)
        const single = !!current && scope === 'this';
        this.current.set({ ...input, id, seriesStartsAt: input.startsAt, ...(single ? { repeat: 'Never', repeatInterval: 1, repeatUntil: null } : {}) });
        this.whole.set(true);
        if (single) {
          this.repeat.set('Never');
          this.until.set(null);
        }
      }
    } catch {
      this.status.set(null);
    } finally {
      this.sending = false;
    }
    // (changed while it was sent: again)
    if (this.state() !== this.saved()) this.flush();
  }

  // Desktops: Esc / Enter — what's changed saved, closed (a repeat not yet asked: the menu first)
  protected async close(): Promise<void> {
    if (this.picking() || this.choice()) return;
    if (this.declined) return this.closed.emit();
    await this.flush();
    if (!this.choice()) this.closed.emit();
  }

  // (as it opens — its inputs in: the event's, else a new one on the day picked, at the next hour, an hour long)
  ngOnInit(): void {
    const e = this.event();
    const at = e ? new Date(e.startsAt) : nextHour(this.day());
    const to = new Date(at.getTime() + (e?.durationMinutes ?? 60) * 60_000);
    this.title.set(e?.title ?? '');
    this.date.set(dayKey(at));
    this.start.set(hhmm(at));
    this.end.set(dayKey(to) === dayKey(at) ? hhmm(to) : '23:55');
    if (e) {
      this.repeat.set(e.repeat);
      this.every.set(String(e.repeatInterval));
      this.until.set(e.repeatUntil ? dayKey(new Date(e.repeatUntil)) : null);
      this.pageIds.set(e.pageIds);
      if (this.preset() === 'custom') this.custom.set(true);
    }
    this.current.set(e);
    this.opened.set(this.state());
    this.saved.set(this.state());
  }

  // A new start: the end keeps the length it had
  protected setStart(value: string | null): void {
    const length = this.minutes() ?? 60;
    this.start.set(value);
    const s = toMinutes(value);
    if (s !== null) this.end.set(fromMinutes(Math.min(s + length, 23 * 60 + 55)));
  }

  protected setPreset(key: string | null): void {
    const p = PRESETS.find((x) => x.key === key);
    if (!p) return;
    this.custom.set(false);
    this.repeat.set(p.repeat);
    this.every.set(String(p.every));
    if (p.repeat === 'Never') this.until.set(null);
  }

  protected setEndRepeat(value: string | null): void {
    this.until.set(value === 'date' ? (this.until() ?? this.date()) : null);
  }

  protected addPage(page: PageItem, menu?: UiMenu): void {
    if (!this.pageIds().includes(page.id)) this.pageIds.update((ids) => [...ids, page.id]);
    this.find.set('');
    menu?.close();
  }

  // (what's set, as one string — as it opened: `opened`; another now: changed)
  private readonly opened = signal('');
  private readonly state = computed(() =>
    JSON.stringify([this.title().trim(), this.date(), this.start(), this.end(), this.repeat(), this.every(), this.until(), this.pageIds()]),
  );
  protected readonly changed = computed(() => this.state() !== this.opened());

  // Phones' ‹ / ✕: back to the schedule — anything changed: asked first (by the button)
  protected async back(e: Event): Promise<void> {
    if (this.changed()) {
      const yes = await this.confirm.ask(e.currentTarget as HTMLElement, { text: this.i18n.t('schedule.discardAsk'), yes: this.i18n.t('schedule.discard'), danger: true });
      if (!yes) return;
    }
    this.done();
  }

  protected removePage(id: string): void {
    this.pageIds.update((ids) => ids.filter((x) => x !== id));
  }

  // Enter in the pages' field: the first found added (nothing typed: saved, as anywhere else)
  protected findEnter(e: Event, menu?: UiMenu): void {
    e.preventDefault();
    const first = this.found()[0];
    if (this.find().trim() && first) this.addPage(first, menu);
  }

  protected closePicker(): void {
    this.picking.set(null);
    this.find.set('');
  }

  // Desktops: Enter closes (saved) — anywhere but in a field or on a button (they do their own)
  protected enter(e: Event): void {
    const at = e.target as HTMLElement;
    if (at.closest('input, textarea, button, select, [role=menu], [role=listbox]')) return;
    e.preventDefault();
    this.close();
  }

  private input(): EventInput {
    const [y, mo, d] = this.date()!.split('-').map(Number);
    const s = toMinutes(this.start())!;
    const until = this.repeat() !== 'Never' && this.until() ? this.until()!.split('-').map(Number) : null;
    return {
      title: this.title().trim(),
      startsAt: new Date(y, mo - 1, d, Math.floor(s / 60), s % 60).toISOString(),
      durationMinutes: this.minutes()!,
      repeat: this.repeat(),
      repeatInterval: this.repeat() === 'Never' ? 1 : Number(this.every()),
      repeatUntil: until ? new Date(until[0], until[1] - 1, until[2], 23, 59, 59).toISOString() : null,
      pageIds: this.pageIds(),
    };
  }

  // (done: the desktop's panel just goes; the phones' page slides back out to the right first)
  protected readonly leaving = signal(false);
  private done(): void {
    if (desktop) return this.closed.emit();
    this.leaving.set(true);
    setTimeout(() => this.closed.emit(), 240);
  }

  // Save: nothing changed — just closed; a repeat — which of them, asked first
  protected save(): void {
    if (!this.canSave() || this.choice()) return;
    if (this.current() && !this.changed()) return this.done();
    if (this.repeating()) this.choice.set({ kind: 'save', at: this.head()?.nativeElement ?? null });
    else this.saveFor('this');
  }

  // Delete: a repeat — which of them, asked; one event — "Delete this event?"
  protected async remove(e: Event): Promise<void> {
    if (!this.current()) return;
    if (this.repeating()) return this.choice.set({ kind: 'delete', at: e.currentTarget as HTMLElement });
    const yes = await this.confirm.ask(e.currentTarget as HTMLElement, {
      text: this.i18n.t('schedule.deleteAsk'),
      yes: this.i18n.t('schedule.delete'),
      danger: true,
    });
    if (yes) this.deleteFor('this');
  }

  // (the choice made: saved / deleted for those — desktops' changes: all of them for those, from now on)
  protected chosen(scope: Scope): void {
    const kind = this.choice()?.kind;
    this.choice.set(null);
    if (kind === 'save' && desktop) {
      this.scope = scope;
      this.declined = false;
      this.flush();
    } else if (kind === 'save') this.saveFor(scope);
    else if (kind === 'delete') this.deleteFor(scope);
  }

  private saveFor(scope: Scope): void {
    this.saving.set(true);
    this.store.save(this.input(), this.current(), scope).subscribe({
      next: () => this.done(),
      error: () => this.saving.set(false),
    });
  }

  private deleteFor(scope: Scope): void {
    clearTimeout(this.timer);
    this.saved.set(this.state()); // (nothing more to save)
    this.store.remove(this.current()!, this.repeating() ? scope : 'all').subscribe(() => this.done());
  }
}

const pad = (n: number): string => String(n).padStart(2, '0');
const hhmm = (d: Date): string => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const toMinutes = (t: string | null): number | null => (t ? Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5)) : null);
const fromMinutes = (m: number): string => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;

// (a new one: the day picked, at the hour after now — another day: at 9)
function nextHour(day: Date): Date {
  const now = new Date();
  const at = new Date(day);
  if (dayKey(day) === dayKey(now)) at.setHours(Math.min(22, now.getHours() + 1), 0, 0, 0);
  else at.setHours(9, 0, 0, 0);
  return at;
}
