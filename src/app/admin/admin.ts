import { Component, inject, OnInit } from '@angular/core';
import { AdminStore, AdminUser } from './admin.store';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.html',
})
export class Admin implements OnInit {
  protected readonly store = inject(AdminStore);

  ngOnInit(): void {
    this.store.loadUsers();
  }

  toggleCalendar(user: AdminUser): void {
    this.store.setIntegrations(user, !user.calendarEnabled, user.telegramEnabled);
  }

  toggleTelegram(user: AdminUser): void {
    this.store.setIntegrations(user, user.calendarEnabled, !user.telegramEnabled);
  }
}
