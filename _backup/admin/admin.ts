import { DatePipe } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Toggle } from '../core/ui/toggle/toggle';
import { DateField } from '../core/ui/date/date';
import { TimeField } from '../core/ui/time/time';
import { AdminStore, AdminUser } from './admin.store';

@Component({
  selector: 'app-admin',
  imports: [Toggle, DateField, TimeField, FormsModule, DatePipe],
  templateUrl: './admin.html',
})
export class Admin implements OnInit {
  protected readonly store = inject(AdminStore);
  protected testDate: Date | null = null;
  protected testTime: string | null = null;

  ngOnInit(): void {
    this.store.loadUsers();
  }

  setCalendar(user: AdminUser, enabled: boolean): void {
    this.store.setIntegrations(user, enabled, user.telegramEnabled);
  }

  setTelegram(user: AdminUser, enabled: boolean): void {
    this.store.setIntegrations(user, user.calendarEnabled, enabled);
  }
}
