import { DatePipe } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { AuthStore } from '../auth/auth.store';

@Component({
  selector: 'app-calendar',
  imports: [DatePipe],
  templateUrl: './calendar.html',
})
export class Calendar implements OnInit {
  protected readonly auth = inject(AuthStore);

  ngOnInit(): void {
    if (this.auth.calendarConnected()) {
      this.auth.loadEvents();
    }
  }

  connect(): void {
    this.auth.connectCalendar();
  }

  disconnect(): void {
    this.auth.disconnectCalendar();
  }
}
