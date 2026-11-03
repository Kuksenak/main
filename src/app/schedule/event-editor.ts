import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, input, OnInit, output, signal } from '@angular/core';
import { AuthStore } from '../auth/auth.store';
import { desktop } from '../core/device';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/t.pipe';
import { TranslationKey } from '../core/i18n/translations';
import { Confirm, Icon, UiButton, UiDate, UiList, UiListItem, UiListTitle, UiOption, UiSelect, UiSheet, UiTime } from '../core/ui';
import { LibraryStore } from '../library/library.store';
import { dayKey, EventInput, EventsStore, Occurrence, Repeat, Scope } from './events.store';

const DURATIONS = [15, 30, 45, 60, 75, 90, 120, 180];
const REPEATS: { value: Repeat; label: TranslationKey }[] = [
  { value: 'Never', label: 'schedule.never' },
  { value: 'Daily', label: 'schedule.daily' },
  { value: 'Weekly', label: 'schedule.weekly' },
  { value: 'Monthly', label: 'schedule.monthly' },
];

/**
 * An event, new (`event` none: on `day`, at the next hour) or as it is — its title, its day and time,
 * how long, how it repeats (until a day), the library's pages it goes with; Save, Delete (asked
 * first). A repeat changed or deleted: for this one, it and the later ones, or all of them (a choice
 * of its own). Desktops: a panel at the right (the schedule in sight — the title in its head); phones: a
 * sheet (as iOS's lists). `closed` as it goes.
 */
@Component({
  selector: 'app-event-editor',
  imports: [Icon, NgTemplateOutlet, TranslatePipe, UiButton, UiDate, UiList, UiListItem, UiListTitle, UiSelect, UiSheet, UiTime],
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
  protected readonly time = signal<string | null>(null);
  protected readonly duration = signal('60');
  protected readonly repeat = signal<Repeat>('Never');
  protected readonly until = signal<string | null>(null);
  protected readonly pageIds = signal<string[]>([]);
  protected readonly scope = signal<Scope>('this');
  protected readonly saving = signal(false);

  protected readonly repeating = computed(() => this.event()?.repeat !== undefined && this.event()!.repeat !== 'Never');
  protected readonly durations = computed<UiOption[]>(() => DURATIONS.map((m) => ({ value: String(m), label: this.minutes(m) })));
  protected readonly repeats = computed<UiOption[]>(() => REPEATS.map((r) => ({ value: r.value, label: this.i18n.t(r.label) })));
  protected readonly scopes = computed<UiOption[]>(() => [
    { value: 'this', label: this.i18n.t('schedule.scopeThis') },
    { value: 'following', label: this.i18n.t('schedule.scopeFollowing') },
    { value: 'all', label: this.i18n.t('schedule.scopeAll') },
  ]);
  // The pages it goes with (gone ones left out), and the ones to add (the rest of the library)
  protected readonly pages = computed(() => {
    const byId = new Map((this.library.items() ?? []).map((p) => [p.id, p]));
    return this.pageIds().flatMap((id) => (byId.get(id) ? [byId.get(id)!] : []));
  });
  protected readonly addable = computed<UiOption[]>(() =>
    (this.library.items() ?? [])
      .filter((p) => !this.pageIds().includes(p.id))
      .map((p) => ({ value: p.id, label: p.title.trim() || this.i18n.t('library.untitled') })),
  );
  protected readonly canSave = computed(() => !!this.title().trim() && !!this.date() && !!this.time() && !this.saving());

  // (its pages: only for those who can read the library)
  protected readonly hasLibrary = inject(AuthStore).can('library');

  constructor() {
    if (this.hasLibrary) this.library.load();
  }

  // (as it opens — its inputs in: the event's, else a new one on the day picked, at the next hour)
  ngOnInit(): void {
    const e = this.event();
    const at = e ? new Date(e.startsAt) : nextHour(this.day());
    this.title.set(e?.title ?? '');
    this.date.set(dayKey(at));
    this.time.set(`${pad(at.getHours())}:${pad(at.getMinutes())}`);
    if (e) {
      this.duration.set(String(e.durationMinutes));
      this.repeat.set(e.repeat);
      this.until.set(e.repeatUntil ? dayKey(new Date(e.repeatUntil)) : null);
      this.pageIds.set(e.pageIds);
    }
  }

  // "45 min", "1 h 30 min", "2 h"
  private minutes(m: number): string {
    const h = Math.floor(m / 60);
    const rest = m % 60;
    const min = this.i18n.t('schedule.min');
    const hrs = this.i18n.t('schedule.h');
    return h ? (rest ? `${h} ${hrs} ${rest} ${min}` : `${h} ${hrs}`) : `${rest} ${min}`;
  }

  protected addPage(id: string | null): void {
    if (id && !this.pageIds().includes(id)) this.pageIds.update((ids) => [...ids, id]);
  }

  protected removePage(id: string): void {
    this.pageIds.update((ids) => ids.filter((x) => x !== id));
  }

  private input(): EventInput {
    const [y, mo, d] = this.date()!.split('-').map(Number);
    const [h, mi] = this.time()!.split(':').map(Number);
    const until = this.repeat() !== 'Never' && this.until() ? this.until()!.split('-').map(Number) : null;
    return {
      title: this.title().trim(),
      startsAt: new Date(y, mo - 1, d, h, mi).toISOString(),
      durationMinutes: Number(this.duration()),
      repeat: this.repeat(),
      repeatInterval: 1,
      repeatUntil: until ? new Date(until[0], until[1] - 1, until[2], 23, 59, 59).toISOString() : null,
      pageIds: this.pageIds(),
    };
  }

  // (done: the phones' sheet slides down, the desktop's window just goes)
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

// (a new one: the day picked, at the hour after now — another day: at 9)
function nextHour(day: Date): Date {
  const now = new Date();
  const at = new Date(day);
  if (dayKey(day) === dayKey(now)) at.setHours(Math.min(23, now.getHours() + 1), 0, 0, 0);
  else at.setHours(9, 0, 0, 0);
  return at;
}
