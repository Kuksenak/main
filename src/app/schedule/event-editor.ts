import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, input, OnInit, output, signal } from '@angular/core';
import { AuthStore } from '../auth/auth.store';
import { desktop } from '../core/device';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { TranslationKey } from '../core/i18n/translations';
import { UiMenu, UiMenuItem, UiMenuSeparator } from '../core/ui/menu';
import { Confirm, Icon, UiButton, UiDate, UiKbd, UiList, UiListItem, UiListTitle, UiOption, UiSelect, UiSheet, UiTime } from '../core/ui';
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
 * goes with (a field finds them — the list right under it, no popover); a repeat: which of them a
 * change / deletion is for. Desktops: a panel at the right, the page's color, a line at its left (the
 * schedule in sight) — Enter saves, Esc closes, Delete in its head; phones: a sheet (iOS's lists),
 * Save, Delete. `closed` as it goes.
 */
@Component({
  selector: 'app-event-editor',
  imports: [Icon, NgTemplateOutlet, TranslatePipe, UiButton, UiDate, UiKbd, UiList, UiListItem, UiListTitle, UiMenu, UiMenuItem, UiMenuSeparator, UiSelect, UiSheet, UiTime],
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
  protected readonly scope = signal<Scope>('this');
  protected readonly saving = signal(false);
  // The pages' field: what's typed (the library's pages with it listed under it)
  protected readonly find = signal('');
  protected readonly finding = signal(false);
  // (desktops: the pages' dropdown open — at its row)
  protected readonly picking = signal<HTMLElement | null>(null);
  // (a rule none of the presets is: Custom, its Every shown)
  private readonly custom = signal(false);

  protected readonly repeating = computed(() => !!this.event() && this.event()!.repeat !== 'Never');
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
  protected readonly scopes = computed<UiOption[]>(() => [
    { value: 'this', label: this.i18n.t('schedule.scopeThis') },
    { value: 'following', label: this.i18n.t('schedule.scopeFollowing') },
    { value: 'all', label: this.i18n.t('schedule.scopeAll') },
  ]);

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
    this.opened = this.state();
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

  // Esc: the dropdown's own (it closes), else the panel closes — anything changed: asked first (by its head)
  private asking = false;
  protected async escape(head: HTMLElement): Promise<void> {
    if (this.picking() || this.asking) return;
    if (this.state() !== this.opened) {
      this.asking = true;
      const yes = await this.confirm.ask(head, { text: this.i18n.t('schedule.discardAsk'), yes: this.i18n.t('schedule.discard'), danger: true });
      this.asking = false;
      if (!yes) return;
    }
    this.closed.emit();
  }

  // (what's set, as one string — as it opened: `opened`; another now: changed)
  private opened = '';
  private readonly state = computed(() =>
    JSON.stringify([this.title().trim(), this.date(), this.start(), this.end(), this.repeat(), this.every(), this.until(), this.pageIds()]),
  );

  protected removePage(id: string): void {
    this.pageIds.update((ids) => ids.filter((x) => x !== id));
  }

  // Enter in the pages' field: the first found added (nothing typed: saved, as anywhere else)
  protected findEnter(e: Event, menu?: UiMenu): void {
    e.preventDefault();
    const first = this.found()[0];
    if (this.find().trim() && first) this.addPage(first, menu);
    else if (!menu) this.save();
  }

  protected closePicker(): void {
    this.picking.set(null);
    this.find.set('');
  }

  // Desktops: Enter saves — anywhere but in a field or on a button (they do their own)
  protected enter(e: Event): void {
    const at = e.target as HTMLElement;
    if (at.closest('input, textarea, button, select, [role=menu], [role=listbox]')) return;
    e.preventDefault();
    this.save();
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

  // (done: the phones' sheet slides down, the desktop's panel just goes)
  private done(sheet?: UiSheet): void {
    if (sheet) sheet.close();
    else this.closed.emit();
  }

  protected save(sheet?: UiSheet): void {
    if (!this.canSave()) return;
    this.saving.set(true);
    this.store.save(this.input(), this.event(), this.scope()).subscribe({
      next: () => this.done(sheet),
      error: () => this.saving.set(false),
    });
  }

  protected async remove(e: Event, sheet?: UiSheet): Promise<void> {
    const event = this.event();
    if (!event) return;
    const yes = await this.confirm.ask(e.currentTarget as HTMLElement, {
      text: this.i18n.t(this.repeating() ? 'schedule.deleteAskScope' : 'schedule.deleteAsk'),
      yes: this.i18n.t('schedule.delete'),
      danger: true,
    });
    if (yes) this.store.remove(event, this.scope()).subscribe(() => this.done(sheet));
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
