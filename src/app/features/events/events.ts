import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import { AuthStore } from 'app/_todo-core/auth/auth-store';

@Component({
  selector: 'app-events',
  standalone: true,
  imports: [DatePipe, CdkMenu, CdkMenuItem, CdkMenuTrigger],
  templateUrl: './events.html',
})
export class Events implements OnInit {
  private readonly store = inject(AuthStore);
  private readonly router = inject(Router);
  protected readonly selectedCalendar = signal('all');

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

  goToCalendarView(): void {
    this.router.navigate(['/events-calendar']);
  }
}
