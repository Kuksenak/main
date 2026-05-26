import { DatePipe } from '@angular/common';
import { Component, TemplateRef, ViewChild, computed, inject, signal } from '@angular/core';
import { AuthStore } from 'app/_todo-core/auth/auth-store';
import { Theme } from 'app/_todo-core/theme/theme';
import { EventsConfig } from './events-config';
import { Sheet } from 'app/core/ui/sheet/sheet';
import { EventsNew } from './events-new';
import { createSheetHeaderRegistrar, createSheetTitleRegistrar } from 'app/core/ui/sheet/sheet-buttons.helper';

@Component({
  selector: 'app-events',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './events.html',
})
export class Events {
  private readonly store = inject(AuthStore);
  private readonly theme = inject(Theme);
  private readonly config = inject(EventsConfig);
  private readonly sheet = inject(Sheet);
  private readonly header = createSheetHeaderRegistrar();
  private readonly title = createSheetTitleRegistrar();

  protected readonly accentColor = this.theme.accentColor;

  @ViewChild('sheetHeaderActions', { static: true })
  private sheetHeaderActionsTpl?: TemplateRef<unknown>;

  protected readonly selectedCalendar = this.config.selectedCalendar;

  protected readonly calendars = computed(() => {
    const uniqueNames = Array.from(new Set(this.store.events().map((event) => event.calendarName)));
    return uniqueNames.sort((a, b) => a.localeCompare(b));
  });

  protected readonly events = computed(() => {
    const selected = this.selectedCalendar();
    const source = selected === 'all'
      ? this.store.events()
      : this.store.events().filter((event) => event.calendarName === selected);

    return [...source].sort((a, b) => {
      return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
    });
  });

  protected readonly loading = this.store.eventsLoading;
  protected isCalendarMenuOpen = signal(false);
  protected isHeaderCapsulePressed = signal(false);

  ngOnInit(): void {
    this.title.set('Events');

    // Load events if not already loaded
    if (this.store.events().length === 0) {
      this.refresh();
    }
  }

  ngAfterViewInit(): void {
    if (this.sheetHeaderActionsTpl) {
      this.header.register(this.sheetHeaderActionsTpl);
    }
  }

  refresh(): void {
    this.store.loadEvents().subscribe();
  }

  protected openNewEvent(): void {
    this.sheet.open(EventsNew);
  }

  protected toggleCalendarMenu(): void {
    this.isCalendarMenuOpen.update((value) => !value);
  }

  protected selectCalendar(calendar: string): void {
    this.config.setSelectedCalendar(calendar);
    this.isCalendarMenuOpen.set(false);
  }

  protected onHeaderPressStart(): void {
    this.isHeaderCapsulePressed.set(true);
  }

  protected onHeaderPressEnd(): void {
    this.isHeaderCapsulePressed.set(false);
  }
}
