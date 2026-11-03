import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, input, OnInit, output, signal } from '@angular/core';
import { AuthStore } from '../auth/auth.store';
import { desktop } from '../core/device';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { TranslationKey } from '../core/i18n/translations';
import { Confirm, Icon, UiButton, UiDate, UiKbd, UiList, UiListItem, UiListTitle, UiOption, UiSelect, UiSheet, UiTime } from '../core/ui';
import { LibraryStore, PageItem } from '../library/library.store';
import { dayKey, EventInput, EventsStore, Occurrence, Repeat, Scope } from './events.store';

const REPEATS: { value: Repeat; label: TranslationKey }[] = [
  { value: 'Never', label: 'schedule.never' },
  { value: 'Daily', label: 'schedule.daily' },
  { value: 'Weekly', label: 'schedule.weekly' },
  { value: 'Monthly', label: 'schedule.monthly' },
];
// (Every: 1 to 12 of the repeat's days / weeks / months)
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
  imports: [Icon, NgTemplateOutlet, TranslatePipe, UiButton, UiDate, UiKbd, UiList, UiListItem, UiListTitle, UiSelect, UiSheet, UiTime],
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

  protected readonly repeating = computed(() => !!this.event() && this.event()!.repeat !== 'Never');
  protected readonly repeats = computed<UiOption[]>(() => REPEATS.map((r) => ({ value: r.value, label: this.i18n.t(r.label) })));
  protected readonly intervals = computed<UiOption[]>(() => {
    const unit = this.i18n.t(this.repeat() === 'Daily' ? 'schedule.days' : this.repeat() === 'Weekly' ? 'schedule.weeks' : 'schedule.months');
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
    }
  }

  // A new start: the end keeps the length it had
  protected setStart(value: string | null): void {
    const length = this.minutes() ?? 60;
    this.start.set(value);
    const s = toMinutes(value);
    if (s !== null) this.end.set(fromMinutes(Math.min(s + length, 23 * 60 + 55)));
  }

  protected setEndRepeat(value: string | null): void {
    this.until.set(value === 'date' ? (this.until() ?? this.date()) : null);
  }

  protected addPage(page: PageItem): void {
    if (!this.pageIds().includes(page.id)) this.pageIds.update((ids) => [...ids, page.id]);
    this.find.set('');
  }

  protected removePage(id: string): void {
    this.pageIds.update((ids) => ids.filter((x) => x !== id));
  }

  // Enter in the pages' field: the first found added (nothing typed: saved, as anywhere else)
  protected findEnter(e: Event): void {
    e.preventDefault();
    const first = this.found()[0];
    if (this.find().trim() && first) this.addPage(first);
    else this.save();
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
