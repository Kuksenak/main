import { Component, computed, inject, OnInit, signal, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import { AuthStore, CalendarEvent } from 'app/_todo-core/auth/auth-store';

interface DayGroup {
  date: Date;
  dateStr: string;
  events: CalendarEvent[];
}

/** @deprecated Не отрефакторено (legacy). Мигрировать на Tailwind + signals. */
@Component({
  selector: 'app-events-calendar',
  standalone: true,
  imports: [DatePipe, CdkMenu, CdkMenuItem, CdkMenuTrigger],
  templateUrl: './events-calendar.html',
})
export class EventsCalendar implements OnInit, AfterViewInit {
  private readonly store = inject(AuthStore);
  private readonly router = inject(Router);
  protected readonly selectedCalendar = signal('all');
  @ViewChild('todayCard') todayCard?: ElementRef<HTMLElement>;
  protected readonly loading = this.store.eventsLoading;

  protected readonly calendars = computed(() => {
    const uniqueNames = Array.from(new Set(this.store.events().map((event) => event.calendarName)));
    return uniqueNames.sort((a, b) => a.localeCompare(b));
  });

  protected readonly dayGroups = computed(() => {
    const selected = this.selectedCalendar();
    const source = selected === 'all'
      ? this.store.events()
      : this.store.events().filter((event) => event.calendarName === selected);

    const grouped = new Map<string, CalendarEvent[]>();

    source.forEach((event) => {
      const date = new Date(event.startDate);
      const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD

      if (!grouped.has(dateStr)) {
        grouped.set(dateStr, []);
      }
      grouped.get(dateStr)!.push(event);
    });

    // Сортируем по датам и возвращаем массив
    return Array.from(grouped.entries())
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .map(([dateStr, events]) => ({
        date: new Date(dateStr),
        dateStr,
        events: events.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()),
      }));
  });

  protected readonly todayIndex = computed(() => {
    const today = this.dayGroups().findIndex((day) => this.isToday(day.date));
    return today;
  });

  ngOnInit(): void {
    if (this.store.events().length === 0) {
      this.refresh();
    }
  }

  refresh(): void {
    this.store.loadEvents().subscribe();
  }

  onCalendarChange(value: string): void {
    this.selectedCalendar.set(value);
  }

  goToListView(): void {
    this.router.navigate(['/events']);
  }

  ngAfterViewInit(): void {
    this.scrollToToday();
  }

  private scrollToToday(): void {
    if (this.todayCard?.nativeElement) {
      setTimeout(() => {
        this.todayCard?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }

  isToday(date: Date): boolean {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  isThisWeek(date: Date): boolean {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    return date >= startOfWeek && date <= endOfWeek;
  }
}
