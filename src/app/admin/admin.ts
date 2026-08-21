import { Component, inject, OnInit } from '@angular/core';
import { Toggle } from '../core/ui/toggle/toggle';
import { AdminStore, AdminUser } from './admin.store';

@Component({
  selector: 'app-admin',
  imports: [Toggle],
  templateUrl: './admin.html',
})
export class Admin implements OnInit {
  protected readonly store = inject(AdminStore);

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
